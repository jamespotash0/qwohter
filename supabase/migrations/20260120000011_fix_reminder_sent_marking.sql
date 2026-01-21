-- Migration: Fix process_due_notifications_internal to mark reminders as sent
-- Description:
--   The function creates notifications but wasn't marking task reminders as sent,
--   causing duplicate notifications to be created on every cron run.
--   This update collects task IDs and calls mark_task_reminder_sent() after processing.

-- =============================================================================
-- Update process_due_notifications_internal() to mark reminders as sent
-- =============================================================================

CREATE OR REPLACE FUNCTION process_due_notifications_internal()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_record RECORD;
  inserted_count INTEGER := 0;
  task_ids_to_mark UUID[] := ARRAY[]::UUID[];
  task_id_value UUID;
BEGIN
  -- Get all due notifications from our check function
  FOR notification_record IN SELECT * FROM check_due_notifications() LOOP
    -- Insert in-app notification
    INSERT INTO notifications (
      user_id,
      organization_id,
      type,
      title,
      message,
      link,
      metadata,
      is_read,
      created_at
    )
    VALUES (
      notification_record.user_id,
      notification_record.organization_id,
      notification_record.notification_type,
      notification_record.title,
      notification_record.message,
      notification_record.link,
      notification_record.metadata,
      false,
      NOW()
    )
    ON CONFLICT DO NOTHING;

    inserted_count := inserted_count + 1;

    -- Collect task IDs for task_reminder notifications to mark as sent
    IF notification_record.notification_type = 'task_reminder' THEN
      -- Extract task_id from metadata
      task_id_value := (notification_record.metadata->>'task_id')::UUID;
      IF task_id_value IS NOT NULL THEN
        task_ids_to_mark := array_append(task_ids_to_mark, task_id_value);
      END IF;
    END IF;
  END LOOP;

  -- Mark all collected task reminders as sent
  IF array_length(task_ids_to_mark, 1) > 0 THEN
    PERFORM mark_task_reminder_sent(task_ids_to_mark);
    RAISE NOTICE 'Marked % task reminder(s) as sent', array_length(task_ids_to_mark, 1);
  END IF;

  IF inserted_count > 0 THEN
    RAISE NOTICE 'Created % due notification(s)', inserted_count;
  END IF;

  RETURN inserted_count;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_due_notifications_internal() TO service_role;

COMMENT ON FUNCTION process_due_notifications_internal() IS
  'Creates in-app notifications for due reminders and tasks. Marks task reminders as sent after processing. Runs every 5 minutes via pg_cron.';
