-- Migration: Add reminder and due date notification preferences
-- Description: Adds columns for reminder and task due date email notifications

-- =============================================================================
-- Add new notification preference columns
-- =============================================================================

-- Reminder Events
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_reminder_due BOOLEAN DEFAULT true;

-- Task Due Date Events
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_task_due BOOLEAN DEFAULT true;

-- Comment on new columns
COMMENT ON COLUMN notification_preferences.email_on_reminder_due IS 'Send email when a reminder becomes due';
COMMENT ON COLUMN notification_preferences.email_on_task_due IS 'Send email when a task due date is approaching or passed';

-- =============================================================================
-- Add notification types for reminders and due dates
-- =============================================================================

-- Update the notifications table type constraint if it exists
-- (The notifications table uses free-form text for type, so no constraint update needed)

-- =============================================================================
-- Create function to check for due reminders and tasks
-- This function can be called by a cron job to send notifications
-- =============================================================================

CREATE OR REPLACE FUNCTION check_due_notifications()
RETURNS TABLE (
  notification_type TEXT,
  user_id UUID,
  organization_id UUID,
  title TEXT,
  message TEXT,
  link TEXT,
  metadata JSONB
) AS $$
BEGIN
  -- Return reminders that are due (within the next hour and not already completed)
  RETURN QUERY
  SELECT
    'reminder_due'::TEXT as notification_type,
    r.created_by as user_id,
    r.organization_id,
    ('Reminder: ' || r.title)::TEXT as title,
    COALESCE(r.description, 'Your reminder is due')::TEXT as message,
    ('/reminders?id=' || r.id::TEXT)::TEXT as link,
    jsonb_build_object(
      'reminder_id', r.id,
      'reminder_type', r.reminder_type,
      'due_date', r.due_date
    ) as metadata
  FROM reminders r
  WHERE r.reminder_status = 'Pending'
    AND r.due_date <= NOW() + INTERVAL '1 hour'
    AND r.due_date > NOW() - INTERVAL '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.metadata->>'reminder_id' = r.id::TEXT
        AND n.type = 'reminder_due'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );

  -- Return tasks that are due today (for assigned users)
  RETURN QUERY
  SELECT
    'task_due'::TEXT as notification_type,
    pt.assigned_to as user_id,
    pt.organization_id,
    ('Task Due: ' || pt.title)::TEXT as title,
    ('Your task "' || pt.title || '" is due ' ||
      CASE
        WHEN pt.due_date < CURRENT_DATE THEN 'overdue!'
        WHEN pt.due_date = CURRENT_DATE THEN 'today!'
        ELSE 'tomorrow!'
      END
    )::TEXT as message,
    ('/board?task=' || pt.id::TEXT)::TEXT as link,
    jsonb_build_object(
      'task_id', pt.id,
      'task_reference', pt.reference,
      'due_date', pt.due_date,
      'priority', pt.priority
    ) as metadata
  FROM project_tasks pt
  WHERE pt.assigned_to IS NOT NULL
    AND pt.status != 'done'
    AND pt.due_date IS NOT NULL
    AND pt.due_date <= CURRENT_DATE + 1
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.metadata->>'task_id' = pt.id::TEXT
        AND n.type = 'task_due'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION check_due_notifications() TO service_role;
