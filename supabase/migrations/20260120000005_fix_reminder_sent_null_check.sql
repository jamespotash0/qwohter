-- Migration: Fix reminder notifications
-- Description:
--   1. Fix reminder_sent NULL check - was checking `reminder_sent = false` but column can be NULL
--   2. Add missing email_on_task_reminder column to notification_preferences
--   3. Set default value for reminder_sent column to prevent future NULL issues

-- =============================================================================
-- STEP 1: Add missing notification preference column
-- =============================================================================

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_task_reminder BOOLEAN DEFAULT true;

COMMENT ON COLUMN notification_preferences.email_on_task_reminder IS 'Send email for task reminder notifications';

-- =============================================================================
-- STEP 2: Set default for reminder_sent to prevent future NULLs
-- =============================================================================

ALTER TABLE project_tasks
ALTER COLUMN reminder_sent SET DEFAULT false;

-- Backfill existing NULL values
UPDATE project_tasks
SET reminder_sent = false
WHERE reminder_sent IS NULL;

-- =============================================================================
-- FUNCTION: check_due_notifications() - Fixed NULL handling
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
) AS $check_due$
DECLARE
  current_date_utc DATE;
  current_hour_utc INT;
BEGIN
  -- Get current date and hour in UTC
  current_date_utc := (NOW() AT TIME ZONE 'UTC')::DATE;
  current_hour_utc := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::INT;

  -- ==========================================================================
  -- 1. ONE-TIME REMINDERS (reminder_recurrence = 'once')
  -- Send once when: (due_date - remind_before_days) = today AND hour matches
  -- ==========================================================================
  RETURN QUERY
  SELECT
    'task_reminder'::TEXT as notification_type,
    pt.assigned_to as user_id,
    pt.organization_id,
    ('Reminder: ' || pt.title)::TEXT as title,
    (CASE
      WHEN pt.remind_before_days = 0 THEN 'Your task "' || pt.title || '" is due today!'
      WHEN pt.remind_before_days = 1 THEN 'Your task "' || pt.title || '" is due tomorrow!'
      ELSE 'Your task "' || pt.title || '" is due in ' || pt.remind_before_days || ' days!'
    END)::TEXT as message,
    ('/board?task=' || pt.id::TEXT)::TEXT as link,
    jsonb_build_object(
      'task_id', pt.id,
      'task_reference', pt.reference,
      'due_date', pt.due_date,
      'priority', pt.priority,
      'remind_before_days', pt.remind_before_days,
      'reminder_recurrence', pt.reminder_recurrence,
      'proposal_id', pt.proposal_id
    ) as metadata
  FROM project_tasks pt
  WHERE pt.assigned_to IS NOT NULL
    AND pt.status != 'done'
    AND pt.due_date IS NOT NULL
    AND pt.remind_before_days IS NOT NULL
    AND COALESCE(pt.reminder_recurrence, 'once') = 'once'
    -- FIX: Use COALESCE to treat NULL as false
    AND COALESCE(pt.reminder_sent, false) = false
    -- Check if reminder date matches today (UTC)
    AND (pt.due_date - pt.remind_before_days) = current_date_utc
    -- Check if reminder time hour matches current hour (UTC)
    AND EXTRACT(HOUR FROM pt.reminder_time)::INT = current_hour_utc;

  -- ==========================================================================
  -- 2. DAILY REMINDERS (reminder_recurrence = 'daily')
  -- Send every day at reminder_time, starting from (due_date - remind_before_days)
  -- until task is done or past due date
  -- ==========================================================================
  RETURN QUERY
  SELECT
    'task_reminder'::TEXT as notification_type,
    pt.assigned_to as user_id,
    pt.organization_id,
    ('Daily Reminder: ' || pt.title)::TEXT as title,
    (CASE
      WHEN pt.due_date = current_date_utc THEN 'Your task "' || pt.title || '" is due today!'
      WHEN pt.due_date = current_date_utc + 1 THEN 'Your task "' || pt.title || '" is due tomorrow!'
      WHEN pt.due_date < current_date_utc THEN 'Your task "' || pt.title || '" is overdue!'
      ELSE 'Your task "' || pt.title || '" is due in ' || (pt.due_date - current_date_utc) || ' days!'
    END)::TEXT as message,
    ('/board?task=' || pt.id::TEXT)::TEXT as link,
    jsonb_build_object(
      'task_id', pt.id,
      'task_reference', pt.reference,
      'due_date', pt.due_date,
      'priority', pt.priority,
      'remind_before_days', pt.remind_before_days,
      'reminder_recurrence', 'daily',
      'proposal_id', pt.proposal_id
    ) as metadata
  FROM project_tasks pt
  WHERE pt.assigned_to IS NOT NULL
    AND pt.status != 'done'
    AND pt.due_date IS NOT NULL
    AND pt.remind_before_days IS NOT NULL
    AND pt.reminder_recurrence = 'daily'
    -- Current date is within reminder window (start date to due date) - UTC
    AND current_date_utc >= (pt.due_date - pt.remind_before_days)
    AND current_date_utc <= pt.due_date
    -- Check if reminder time hour matches current hour (UTC)
    AND EXTRACT(HOUR FROM pt.reminder_time)::INT = current_hour_utc
    -- Haven't sent a reminder today (UTC)
    AND (pt.last_reminder_sent_at IS NULL
         OR (pt.last_reminder_sent_at AT TIME ZONE 'UTC')::DATE < current_date_utc);

  -- ==========================================================================
  -- 3. HOURLY REMINDERS (reminder_recurrence = 'hourly')
  -- Send X hours before due date (uses reminder_hours_before)
  -- Note: Since due_date is DATE only, we combine with reminder_time
  -- ==========================================================================
  RETURN QUERY
  SELECT
    'task_reminder'::TEXT as notification_type,
    pt.assigned_to as user_id,
    pt.organization_id,
    ('Reminder: ' || pt.title)::TEXT as title,
    ('Your task "' || pt.title || '" is due in ' || pt.reminder_hours_before || ' hours!')::TEXT as message,
    ('/board?task=' || pt.id::TEXT)::TEXT as link,
    jsonb_build_object(
      'task_id', pt.id,
      'task_reference', pt.reference,
      'due_date', pt.due_date,
      'priority', pt.priority,
      'reminder_hours_before', pt.reminder_hours_before,
      'reminder_recurrence', 'hourly',
      'proposal_id', pt.proposal_id
    ) as metadata
  FROM project_tasks pt
  WHERE pt.assigned_to IS NOT NULL
    AND pt.status != 'done'
    AND pt.due_date IS NOT NULL
    AND pt.reminder_recurrence = 'hourly'
    AND pt.reminder_hours_before IS NOT NULL
    -- FIX: Use COALESCE to treat NULL as false
    AND COALESCE(pt.reminder_sent, false) = false
    -- Due date is today (UTC)
    AND pt.due_date = current_date_utc
    -- Current hour is X hours before reminder_time (the "due time") - UTC
    AND current_hour_utc = (EXTRACT(HOUR FROM pt.reminder_time)::INT - pt.reminder_hours_before);

  -- ==========================================================================
  -- 4. STANDARD DUE DATE NOTIFICATIONS (no custom reminder set)
  -- For tasks without reminders, send notification on due day
  -- ==========================================================================
  RETURN QUERY
  SELECT
    'task_due'::TEXT as notification_type,
    pt.assigned_to as user_id,
    pt.organization_id,
    ('Task Due: ' || pt.title)::TEXT as title,
    ('Your task "' || pt.title || '" is ' ||
      CASE
        WHEN pt.due_date < current_date_utc THEN 'overdue!'
        WHEN pt.due_date = current_date_utc THEN 'due today!'
        ELSE 'due tomorrow!'
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
    -- Only for tasks WITHOUT custom reminders
    AND pt.remind_before_days IS NULL
    AND pt.due_date <= current_date_utc + 1
    -- Send at 9 AM UTC for standard due date notifications
    AND current_hour_utc = 9
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.metadata->>'task_id' = pt.id::TEXT
        AND n.type = 'task_due'
        AND n.created_at > NOW() - INTERVAL '24 hours'
    );
END;
$check_due$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION check_due_notifications() TO service_role;

COMMENT ON FUNCTION check_due_notifications() IS
  'Returns tasks with due reminders. Uses UTC for time comparisons. Uses COALESCE for NULL-safe reminder_sent checks.';
