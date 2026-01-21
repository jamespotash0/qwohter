-- Migration: Fix notification cron to call Edge Function for emails
-- Description:
--   The current cron only calls process_due_notifications_internal() which
--   creates in-app notifications. We need to also call the Edge Function
--   for sending emails via pg_net.
--
--   This migration:
--   1. Enables pg_net extension for HTTP calls
--   2. Creates a function to invoke the Edge Function
--   3. Updates the cron job to call both in-app AND email processing

-- =============================================================================
-- STEP 1: Enable pg_net extension if not already enabled
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================================================
-- STEP 2: Create a function to invoke the Edge Function for emails
-- Uses vault secrets for the service role key
-- =============================================================================

CREATE OR REPLACE FUNCTION invoke_notification_email_edge_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
  request_id BIGINT;
BEGIN
  -- Construct the Edge Function URL using the project reference
  -- This is the hosted Supabase URL
  edge_function_url := 'https://piuwrlaoxuefmiisuamc.supabase.co/functions/v1/check-due-notifications';

  -- Get the anon key from vault (or use service_role for internal calls)
  -- Note: For internal cron calls, we can use the service_role key stored in vault
  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- If no vault secret, try using a hardcoded approach (less secure but works)
  IF anon_key IS NULL THEN
    -- Fall back to just calling without auth (Edge Function should handle this)
    -- The Edge Function can verify the request is from cron via other means
    RAISE NOTICE 'No service_role_key in vault, calling Edge Function without auth header';

    SELECT net.http_post(
      url := edge_function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  ELSE
    -- Call with proper authorization
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := '{"source": "pg_cron"}'::jsonb
    ) INTO request_id;
  END IF;

  RAISE NOTICE 'Invoked check-due-notifications Edge Function, request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail - in-app notifications should still work
    RAISE WARNING 'Failed to invoke Edge Function: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION invoke_notification_email_edge_function() TO service_role;

-- =============================================================================
-- STEP 3: Create combined processing function
-- Handles both in-app notifications AND triggers email sending
-- =============================================================================

CREATE OR REPLACE FUNCTION process_all_due_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  in_app_count INTEGER;
BEGIN
  -- First, process in-app notifications
  SELECT process_due_notifications_internal() INTO in_app_count;

  -- Log the result
  IF in_app_count > 0 THEN
    RAISE NOTICE 'Created % in-app notification(s)', in_app_count;
  END IF;

  -- Then trigger email sending via Edge Function
  -- This is async (fire and forget)
  PERFORM invoke_notification_email_edge_function();

  RETURN in_app_count;
END;
$$;

GRANT EXECUTE ON FUNCTION process_all_due_notifications() TO service_role;

-- =============================================================================
-- STEP 4: Update the cron job to use the combined function
-- =============================================================================

-- Remove old cron job
SELECT cron.unschedule('process-due-notifications');

-- Create new cron job that handles both in-app AND emails
SELECT cron.schedule(
  'process-due-notifications',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT process_all_due_notifications()$$
);

-- =============================================================================
-- STEP 5: Add comments
-- =============================================================================

COMMENT ON FUNCTION process_due_notifications_internal() IS
  'Processes scheduled notifications from scheduled_notifications table. Creates in-app notifications only.';

COMMENT ON FUNCTION invoke_notification_email_edge_function() IS
  'Invokes the check-due-notifications Edge Function via HTTP to send emails. Called by process_all_due_notifications.';

COMMENT ON FUNCTION process_all_due_notifications() IS
  'Main entry point for notification cron. Creates in-app notifications via DB function, then triggers email sending via Edge Function.';
