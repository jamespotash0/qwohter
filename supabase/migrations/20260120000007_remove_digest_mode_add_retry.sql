-- Migration: Remove digest mode, simplify to immediate + retry queue
-- Description:
--   1. Remove digest_mode and digest_time columns (all notifications send immediately)
--   2. Rename notification_queue to notification_retry_queue (clarifies purpose)
--   3. Add retry_count and next_retry_at columns for retry logic
--   4. Keep the queue for failed notification retries only

-- =============================================================================
-- STEP 1: Drop digest columns from notification_preferences
-- =============================================================================

ALTER TABLE notification_preferences
DROP COLUMN IF EXISTS digest_mode,
DROP COLUMN IF EXISTS digest_time;

-- =============================================================================
-- STEP 2: Rename table to clarify its purpose (retry queue, not digest queue)
-- =============================================================================

ALTER TABLE IF EXISTS notification_queue
RENAME TO notification_retry_queue;

-- =============================================================================
-- STEP 3: Add retry-specific columns
-- =============================================================================

ALTER TABLE notification_retry_queue
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Update status check constraint to include 'retrying'
ALTER TABLE notification_retry_queue
DROP CONSTRAINT IF EXISTS email_notification_queue_status_check,
DROP CONSTRAINT IF EXISTS notification_queue_status_check,
DROP CONSTRAINT IF EXISTS notification_retry_queue_status_check;

ALTER TABLE notification_retry_queue
ADD CONSTRAINT notification_retry_queue_status_check
CHECK (status IN ('pending', 'retrying', 'sent', 'failed'));

-- =============================================================================
-- STEP 4: Add index for retry processing
-- =============================================================================

DROP INDEX IF EXISTS idx_notification_queue_status_scheduled;
DROP INDEX IF EXISTS idx_notification_queue_channel_status;

CREATE INDEX IF NOT EXISTS idx_notification_retry_queue_pending
  ON notification_retry_queue(status, next_retry_at)
  WHERE status IN ('pending', 'retrying');

-- =============================================================================
-- STEP 5: Update RLS policies
-- =============================================================================

DROP POLICY IF EXISTS "Users can view their own queued notifications" ON notification_retry_queue;
DROP POLICY IF EXISTS "Service role can manage notification queue" ON notification_retry_queue;

CREATE POLICY "Users can view their own retry notifications"
  ON notification_retry_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage retry queue"
  ON notification_retry_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- STEP 6: Update comments
-- =============================================================================

COMMENT ON TABLE notification_retry_queue IS 'Queue for failed notifications that need retry. Notifications are sent immediately; this table is only used when sending fails.';
COMMENT ON COLUMN notification_retry_queue.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN notification_retry_queue.next_retry_at IS 'When to attempt next retry (exponential backoff)';
COMMENT ON COLUMN notification_retry_queue.last_error IS 'Error message from last failed attempt';
