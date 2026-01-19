-- Migration: Standardize Organization Creation Rate Limiting
-- Adds RPC functions to match the invite token pattern for better security
-- Prevents direct INSERT to organization_creation_log table

BEGIN;

-- ============================================================================
-- 1. Create rate limit check function (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_org_creation_rate_limit(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(
  allowed BOOLEAN,
  user_attempts_used INT,
  ip_attempts_used INT,
  user_reset_at TIMESTAMPTZ,
  ip_reset_at TIMESTAMPTZ,
  reason TEXT
) AS $$
DECLARE
  v_one_day_ago TIMESTAMPTZ;
  v_one_hour_ago TIMESTAMPTZ;
  v_user_attempts INT;
  v_ip_attempts INT;
  v_max_user_attempts INT := 3;  -- Max 3 orgs per day per user
  v_max_ip_attempts INT := 10;   -- Max 10 orgs per hour per IP
BEGIN
  v_one_day_ago := NOW() - INTERVAL '24 hours';
  v_one_hour_ago := NOW() - INTERVAL '1 hour';

  -- Count user-based successful attempts in last 24 hours
  SELECT COUNT(*) INTO v_user_attempts
  FROM organization_creation_log
  WHERE user_id = p_user_id
    AND timestamp >= v_one_day_ago
    AND status = 'Success';

  -- Check user rate limit
  IF v_user_attempts >= v_max_user_attempts THEN
    RETURN QUERY SELECT
      FALSE,
      v_user_attempts,
      0,
      v_one_day_ago + INTERVAL '24 hours',
      NOW(),
      'Maximum 3 organizations per day limit reached';
    RETURN;
  END IF;

  -- If IP provided, check IP-based attempts
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_ip_attempts
    FROM organization_creation_log
    WHERE ip_address = p_ip_address::TEXT
      AND timestamp >= v_one_hour_ago;

    IF v_ip_attempts >= v_max_ip_attempts THEN
      RETURN QUERY SELECT
        FALSE,
        v_user_attempts,
        v_ip_attempts,
        v_one_day_ago + INTERVAL '24 hours',
        v_one_hour_ago + INTERVAL '1 hour',
        'Too many creation attempts from this network';
      RETURN;
    END IF;
  ELSE
    v_ip_attempts := 0;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    TRUE,
    v_user_attempts,
    v_ip_attempts,
    v_one_day_ago + INTERVAL '24 hours',
    v_one_hour_ago + INTERVAL '1 hour',
    'Allowed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Create attempt logging function (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_org_creation_attempt(
  p_user_id UUID,
  p_status TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Validate status
  IF p_status NOT IN ('Success', 'Failed', 'Rate_Limited') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be Success, Failed, or Rate_Limited', p_status;
  END IF;

  INSERT INTO organization_creation_log (
    user_id,
    timestamp,
    ip_address,
    status,
    error_message
  ) VALUES (
    p_user_id,
    NOW(),
    p_ip_address,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Get remaining creations function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_remaining_org_creations(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_used INT;
  v_max INT := 3;
BEGIN
  SELECT COUNT(*) INTO v_used
  FROM organization_creation_log
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '24 hours'
    AND status = 'Success';

  RETURN GREATEST(0, v_max - v_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Update RLS policy to restrict direct INSERT
-- ============================================================================

-- Drop existing permissive INSERT policy
DROP POLICY IF EXISTS "creation_log_insert_policy" ON organization_creation_log;

-- Create restrictive INSERT policy (only service_role can insert directly)
CREATE POLICY "creation_log_insert_policy" ON organization_creation_log
FOR INSERT TO service_role
WITH CHECK (true);

-- ============================================================================
-- 5. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION check_org_creation_rate_limit(UUID, INET) TO authenticated;
GRANT EXECUTE ON FUNCTION log_org_creation_attempt(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_org_creations(UUID) TO authenticated;

-- ============================================================================
-- 6. Add comments
-- ============================================================================

COMMENT ON FUNCTION check_org_creation_rate_limit IS
  'Check if user can create an organization based on rate limits (3/day per user, 10/hour per IP)';

COMMENT ON FUNCTION log_org_creation_attempt IS
  'Log an organization creation attempt. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION get_remaining_org_creations IS
  'Get number of organizations user can still create today';

COMMIT;
