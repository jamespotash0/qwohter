-- Migration: Rename email_notification_queue to notification_queue for multi-channel support
-- Description:
--   1. Rename table to support email, SMS, and push notifications
--   2. Add channel column to specify delivery method
--   3. Update RLS policies for new table name

-- =============================================================================
-- STEP 1: Rename the table
-- =============================================================================

ALTER TABLE IF EXISTS email_notification_queue
RENAME TO notification_queue;

-- =============================================================================
-- STEP 2: Add channel column for multi-channel support
-- =============================================================================

ALTER TABLE notification_queue
ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'push'));

COMMENT ON COLUMN notification_queue.channel IS 'Delivery channel: email, sms, or push notification';

-- =============================================================================
-- STEP 3: Add index for channel-based queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notification_queue_channel_status
  ON notification_queue(channel, status, scheduled_for);

-- =============================================================================
-- STEP 4: Update RLS policies for new table name
-- =============================================================================

-- Drop old policies (they reference old table name internally)
DROP POLICY IF EXISTS "Users can view their own queued notifications" ON notification_queue;
DROP POLICY IF EXISTS "Service role can manage email queue" ON notification_queue;

-- Recreate policies with new table name
CREATE POLICY "Users can view their own queued notifications"
  ON notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notification queue"
  ON notification_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- STEP 5: Update comments
-- =============================================================================

COMMENT ON TABLE notification_queue IS 'Queue for pending notifications across all channels (email, SMS, push). Used for daily digests and delayed delivery.';
