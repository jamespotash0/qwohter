-- Migration: Setup cron jobs for notification system
-- This creates hourly jobs to:
-- 1. Check for due reminders and tasks (in-app notifications)
-- 2. Process notification digests (email notifications)
--
-- IMPORTANT: For email notifications, you need to set up Edge Function scheduling
-- in Supabase Dashboard or use an external cron service. See instructions below.

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================================================
-- Function: Process due notifications and create in-app notifications
-- This runs locally in the database for in-app notifications
-- =============================================================================

CREATE OR REPLACE FUNCTION process_due_notifications_internal()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_record RECORD;
  inserted_count INTEGER := 0;
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
  END LOOP;

  IF inserted_count > 0 THEN
    RAISE NOTICE 'Created % due notification(s)', inserted_count;
  END IF;

  RETURN inserted_count;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION process_due_notifications_internal() TO service_role;

COMMENT ON FUNCTION process_due_notifications_internal() IS
  'Creates in-app notifications for due reminders and tasks. Runs hourly via pg_cron.';

-- =============================================================================
-- Cron Job: Process due notifications hourly (in-app only)
-- Creates in-app notifications for due reminders and tasks
-- =============================================================================

SELECT cron.schedule(
  'process-due-notifications',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT process_due_notifications_internal()$$
);

-- =============================================================================
-- EMAIL NOTIFICATION SETUP INSTRUCTIONS
-- =============================================================================
--
-- For email notifications, you need to schedule the following Edge Functions:
--
-- 1. check-due-notifications (Hourly at :05)
--    - Checks for due reminders and tasks
--    - Sends emails or queues for digest based on user preferences
--    - Schedule: 5 * * * * (every hour at minute 5)
--
-- 2. process-notification-digest (Hourly at :00)
--    - Processes queued notifications for daily digest
--    - Sends batched emails at users' configured digest times
--    - Schedule: 0 * * * * (every hour at minute 0)
--
-- OPTION A: Supabase Dashboard (Recommended for Production)
-- ---------------------------------------------------------
-- 1. Go to Supabase Dashboard > Edge Functions
-- 2. Click on "check-due-notifications"
-- 3. Click "Add Schedule" and set cron: 5 * * * *
-- 4. Repeat for "process-notification-digest" with cron: 0 * * * *
--
-- OPTION B: pg_net Extension (Alternative)
-- ----------------------------------------
-- If you want to use pg_net for HTTP calls, run these commands manually
-- after replacing YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY:
--
-- CREATE EXTENSION IF NOT EXISTS pg_net;
--
-- SELECT cron.schedule(
--   'check-due-notifications-email',
--   '5 * * * *',
--   $$SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-due-notifications',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );
--
-- SELECT cron.schedule(
--   'process-notification-digest-email',
--   '0 * * * *',
--   $$SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-notification-digest',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );
--
-- OPTION C: External Cron Service (GitHub Actions, etc.)
-- ------------------------------------------------------
-- You can use GitHub Actions or another cron service to call the Edge Functions.
-- See: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
--
-- =============================================================================
