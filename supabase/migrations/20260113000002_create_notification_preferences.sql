-- Migration: Create notification preferences and email queue tables
-- Description: Adds user-configurable notification preferences and email digest queue

-- =============================================================================
-- Table: notification_preferences
-- Stores per-user notification settings for email delivery
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Delivery Settings
  email_enabled BOOLEAN DEFAULT true,
  digest_mode TEXT DEFAULT 'instant' CHECK (digest_mode IN ('instant', 'daily')),
  digest_time TIME DEFAULT '09:00:00',

  -- Signature Events
  email_on_signature_sent BOOLEAN DEFAULT true,
  email_on_signature_viewed BOOLEAN DEFAULT true,
  email_on_signature_signed BOOLEAN DEFAULT true,

  -- Proposal Events
  email_on_proposal_submitted BOOLEAN DEFAULT true,
  email_on_proposal_won BOOLEAN DEFAULT true,
  email_on_proposal_rejected BOOLEAN DEFAULT false,

  -- Team Activity
  email_on_mention BOOLEAN DEFAULT true,
  email_on_task_assigned BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, organization_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_org
  ON notification_preferences(user_id, organization_id);

-- =============================================================================
-- Table: email_notification_queue
-- Stores pending email notifications for digest batching
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Notification Details
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  metadata JSONB DEFAULT '{}',

  -- Processing Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON email_notification_queue(status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_email_queue_user
  ON email_notification_queue(user_id);

-- =============================================================================
-- RLS Policies for notification_preferences
-- =============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- RLS Policies for email_notification_queue
-- Service role only (processed by Edge Functions)
-- =============================================================================

ALTER TABLE email_notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queued notifications
CREATE POLICY "Users can view their own queued notifications"
  ON email_notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (via Edge Functions)
CREATE POLICY "Service role can manage email queue"
  ON email_notification_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- Trigger: Auto-update updated_at on notification_preferences
-- =============================================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();
