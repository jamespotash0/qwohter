-- Migration: Create scheduled_notifications table
-- Description:
--   A dedicated table for scheduling future notifications/reminders.
--   Supports polymorphic references (tasks, proposals, invoices, etc.)
--   Replaces reminder fields on project_tasks for better architecture.

-- =============================================================================
-- STEP 1: Create the scheduled_notifications table
-- =============================================================================

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference (can link to any entity)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'proposal', 'invoice', 'project')),
  entity_id UUID NOT NULL,

  -- Who receives it
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  recurrence TEXT DEFAULT 'once' CHECK (recurrence IN ('once', 'daily', 'weekly')),
  recurrence_end_date DATE, -- When to stop recurring (e.g., task due date)

  -- Content
  notification_type TEXT NOT NULL DEFAULT 'reminder', -- 'reminder', 'follow_up', 'due_date'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ, -- For recurring: when was last occurrence sent
  failure_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================================================
-- STEP 2: Create indexes for efficient querying
-- =============================================================================

-- Index for finding pending notifications due to be sent
CREATE INDEX idx_scheduled_notifications_pending
  ON scheduled_notifications(scheduled_for)
  WHERE status = 'pending';

-- Index for finding notifications by entity
CREATE INDEX idx_scheduled_notifications_entity
  ON scheduled_notifications(entity_type, entity_id);

-- Index for user's scheduled notifications
CREATE INDEX idx_scheduled_notifications_user
  ON scheduled_notifications(user_id, status);

-- Index for organization notifications
CREATE INDEX idx_scheduled_notifications_org
  ON scheduled_notifications(organization_id, status);

-- =============================================================================
-- STEP 3: Enable RLS
-- =============================================================================

ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view scheduled notifications in their organization
CREATE POLICY "Users can view org scheduled notifications"
  ON scheduled_notifications
  FOR SELECT
  TO authenticated
  USING (
    is_active_member(auth.uid(), organization_id)
  );

-- Users can create scheduled notifications for themselves or others in their org
CREATE POLICY "Users can create scheduled notifications"
  ON scheduled_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_active_member((select auth.uid()), organization_id)
  );

-- Users can update their own scheduled notifications or ones they created, or admins
CREATE POLICY "Users can update scheduled notifications"
  ON scheduled_notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR created_by = (select auth.uid())
    OR has_org_role((select auth.uid()), organization_id, ARRAY['Owner', 'Admin'])
  );

-- Users can delete their own scheduled notifications or admins
CREATE POLICY "Users can delete scheduled notifications"
  ON scheduled_notifications
  FOR DELETE
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR created_by = (select auth.uid())
    OR has_org_role((select auth.uid()), organization_id, ARRAY['Owner', 'Admin'])
  );

-- =============================================================================
-- STEP 4: Create helper function to schedule a notification
-- =============================================================================

CREATE OR REPLACE FUNCTION schedule_notification(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID,
  p_organization_id UUID,
  p_scheduled_for TIMESTAMPTZ,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_recurrence TEXT DEFAULT 'once',
  p_recurrence_end_date DATE DEFAULT NULL,
  p_notification_type TEXT DEFAULT 'reminder',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Cancel any existing pending notifications for this entity
  UPDATE scheduled_notifications
  SET status = 'cancelled', updated_at = NOW()
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND user_id = p_user_id
    AND status = 'pending';

  -- Insert new scheduled notification
  INSERT INTO scheduled_notifications (
    entity_type, entity_id, user_id, organization_id,
    scheduled_for, recurrence, recurrence_end_date,
    notification_type, title, message, link, metadata,
    created_by
  ) VALUES (
    p_entity_type, p_entity_id, p_user_id, p_organization_id,
    p_scheduled_for, p_recurrence, p_recurrence_end_date,
    p_notification_type, p_title, p_message, p_link, p_metadata,
    auth.uid()
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION schedule_notification TO authenticated;

-- =============================================================================
-- STEP 5: Create function to cancel scheduled notifications
-- =============================================================================

CREATE OR REPLACE FUNCTION cancel_scheduled_notification(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  cancelled_count INTEGER;
BEGIN
  UPDATE scheduled_notifications
  SET status = 'cancelled', updated_at = NOW()
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND status = 'pending'
    AND (p_user_id IS NULL OR user_id = p_user_id);

  GET DIAGNOSTICS cancelled_count = ROW_COUNT;
  RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_scheduled_notification TO authenticated;

-- =============================================================================
-- STEP 6: Migrate existing task reminders to scheduled_notifications
-- =============================================================================

INSERT INTO scheduled_notifications (
  entity_type,
  entity_id,
  user_id,
  organization_id,
  scheduled_for,
  recurrence,
  recurrence_end_date,
  notification_type,
  title,
  message,
  link,
  metadata,
  status,
  sent_at,
  last_sent_at,
  created_by
)
SELECT
  'task',
  pt.id,
  pt.assigned_to,
  pt.organization_id,
  pt.reminder_date,
  pt.reminder_recurrence,
  pt.due_date, -- End recurring reminders on due date
  'reminder',
  'Reminder: ' || pt.title,
  CASE
    WHEN pt.due_date IS NULL THEN 'Reminder for your task "' || pt.title || '"'
    ELSE 'Your task "' || pt.title || '" is coming up!'
  END,
  '/board?task=' || pt.id::TEXT,
  jsonb_build_object(
    'task_reference', pt.reference,
    'due_date', pt.due_date,
    'priority', pt.priority,
    'proposal_id', pt.proposal_id
  ),
  CASE
    WHEN pt.reminder_sent = true THEN 'sent'
    ELSE 'pending'
  END,
  CASE WHEN pt.reminder_sent = true THEN pt.last_reminder_sent_at END,
  pt.last_reminder_sent_at,
  pt.created_by
FROM project_tasks pt
WHERE pt.reminder_date IS NOT NULL
  AND pt.assigned_to IS NOT NULL
  AND pt.status != 'done';

-- =============================================================================
-- STEP 7: Update comments
-- =============================================================================

COMMENT ON TABLE scheduled_notifications IS
  'Stores scheduled/future notifications. Supports reminders for tasks, proposals, invoices, etc. Processed by pg_cron every 5 minutes.';

COMMENT ON COLUMN scheduled_notifications.entity_type IS 'Type of entity: task, proposal, invoice, project';
COMMENT ON COLUMN scheduled_notifications.entity_id IS 'UUID of the related entity';
COMMENT ON COLUMN scheduled_notifications.scheduled_for IS 'When to send the notification (UTC)';
COMMENT ON COLUMN scheduled_notifications.recurrence IS 'once = single notification, daily = repeat daily until end date';
COMMENT ON COLUMN scheduled_notifications.recurrence_end_date IS 'Stop recurring notifications after this date';
COMMENT ON COLUMN scheduled_notifications.status IS 'pending = waiting to send, sent = delivered, cancelled = user cancelled';

-- =============================================================================
-- STEP 8: Remove old reminder fields from project_tasks
-- =============================================================================

ALTER TABLE project_tasks
DROP COLUMN IF EXISTS reminder_date,
DROP COLUMN IF EXISTS reminder_recurrence,
DROP COLUMN IF EXISTS reminder_sent,
DROP COLUMN IF EXISTS last_reminder_sent_at,
DROP COLUMN IF EXISTS remind_before_days,
DROP COLUMN IF EXISTS reminder_time,
DROP COLUMN IF EXISTS reminder_hours_before;

-- Drop old indexes
DROP INDEX IF EXISTS idx_project_tasks_reminder_date;
