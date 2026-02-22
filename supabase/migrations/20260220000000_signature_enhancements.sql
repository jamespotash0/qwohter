-- Migration: Signature Enhancements
-- Adds: signature position detection, tamper detection, reminders, rate limiting for signing endpoints

-- ============================================================
-- 1. Add columns to proposal_signing_tokens
-- ============================================================

-- Detected signature/date positions from PDF scanning
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS signature_positions JSONB;

COMMENT ON COLUMN public.proposal_signing_tokens.signature_positions
  IS 'Auto-detected signature/date block positions from PDF text scanning. Format: { signature: { pageIndex, x, y, width, height }, date: { pageIndex, x, y, width, height } }';

-- SHA-256 hash for tamper detection
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS unsigned_pdf_hash TEXT;

COMMENT ON COLUMN public.proposal_signing_tokens.unsigned_pdf_hash
  IS 'SHA-256 hash of the unsigned PDF at creation time. Verified before signing to detect tampering.';

-- Reminder configuration and tracking
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS reminder_config JSONB;

ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.proposal_signing_tokens.reminder_config
  IS 'Reminder settings. Format: { enabled: boolean, intervalDays: number, maxReminders: number }';

ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS signature_fallback_mode TEXT;

COMMENT ON COLUMN public.proposal_signing_tokens.signature_fallback_mode
  IS 'User-selected fallback placement when auto-detection fails. Values: overlay (bottom of last page), page (separate page), or NULL (use proposal config)';

-- ============================================================
-- 1b. Add org-level signing reminder defaults
-- ============================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS signing_reminder_defaults JSONB
  DEFAULT '{"enabled": true, "intervalDays": 3, "maxReminders": 3}'::jsonb;

COMMENT ON COLUMN public.organizations.signing_reminder_defaults
  IS 'Org-level default reminder config for signing requests. Format: { enabled: boolean, intervalDays: number, maxReminders: number }';

-- ============================================================
-- 2. Extend auth_rate_limits for signing endpoints
-- ============================================================

-- Drop and recreate the attempt_type CHECK constraint to include signing types
ALTER TABLE public.auth_rate_limits
  DROP CONSTRAINT IF EXISTS auth_rate_limits_attempt_type_check;

ALTER TABLE public.auth_rate_limits
  ADD CONSTRAINT auth_rate_limits_attempt_type_check
  CHECK (attempt_type = ANY (ARRAY[
    'login'::text,
    'otp'::text,
    'password_reset'::text,
    'signup'::text,
    'signing-get'::text,
    'signing-submit'::text,
    'signing-view'::text
  ]));

-- ============================================================
-- 3. Cron: Signature reminders edge function (hourly)
-- ============================================================

-- Function to invoke signature-reminders edge function
CREATE OR REPLACE FUNCTION public.invoke_signature_reminders_edge_function() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  edge_function_url TEXT;
  service_key TEXT;
  request_id BIGINT;
BEGIN
  edge_function_url := 'https://piuwrlaoxuefmiisuamc.supabase.co/functions/v1/signature-reminders';

  -- Get service_role key from vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE NOTICE 'No service_role_key in vault, calling without auth header';
    SELECT net.http_post(
      url := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  ELSE
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  END IF;

  RAISE NOTICE 'Invoked signature-reminders Edge Function, request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to invoke signature-reminders Edge Function: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.invoke_signature_reminders_edge_function()
  IS 'Invokes the signature-reminders Edge Function via HTTP to send reminder emails. Called hourly by pg_cron.';

-- Schedule: run every hour at minute 30
SELECT cron.schedule(
  'process-signature-reminders',
  '30 * * * *',
  $$SELECT public.invoke_signature_reminders_edge_function()$$
);
