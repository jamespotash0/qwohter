-- ============================================================================
-- Migration: Create Invite Token Rate Limiting System
-- ============================================================================
-- Prevents brute force attacks on invite token validation
-- Tracks failed attempts per IP address and user ID
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create invite_token_attempts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS invite_token_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tracking identifiers
  ip_address INET NOT NULL,
  user_id UUID NULL,  -- NULL for unauthenticated attempts
  invite_token TEXT NOT NULL,

  -- Attempt metadata
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT NULL,

  -- Indexes for performance
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Create indexes for fast lookups
-- ============================================================================

-- Index for IP-based rate limiting (most common query)
CREATE INDEX idx_invite_attempts_ip_time
ON invite_token_attempts(ip_address, attempted_at DESC);

-- Index for user-based rate limiting
CREATE INDEX idx_invite_attempts_user_time
ON invite_token_attempts(user_id, attempted_at DESC)
WHERE user_id IS NOT NULL;

-- Index for token-specific tracking
CREATE INDEX idx_invite_attempts_token_time
ON invite_token_attempts(invite_token, attempted_at DESC);

RAISE NOTICE 'Indexes created for invite_token_attempts';

-- ============================================================================
-- 3. Create RLS policies
-- ============================================================================

ALTER TABLE invite_token_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role and authenticated users can read their own attempts
CREATE POLICY "Users can view own invite attempts"
  ON invite_token_attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert (done via RPC function)
CREATE POLICY "Service role can insert attempts"
  ON invite_token_attempts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- No one can update or delete (audit trail)
CREATE POLICY "No updates allowed"
  ON invite_token_attempts
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "No deletes allowed"
  ON invite_token_attempts
  FOR DELETE
  TO authenticated
  USING (false);

RAISE NOTICE 'RLS policies created for invite_token_attempts';

-- ============================================================================
-- 4. Create rate limiting check function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_invite_rate_limit(
  p_ip_address INET,
  p_user_id UUID DEFAULT NULL,
  p_invite_token TEXT DEFAULT NULL,
  p_window_minutes INT DEFAULT 5,
  p_max_attempts INT DEFAULT 5
)
RETURNS TABLE(
  allowed BOOLEAN,
  attempts_used INT,
  window_reset_at TIMESTAMPTZ,
  reason TEXT
) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_ip_attempts INT;
  v_user_attempts INT;
  v_token_attempts INT;
BEGIN
  -- Calculate time window start
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Count IP-based attempts in window
  SELECT COUNT(*) INTO v_ip_attempts
  FROM invite_token_attempts
  WHERE ip_address = p_ip_address
    AND attempted_at >= v_window_start
    AND success = FALSE;  -- Only count failed attempts

  -- Check IP rate limit
  IF v_ip_attempts >= p_max_attempts THEN
    RETURN QUERY SELECT
      FALSE,
      v_ip_attempts,
      v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
      'Too many failed attempts from this IP address. Please try again later.';
    RETURN;
  END IF;

  -- If user_id provided, check user-based attempts
  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_attempts
    FROM invite_token_attempts
    WHERE user_id = p_user_id
      AND attempted_at >= v_window_start
      AND success = FALSE;

    IF v_user_attempts >= p_max_attempts THEN
      RETURN QUERY SELECT
        FALSE,
        v_user_attempts,
        v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
        'Too many failed attempts. Please try again later.';
      RETURN;
    END IF;
  END IF;

  -- If token provided, check token-specific attempts (prevent token scanning)
  IF p_invite_token IS NOT NULL THEN
    SELECT COUNT(*) INTO v_token_attempts
    FROM invite_token_attempts
    WHERE invite_token = p_invite_token
      AND attempted_at >= v_window_start
      AND success = FALSE;

    -- Lower threshold for individual tokens (prevents brute force)
    IF v_token_attempts >= (p_max_attempts / 2) THEN
      RETURN QUERY SELECT
        FALSE,
        v_token_attempts,
        v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
        'This invitation link has been attempted too many times. Please contact the sender.';
      RETURN;
    END IF;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    TRUE,
    v_ip_attempts,
    v_window_start + (p_window_minutes || ' minutes')::INTERVAL,
    'Allowed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Rate limiting check function created';

-- ============================================================================
-- 5. Create attempt logging function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_invite_attempt(
  p_ip_address INET,
  p_user_id UUID,
  p_invite_token TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO invite_token_attempts (
    ip_address,
    user_id,
    invite_token,
    success,
    error_message
  ) VALUES (
    p_ip_address,
    p_user_id,
    p_invite_token,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Attempt logging function created';

-- ============================================================================
-- 6. Create cleanup function for old attempts (optional, for maintenance)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_invite_attempts(
  p_days_to_keep INT DEFAULT 30
)
RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM invite_token_attempts
  WHERE attempted_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old invite attempts', v_deleted_count;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Cleanup function created';

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

GRANT SELECT ON invite_token_attempts TO authenticated;
GRANT EXECUTE ON FUNCTION check_invite_rate_limit(INET, UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_invite_rate_limit(INET, UUID, TEXT, INT, INT) TO anon;
GRANT EXECUTE ON FUNCTION log_invite_attempt(INET, UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_invite_attempt(INET, UUID, TEXT, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_invite_attempts(INT) TO service_role;

RAISE NOTICE 'Permissions granted';

-- ============================================================================
-- 8. Verify installation
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '================================';
  RAISE NOTICE 'Invite Rate Limiting System Created';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Table: invite_token_attempts';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - check_invite_rate_limit(ip, user_id, token, window, max)';
  RAISE NOTICE '  - log_invite_attempt(ip, user_id, token, success, error)';
  RAISE NOTICE '  - cleanup_old_invite_attempts(days)';
  RAISE NOTICE '';
  RAISE NOTICE 'Default Limits:';
  RAISE NOTICE '  - 5 attempts per 5 minutes per IP';
  RAISE NOTICE '  - 5 attempts per 5 minutes per user';
  RAISE NOTICE '  - 2 attempts per 5 minutes per token (prevents scanning)';
  RAISE NOTICE '================================';
END $$;

COMMIT;
