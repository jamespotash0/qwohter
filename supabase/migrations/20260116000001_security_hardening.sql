-- =====================================================
-- SECURITY HARDENING MIGRATION
-- Addresses penetration testing findings
-- =====================================================

-- =====================================================
-- 1. LOGIN RATE LIMITING (HIGH)
-- Track failed login attempts and block after threshold
-- =====================================================

-- Create table for tracking auth attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL, -- email or IP address
    identifier_type text NOT NULL CHECK (identifier_type IN ('email', 'ip')),
    attempt_type text NOT NULL CHECK (attempt_type IN ('login', 'otp', 'password_reset', 'signup')),
    attempt_count integer DEFAULT 1,
    first_attempt_at timestamptz DEFAULT now(),
    last_attempt_at timestamptz DEFAULT now(),
    blocked_until timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_lookup
ON public.auth_rate_limits (identifier, identifier_type, attempt_type);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked
ON public.auth_rate_limits (blocked_until)
WHERE blocked_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (no public access)
-- RLS blocks all access by default when no policies exist

-- Function to check if an identifier is rate limited
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
    p_identifier text,
    p_identifier_type text,
    p_attempt_type text,
    p_max_attempts integer DEFAULT 5,
    p_window_minutes integer DEFAULT 15,
    p_block_duration_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record auth_rate_limits%ROWTYPE;
    v_window_start timestamptz;
    v_is_blocked boolean := false;
    v_remaining_attempts integer;
    v_blocked_until timestamptz;
BEGIN
    v_window_start := now() - (p_window_minutes || ' minutes')::interval;

    -- Get existing rate limit record
    SELECT * INTO v_record
    FROM auth_rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND attempt_type = p_attempt_type
      AND first_attempt_at > v_window_start
    ORDER BY first_attempt_at DESC
    LIMIT 1;

    -- Check if currently blocked
    IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > now() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_record.blocked_until,
            'message', 'Too many attempts. Please try again later.'
        );
    END IF;

    -- Calculate remaining attempts
    IF v_record.id IS NOT NULL THEN
        v_remaining_attempts := p_max_attempts - v_record.attempt_count;
    ELSE
        v_remaining_attempts := p_max_attempts;
    END IF;

    RETURN jsonb_build_object(
        'allowed', v_remaining_attempts > 0,
        'blocked', false,
        'remaining_attempts', GREATEST(v_remaining_attempts, 0),
        'message', CASE
            WHEN v_remaining_attempts <= 0 THEN 'Too many attempts. Please try again later.'
            WHEN v_remaining_attempts <= 2 THEN format('%s attempts remaining', v_remaining_attempts)
            ELSE NULL
        END
    );
END;
$$;

-- Function to record an auth attempt
CREATE OR REPLACE FUNCTION public.record_auth_attempt(
    p_identifier text,
    p_identifier_type text,
    p_attempt_type text,
    p_success boolean DEFAULT false,
    p_max_attempts integer DEFAULT 5,
    p_window_minutes integer DEFAULT 15,
    p_block_duration_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record auth_rate_limits%ROWTYPE;
    v_window_start timestamptz;
    v_new_count integer;
    v_blocked_until timestamptz;
BEGIN
    -- If successful, clear the rate limit record
    IF p_success THEN
        DELETE FROM auth_rate_limits
        WHERE identifier = p_identifier
          AND identifier_type = p_identifier_type
          AND attempt_type = p_attempt_type;

        RETURN jsonb_build_object('success', true, 'cleared', true);
    END IF;

    v_window_start := now() - (p_window_minutes || ' minutes')::interval;

    -- Get or create rate limit record
    SELECT * INTO v_record
    FROM auth_rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND attempt_type = p_attempt_type
      AND first_attempt_at > v_window_start
    ORDER BY first_attempt_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_record.id IS NOT NULL THEN
        -- Update existing record
        v_new_count := v_record.attempt_count + 1;

        -- Check if should block
        IF v_new_count >= p_max_attempts THEN
            v_blocked_until := now() + (p_block_duration_minutes || ' minutes')::interval;
        END IF;

        UPDATE auth_rate_limits
        SET attempt_count = v_new_count,
            last_attempt_at = now(),
            blocked_until = v_blocked_until
        WHERE id = v_record.id;
    ELSE
        -- Create new record
        v_new_count := 1;

        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type)
        VALUES (p_identifier, p_identifier_type, p_attempt_type);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'attempt_count', v_new_count,
        'blocked', v_blocked_until IS NOT NULL,
        'blocked_until', v_blocked_until
    );
END;
$$;

-- Cleanup function to remove old records (run via cron)
CREATE OR REPLACE FUNCTION public.cleanup_auth_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM auth_rate_limits
    WHERE first_attempt_at < now() - interval '24 hours'
       OR (blocked_until IS NOT NULL AND blocked_until < now() - interval '1 hour');
END;
$$;


-- =====================================================
-- 2. OTP BRUTE FORCE PROTECTION (HIGH)
-- Stricter limits for OTP verification attempts
-- =====================================================

-- The functions above support OTP with stricter limits
-- Call with: check_auth_rate_limit(email, 'email', 'otp', 3, 10, 60)
-- 3 attempts per 10 minutes, 60 minute block


-- =====================================================
-- 5. ERROR MESSAGE SANITIZATION (MEDIUM)
-- Function to sanitize error messages before returning to client
-- =====================================================

CREATE OR REPLACE FUNCTION public.sanitize_error_message(
    p_error_message text,
    p_error_code text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_sanitized text;
BEGIN
    -- Map known error patterns to safe messages
    CASE
        -- Auth errors
        WHEN p_error_message ILIKE '%invalid login credentials%' THEN
            v_sanitized := 'Invalid email or password';
        WHEN p_error_message ILIKE '%email not confirmed%' THEN
            v_sanitized := 'Please verify your email before signing in';
        WHEN p_error_message ILIKE '%user already registered%' THEN
            v_sanitized := 'An account with this email already exists';
        WHEN p_error_message ILIKE '%password%too short%' OR p_error_message ILIKE '%password%weak%' THEN
            v_sanitized := 'Password does not meet security requirements';

        -- Database constraint errors
        WHEN p_error_message ILIKE '%duplicate key%' OR p_error_message ILIKE '%unique constraint%' THEN
            v_sanitized := 'This record already exists';
        WHEN p_error_message ILIKE '%foreign key%' THEN
            v_sanitized := 'Related record not found';
        WHEN p_error_message ILIKE '%check constraint%' THEN
            v_sanitized := 'Invalid data provided';
        WHEN p_error_message ILIKE '%not null%' THEN
            v_sanitized := 'Required field is missing';

        -- RLS errors
        WHEN p_error_message ILIKE '%row-level security%' OR p_error_message ILIKE '%policy%' THEN
            v_sanitized := 'You do not have permission to perform this action';

        -- Connection/timeout errors
        WHEN p_error_message ILIKE '%connection%' OR p_error_message ILIKE '%timeout%' THEN
            v_sanitized := 'Service temporarily unavailable. Please try again.';

        -- Rate limiting
        WHEN p_error_message ILIKE '%rate limit%' OR p_error_message ILIKE '%too many%' THEN
            v_sanitized := 'Too many requests. Please wait before trying again.';

        -- Default: generic message that doesn't leak internals
        ELSE
            v_sanitized := 'An error occurred. Please try again or contact support.';
    END CASE;

    RETURN v_sanitized;
END;
$$;


-- =====================================================
-- 6. RPC FUNCTION ENUMERATION PROTECTION (HIGH)
-- Revoke public execute on sensitive functions
-- =====================================================

-- Revoke execute from public on all custom functions by default
-- Then grant back only to authenticated users where needed

DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Revoke execute from public/anon on all functions in public schema
    FOR func_record IN
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
        AND proname NOT LIKE 'pg_%'
        AND proname NOT LIKE 'f_%'
    LOOP
        BEGIN
            EXECUTE format(
                'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, public',
                func_record.proname,
                func_record.args
            );
        EXCEPTION WHEN OTHERS THEN
            -- Some functions may not have these grants, ignore errors
            NULL;
        END;
    END LOOP;
END;
$$;

-- Grant execute to authenticated users on approved functions only
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_auth_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_error_message TO authenticated;

-- For invite token validation (needs anon access)
-- Ensure validate_invite_token exists and grant to anon
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_invite_token' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.validate_invite_token TO anon';
    END IF;
END;
$$;


-- =====================================================
-- 9. MEMORY EXHAUSTION PROTECTION (HIGH)
-- Add query limits and safeguards
-- =====================================================

-- Create a function to enforce pagination on large queries
CREATE OR REPLACE FUNCTION public.enforce_query_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- This is a placeholder - actual enforcement happens at application level
    -- and via Supabase settings
    RETURN NEW;
END;
$$;

-- Create view to check for potentially dangerous queries
CREATE OR REPLACE VIEW public.security_query_stats AS
SELECT
    query,
    calls,
    total_exec_time,
    rows,
    CASE
        WHEN rows > 10000 THEN 'HIGH'
        WHEN rows > 1000 THEN 'MEDIUM'
        ELSE 'LOW'
    END as risk_level
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
ORDER BY rows DESC
LIMIT 100;

-- Grant access only to service role
REVOKE ALL ON public.security_query_stats FROM anon, authenticated;


-- =====================================================
-- 12. PASSWORD RESET FLOW ABUSE PREVENTION (HIGH)
-- Strict rate limiting for password reset requests
-- =====================================================

-- Use the auth_rate_limits table with stricter limits
-- Application should call: check_auth_rate_limit(email, 'email', 'password_reset', 3, 60, 120)
-- 3 requests per 60 minutes, 120 minute block if exceeded

-- Create audit log for password reset attempts
CREATE TABLE IF NOT EXISTS public.password_reset_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    ip_address text,
    user_agent text,
    requested_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    success boolean
);

-- Index for querying by email
CREATE INDEX IF NOT EXISTS idx_password_reset_audit_email
ON public.password_reset_audit (email, requested_at DESC);

-- Enable RLS (service role only)
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- ADDITIONAL SECURITY: Audit logging for sensitive ops
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    user_id uuid,
    organization_id uuid,
    ip_address text,
    user_agent text,
    details jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_event_type
ON public.security_audit_log (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_user
ON public.security_audit_log (user_id, created_at DESC);

-- Enable RLS (service role only)
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type text,
    p_user_id uuid DEFAULT NULL,
    p_organization_id uuid DEFAULT NULL,
    p_details jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO security_audit_log (event_type, user_id, organization_id, details)
    VALUES (p_event_type, COALESCE(p_user_id, auth.uid()), p_organization_id, p_details)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- Grant to authenticated for logging their own events
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;


-- =====================================================
-- STORAGE SECURITY: Content-Type headers (MEDIUM)
-- =====================================================

-- Update storage bucket policies to enforce content types
-- Note: This requires running in Supabase dashboard or via API

-- Create a function to validate file uploads
CREATE OR REPLACE FUNCTION public.validate_storage_upload(
    p_bucket_id text,
    p_file_name text,
    p_content_type text,
    p_file_size bigint
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_allowed_types text[];
    v_max_size bigint;
    v_extension text;
BEGIN
    -- Extract extension
    v_extension := lower(split_part(p_file_name, '.', -1));

    -- Define allowed types per bucket
    CASE p_bucket_id
        WHEN 'organization-logos' THEN
            v_allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
            v_max_size := 5 * 1024 * 1024; -- 5MB
        WHEN 'proposal-documents' THEN
            v_allowed_types := ARRAY[
                'application/pdf',
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv', 'text/plain'
            ];
            v_max_size := 50 * 1024 * 1024; -- 50MB
        WHEN 'project-attachments' THEN
            v_allowed_types := ARRAY[
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf',
                'video/mp4', 'video/quicktime', 'video/webm'
            ];
            v_max_size := 100 * 1024 * 1024; -- 100MB
        ELSE
            -- Default restrictive policy
            v_allowed_types := ARRAY['image/jpeg', 'image/png', 'application/pdf'];
            v_max_size := 10 * 1024 * 1024; -- 10MB
    END CASE;

    -- Validate content type
    IF NOT (p_content_type = ANY(v_allowed_types)) THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'File type not allowed for this bucket'
        );
    END IF;

    -- Validate file size
    IF p_file_size > v_max_size THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', format('File too large. Maximum size is %s MB', v_max_size / 1024 / 1024)
        );
    END IF;

    -- Validate extension matches content type (prevent spoofing)
    CASE p_content_type
        WHEN 'image/jpeg' THEN
            IF v_extension NOT IN ('jpg', 'jpeg') THEN
                RETURN jsonb_build_object('valid', false, 'error', 'File extension does not match content type');
            END IF;
        WHEN 'image/png' THEN
            IF v_extension != 'png' THEN
                RETURN jsonb_build_object('valid', false, 'error', 'File extension does not match content type');
            END IF;
        WHEN 'application/pdf' THEN
            IF v_extension != 'pdf' THEN
                RETURN jsonb_build_object('valid', false, 'error', 'File extension does not match content type');
            END IF;
        ELSE
            NULL; -- Allow other types without strict extension check
    END CASE;

    RETURN jsonb_build_object('valid', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_storage_upload TO authenticated;


-- =====================================================
-- Grant necessary permissions
-- =====================================================

-- Ensure anon can access rate limit check for pre-auth flows
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION public.record_auth_attempt TO anon;


-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE public.auth_rate_limits IS 'Tracks authentication attempts for rate limiting';
COMMENT ON TABLE public.password_reset_audit IS 'Audit trail for password reset requests';
COMMENT ON TABLE public.security_audit_log IS 'General security event audit log';
COMMENT ON FUNCTION public.check_auth_rate_limit IS 'Check if an identifier is rate limited before allowing auth attempt';
COMMENT ON FUNCTION public.record_auth_attempt IS 'Record an auth attempt and update rate limit counters';
COMMENT ON FUNCTION public.sanitize_error_message IS 'Sanitize error messages to prevent information leakage';
COMMENT ON FUNCTION public.log_security_event IS 'Log security-relevant events for auditing';
COMMENT ON FUNCTION public.validate_storage_upload IS 'Validate file uploads before storing';
