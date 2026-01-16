-- =====================================================
-- FIX: OTP Brute Force & Login Rate Limiting (HIGH)
-- Stricter rate limiting with automatic blocking
-- =====================================================

-- Step 1: Add index for faster rate limit lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_active
ON public.auth_rate_limits (identifier, identifier_type, attempt_type, first_attempt_at DESC)
WHERE blocked_until IS NULL OR blocked_until > NOW();

-- Step 2: Create strict OTP rate limiting function
-- OTP gets 3 attempts per 10 minutes, then 1 hour block
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(
    p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start timestamptz;
    v_attempt_count integer;
    v_blocked_until timestamptz;
    v_max_attempts constant integer := 3;
    v_window_minutes constant integer := 10;
    v_block_minutes constant integer := 60;
BEGIN
    v_window_start := NOW() - (v_window_minutes || ' minutes')::interval;

    -- Check if currently blocked
    SELECT blocked_until INTO v_blocked_until
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'otp'
      AND blocked_until > NOW()
    LIMIT 1;

    IF v_blocked_until IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_blocked_until,
            'remaining_seconds', EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::integer,
            'message', 'Too many verification attempts. Please try again later.'
        );
    END IF;

    -- Count recent attempts
    SELECT COALESCE(SUM(attempt_count), 0) INTO v_attempt_count
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'otp'
      AND first_attempt_at > v_window_start;

    IF v_attempt_count >= v_max_attempts THEN
        -- Block the user
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type, attempt_count, blocked_until)
        VALUES (LOWER(p_email), 'email', 'otp', v_attempt_count, NOW() + (v_block_minutes || ' minutes')::interval)
        ON CONFLICT DO NOTHING;

        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval,
            'remaining_seconds', v_block_minutes * 60,
            'message', 'Too many verification attempts. Please try again in 1 hour.'
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'blocked', false,
        'remaining_attempts', v_max_attempts - v_attempt_count,
        'message', CASE
            WHEN v_max_attempts - v_attempt_count <= 1 THEN 'Last attempt before lockout'
            ELSE NULL
        END
    );
END;
$$;

-- Step 3: Create strict login rate limiting function
-- Login gets 5 attempts per 15 minutes, then 30 minute block
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
    p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start timestamptz;
    v_attempt_count integer;
    v_blocked_until timestamptz;
    v_max_attempts constant integer := 5;
    v_window_minutes constant integer := 15;
    v_block_minutes constant integer := 30;
BEGIN
    v_window_start := NOW() - (v_window_minutes || ' minutes')::interval;

    -- Check if currently blocked
    SELECT blocked_until INTO v_blocked_until
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'login'
      AND blocked_until > NOW()
    LIMIT 1;

    IF v_blocked_until IS NOT NULL THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', v_blocked_until,
            'remaining_seconds', EXTRACT(EPOCH FROM (v_blocked_until - NOW()))::integer,
            'message', 'Account temporarily locked. Please try again later.'
        );
    END IF;

    -- Count recent failed attempts
    SELECT COALESCE(SUM(attempt_count), 0) INTO v_attempt_count
    FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'login'
      AND first_attempt_at > v_window_start;

    IF v_attempt_count >= v_max_attempts THEN
        -- Block the user
        UPDATE auth_rate_limits
        SET blocked_until = NOW() + (v_block_minutes || ' minutes')::interval
        WHERE identifier = LOWER(p_email)
          AND identifier_type = 'email'
          AND attempt_type = 'login'
          AND first_attempt_at > v_window_start;

        -- Log security event
        INSERT INTO security_audit_log (event_type, details)
        VALUES ('login_blocked', jsonb_build_object(
            'email', p_email,
            'attempt_count', v_attempt_count,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval
        ));

        RETURN jsonb_build_object(
            'allowed', false,
            'blocked', true,
            'blocked_until', NOW() + (v_block_minutes || ' minutes')::interval,
            'remaining_seconds', v_block_minutes * 60,
            'message', 'Account temporarily locked due to too many failed attempts.'
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'blocked', false,
        'remaining_attempts', v_max_attempts - v_attempt_count,
        'message', CASE
            WHEN v_max_attempts - v_attempt_count <= 2 THEN
                format('%s attempts remaining', v_max_attempts - v_attempt_count)
            ELSE NULL
        END
    );
END;
$$;

-- Step 4: Create function to record failed login attempt
CREATE OR REPLACE FUNCTION public.record_failed_login(
    p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start timestamptz;
    v_existing_id uuid;
    v_new_count integer;
BEGIN
    v_window_start := NOW() - interval '15 minutes';

    -- Try to update existing record
    UPDATE auth_rate_limits
    SET attempt_count = attempt_count + 1,
        last_attempt_at = NOW()
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'login'
      AND first_attempt_at > v_window_start
      AND (blocked_until IS NULL OR blocked_until < NOW())
    RETURNING id, attempt_count INTO v_existing_id, v_new_count;

    IF v_existing_id IS NULL THEN
        -- Insert new record
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type, attempt_count)
        VALUES (LOWER(p_email), 'email', 'login', 1)
        RETURNING attempt_count INTO v_new_count;
    END IF;

    -- Check if we need to block
    IF v_new_count >= 5 THEN
        UPDATE auth_rate_limits
        SET blocked_until = NOW() + interval '30 minutes'
        WHERE identifier = LOWER(p_email)
          AND identifier_type = 'email'
          AND attempt_type = 'login'
          AND first_attempt_at > v_window_start;

        RETURN jsonb_build_object(
            'recorded', true,
            'blocked', true,
            'attempt_count', v_new_count
        );
    END IF;

    RETURN jsonb_build_object(
        'recorded', true,
        'blocked', false,
        'attempt_count', v_new_count
    );
END;
$$;

-- Step 5: Create function to record failed OTP attempt
CREATE OR REPLACE FUNCTION public.record_failed_otp(
    p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start timestamptz;
    v_existing_id uuid;
    v_new_count integer;
BEGIN
    v_window_start := NOW() - interval '10 minutes';

    -- Try to update existing record
    UPDATE auth_rate_limits
    SET attempt_count = attempt_count + 1,
        last_attempt_at = NOW()
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = 'otp'
      AND first_attempt_at > v_window_start
      AND (blocked_until IS NULL OR blocked_until < NOW())
    RETURNING id, attempt_count INTO v_existing_id, v_new_count;

    IF v_existing_id IS NULL THEN
        -- Insert new record
        INSERT INTO auth_rate_limits (identifier, identifier_type, attempt_type, attempt_count)
        VALUES (LOWER(p_email), 'email', 'otp', 1)
        RETURNING attempt_count INTO v_new_count;
    END IF;

    -- Check if we need to block (3 attempts for OTP)
    IF v_new_count >= 3 THEN
        UPDATE auth_rate_limits
        SET blocked_until = NOW() + interval '60 minutes'
        WHERE identifier = LOWER(p_email)
          AND identifier_type = 'email'
          AND attempt_type = 'otp'
          AND first_attempt_at > v_window_start;

        -- Log security event
        INSERT INTO security_audit_log (event_type, details)
        VALUES ('otp_blocked', jsonb_build_object(
            'email', p_email,
            'attempt_count', v_new_count
        ));

        RETURN jsonb_build_object(
            'recorded', true,
            'blocked', true,
            'attempt_count', v_new_count
        );
    END IF;

    RETURN jsonb_build_object(
        'recorded', true,
        'blocked', false,
        'attempt_count', v_new_count
    );
END;
$$;

-- Step 6: Create function to clear rate limit on successful auth
CREATE OR REPLACE FUNCTION public.clear_auth_rate_limit(
    p_email text,
    p_attempt_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM auth_rate_limits
    WHERE identifier = LOWER(p_email)
      AND identifier_type = 'email'
      AND attempt_type = p_attempt_type;
END;
$$;

-- Step 7: Grant execute permissions (these need to work pre-auth)
GRANT EXECUTE ON FUNCTION public.check_otp_rate_limit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_otp(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_auth_rate_limit(text, text) TO anon, authenticated;

-- Step 8: Add @omit comments to hide from OpenAPI
COMMENT ON FUNCTION public.check_otp_rate_limit IS '@omit';
COMMENT ON FUNCTION public.check_login_rate_limit IS '@omit';
COMMENT ON FUNCTION public.record_failed_login IS '@omit';
COMMENT ON FUNCTION public.record_failed_otp IS '@omit';
COMMENT ON FUNCTION public.clear_auth_rate_limit IS '@omit';

-- Step 9: Create scheduled cleanup (run via pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted integer;
BEGIN
    DELETE FROM auth_rate_limits
    WHERE first_attempt_at < NOW() - interval '24 hours'
       OR (blocked_until IS NOT NULL AND blocked_until < NOW() - interval '1 hour');

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- =====================================================
-- VERIFICATION: Test the rate limiting
-- =====================================================

-- Test login rate limit check:
-- SELECT check_login_rate_limit('test@example.com');

-- Simulate failed logins:
-- SELECT record_failed_login('test@example.com');
-- SELECT record_failed_login('test@example.com');
-- SELECT record_failed_login('test@example.com');
-- SELECT record_failed_login('test@example.com');
-- SELECT record_failed_login('test@example.com');
-- SELECT check_login_rate_limit('test@example.com'); -- Should be blocked

-- Clean up test data:
-- DELETE FROM auth_rate_limits WHERE identifier = 'test@example.com';
