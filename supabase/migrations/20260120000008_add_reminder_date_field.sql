-- Migration: Add reminder_date field for simplified reminder system
-- Description:
--   1. Add reminder_date (TIMESTAMPTZ) column for exact reminder date/time
--   2. Keep old fields for backward compatibility but deprecate them
--   3. Simplify notification check to use reminder_date directly

-- =============================================================================
-- STEP 1: Add reminder_date column
-- =============================================================================

ALTER TABLE project_tasks
ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ;

COMMENT ON COLUMN project_tasks.reminder_date IS 'Exact date and time to send reminder notification. Takes precedence over remind_before_days calculation.';

-- =============================================================================
-- STEP 2: Add index for efficient reminder queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_project_tasks_reminder_date
  ON project_tasks(reminder_date)
  WHERE reminder_date IS NOT NULL AND reminder_sent = false AND status != 'done';

-- =============================================================================
-- STEP 3: Migrate existing reminders to use reminder_date
-- Backfill reminder_date from remind_before_days + reminder_time calculations
-- =============================================================================

UPDATE project_tasks
SET reminder_date = (
  (due_date - remind_before_days * INTERVAL '1 day')::DATE
  + reminder_time::TIME
)::TIMESTAMPTZ
WHERE remind_before_days IS NOT NULL
  AND reminder_date IS NULL
  AND due_date IS NOT NULL
  AND reminder_time IS NOT NULL
  AND reminder_recurrence = 'once';

-- =============================================================================
-- STEP 4: Update check_due_notifications function to use reminder_date
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
  current_timestamp_utc TIMESTAMPTZ;
  current_date_utc DATE;
  current_hour_utc INT;
BEGIN
  -- Get current timestamp in UTC
  current_timestamp_utc := NOW() AT TIME ZONE 'UTC';
  current_date_utc := current_timestamp_utc::DATE;
  current_hour_utc := EXTRACT(HOUR FROM current_timestamp_utc)::INT;

  -- ==========================================================================
  -- 1. REMINDERS WITH EXACT DATE (reminder_date field - NEW SYSTEM)
  -- Send when reminder_date matches current hour
  -- ==========================================================================
  RETURN QUERY
  SELECT
    'task_reminder'::TEXT as notification_type,
    pt.assigned_to as user_id,
    pt.organization_id,
    ('Reminder: ' || pt.title)::TEXT as title,
    (CASE
      WHEN pt.due_date IS NULL THEN 'Reminder for your task "' || pt.title || '"'
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
      'reminder_date', pt.reminder_date,
      'proposal_id', pt.proposal_id
    ) as metadata
  FROM project_tasks pt
  WHERE pt.assigned_to IS NOT NULL
    AND pt.status != 'done'
    AND pt.reminder_date IS NOT NULL
    AND COALESCE(pt.reminder_sent, false) = false
    -- Check if reminder_date falls within current hour
    AND pt.reminder_date >= date_trunc('hour', current_timestamp_utc)
    AND pt.reminder_date < date_trunc('hour', current_timestamp_utc) + INTERVAL '1 hour';

  -- ==========================================================================
  -- 2. DAILY REMINDERS (reminder_recurrence = 'daily') - LEGACY
  -- Keep for backward compatibility, but UI should migrate to using reminder_date
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
    AND pt.reminder_date IS NULL -- Only use legacy if new system not in use
    -- Current date is within reminder window (start date to due date) - UTC
    AND current_date_utc >= (pt.due_date - pt.remind_before_days)
    AND current_date_utc <= pt.due_date
    -- Check if reminder time hour matches current hour (UTC)
    AND EXTRACT(HOUR FROM pt.reminder_time)::INT = current_hour_utc
    -- Haven't sent a reminder today (UTC)
    AND (pt.last_reminder_sent_at IS NULL
         OR (pt.last_reminder_sent_at AT TIME ZONE 'UTC')::DATE < current_date_utc);

  -- ==========================================================================
  -- 3. STANDARD DUE DATE NOTIFICATIONS (no custom reminder set)
  -- For tasks without any reminder, send notification on due day at 9 AM
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
    -- Only for tasks WITHOUT any reminders
    AND pt.reminder_date IS NULL
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
  'Returns tasks with due reminders. Uses reminder_date for exact timing when set, falls back to legacy remind_before_days calculation. Uses UTC for time comparisons.';
