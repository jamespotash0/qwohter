-- Migration: Add automatic cleanup for rate limiting log tables
-- This extends the existing pg_cron setup to also clean up:
-- 1. invite_token_attempts (rate limiting logs for invite tokens)
-- 2. organization_creation_log (rate limiting logs for org creation)
--
-- Retention: 7 days for both tables (provides audit trail while preventing unbounded growth)

-- Create cleanup function for invite token attempts
CREATE OR REPLACE FUNCTION cleanup_invite_token_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete attempts older than 7 days
  WITH deleted AS (
    DELETE FROM invite_token_attempts
    WHERE created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Invite token attempts cleanup: % records deleted', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

-- Create cleanup function for organization creation log
CREATE OR REPLACE FUNCTION cleanup_organization_creation_log()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete logs older than 7 days
  WITH deleted AS (
    DELETE FROM organization_creation_log
    WHERE timestamp < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Organization creation log cleanup: % records deleted', deleted_count;
  END IF;

  RETURN deleted_count;
END;
$$;

-- Create a combined cleanup function that runs all rate limiting cleanups
CREATE OR REPLACE FUNCTION cleanup_all_rate_limiting_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_attempts_deleted INTEGER;
  org_creation_deleted INTEGER;
BEGIN
  -- Clean up invite token attempts
  SELECT cleanup_invite_token_attempts() INTO invite_attempts_deleted;

  -- Clean up organization creation logs
  SELECT cleanup_organization_creation_log() INTO org_creation_deleted;

  RETURN jsonb_build_object(
    'invite_token_attempts_deleted', invite_attempts_deleted,
    'organization_creation_log_deleted', org_creation_deleted,
    'total_deleted', invite_attempts_deleted + org_creation_deleted,
    'cleaned_at', NOW()
  );
END;
$$;

-- Schedule the cleanup job to run daily at 3:30 AM UTC (30 min after invite_tokens cleanup)
-- This staggers the jobs to avoid running simultaneously
SELECT cron.schedule(
  'cleanup-rate-limiting-logs',
  '30 3 * * *',
  $$SELECT cleanup_all_rate_limiting_logs()$$
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_invite_token_attempts() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_organization_creation_log() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_all_rate_limiting_logs() TO service_role;

-- Add comments
COMMENT ON FUNCTION cleanup_invite_token_attempts() IS
  'Cleans up invite token attempt records older than 7 days. Called by cleanup_all_rate_limiting_logs.';

COMMENT ON FUNCTION cleanup_organization_creation_log() IS
  'Cleans up organization creation log records older than 7 days. Called by cleanup_all_rate_limiting_logs.';

COMMENT ON FUNCTION cleanup_all_rate_limiting_logs() IS
  'Master cleanup function for all rate limiting tables. Scheduled daily at 3:30 AM UTC via pg_cron.';
