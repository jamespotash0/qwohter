-- Migration: Update cron functions to use scheduled_notifications table
-- Description:
--   1. Update check_due_notifications() to read from scheduled_notifications
--   2. Update process_due_notifications_internal() to mark notifications as sent
--   3. Simpler, cleaner logic with the new table structure

-- =============================================================================
-- STEP 1: Replace check_due_notifications() function
-- =============================================================================

CREATE OR REPLACE FUNCTION check_due_notifications()
RETURNS TABLE (
  notification_type TEXT,
  user_id UUID,
  organization_id UUID,
  title TEXT,
  message TEXT,
  link TEXT,
  metadata JSONB,
  scheduled_notification_id UUID
) AS $$
DECLARE
  current_timestamp_utc TIMESTAMPTZ;
  current_date_utc DATE;
BEGIN
  current_timestamp_utc := NOW() AT TIME ZONE 'UTC';
  current_date_utc := current_timestamp_utc::DATE;

  -- ==========================================================================
  -- Return all pending scheduled notifications that are due
  -- ==========================================================================
  RETURN QUERY
  SELECT
    sn.notification_type::TEXT,
    sn.user_id,
    sn.organization_id,
    sn.title::TEXT,
    COALESCE(sn.message, '')::TEXT as message,
    sn.link::TEXT,
    sn.metadata || jsonb_build_object('scheduled_notification_id', sn.id) as metadata,
    sn.id as scheduled_notification_id
  FROM scheduled_notifications sn
  WHERE sn.status = 'pending'
    AND sn.scheduled_for <= current_timestamp_utc
    -- For recurring: check if already sent today
    AND (
      sn.recurrence = 'once'
      OR sn.last_sent_at IS NULL
      OR (sn.last_sent_at AT TIME ZONE 'UTC')::DATE < current_date_utc
    )
    -- For recurring: check if still within recurrence window
    AND (
      sn.recurrence = 'once'
      OR sn.recurrence_end_date IS NULL
      OR current_date_utc <= sn.recurrence_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_due_notifications() TO service_role;

COMMENT ON FUNCTION check_due_notifications() IS
  'Returns scheduled notifications that are due to be sent. Checks scheduled_notifications table.';

-- =============================================================================
-- STEP 2: Create function to mark scheduled notifications as sent
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_scheduled_notifications_sent(notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  current_timestamp_utc TIMESTAMPTZ;
BEGIN
  current_timestamp_utc := NOW();

  -- For one-time notifications: mark as sent
  UPDATE scheduled_notifications
  SET
    status = 'sent',
    sent_at = current_timestamp_utc,
    last_sent_at = current_timestamp_utc,
    updated_at = current_timestamp_utc
  WHERE id = ANY(notification_ids)
    AND recurrence = 'once'
    AND status = 'pending';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- For recurring notifications: update last_sent_at but keep pending
  UPDATE scheduled_notifications
  SET
    last_sent_at = current_timestamp_utc,
    updated_at = current_timestamp_utc
  WHERE id = ANY(notification_ids)
    AND recurrence IN ('daily', 'weekly')
    AND status = 'pending';

  updated_count := updated_count + ROW_COUNT;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_scheduled_notifications_sent(UUID[]) TO service_role;

-- =============================================================================
-- STEP 3: Update process_due_notifications_internal() function
-- =============================================================================

CREATE OR REPLACE FUNCTION process_due_notifications_internal()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_record RECORD;
  inserted_count INTEGER := 0;
  scheduled_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Get all due notifications
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

    -- Collect scheduled notification IDs to mark as sent
    scheduled_ids := array_append(scheduled_ids, notification_record.scheduled_notification_id);
    inserted_count := inserted_count + 1;
  END LOOP;

  -- Mark all processed notifications as sent
  IF array_length(scheduled_ids, 1) > 0 THEN
    PERFORM mark_scheduled_notifications_sent(scheduled_ids);
    RAISE NOTICE 'Marked % scheduled notification(s) as sent', array_length(scheduled_ids, 1);
  END IF;

  IF inserted_count > 0 THEN
    RAISE NOTICE 'Created % notification(s)', inserted_count;
  END IF;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION process_due_notifications_internal() TO service_role;

COMMENT ON FUNCTION process_due_notifications_internal() IS
  'Processes due scheduled notifications: creates in-app notifications and marks as sent. Runs every 5 minutes via pg_cron.';

-- =============================================================================
-- STEP 4: Drop old mark_task_reminder_sent function (no longer needed)
-- =============================================================================

DROP FUNCTION IF EXISTS mark_task_reminder_sent(UUID[]);
