-- Migration: Setup pg_cron job to clean up expired and old revoked invite tokens
-- This runs daily at 3:00 AM UTC to clean up:
-- 1. Expired tokens (based on expires_at)
-- 2. Revoked tokens older than 30 days

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_invite_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
  revoked_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- 1. Delete expired tokens
  WITH deleted_expired AS (
    DELETE FROM invite_tokens
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM deleted_expired;

  -- 2. Delete revoked tokens older than 30 days
  WITH deleted_revoked AS (
    DELETE FROM invite_tokens
    WHERE revoked_at IS NOT NULL
      AND revoked_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO revoked_count FROM deleted_revoked;

  total_deleted := expired_count + revoked_count;

  -- Log the cleanup (optional - can be viewed in Supabase logs)
  IF total_deleted > 0 THEN
    RAISE NOTICE 'Invite token cleanup: % expired, % old revoked, % total deleted',
      expired_count, revoked_count, total_deleted;
  END IF;

  RETURN total_deleted;
END;
$$;

-- Schedule the cleanup job to run daily at 3:00 AM UTC
-- Note: pg_cron jobs run in the 'postgres' database
SELECT cron.schedule(
  'cleanup-invite-tokens',           -- job name
  '0 3 * * *',                       -- cron schedule: daily at 3 AM UTC
  $$SELECT cleanup_invite_tokens()$$ -- SQL to execute
);

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION cleanup_invite_tokens() TO service_role;

-- Add a comment explaining the job
COMMENT ON FUNCTION cleanup_invite_tokens() IS
  'Cleans up expired invite tokens and revoked tokens older than 30 days. Scheduled to run daily at 3 AM UTC.';
