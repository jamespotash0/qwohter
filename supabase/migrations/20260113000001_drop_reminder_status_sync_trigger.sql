-- ============================================================================
-- DROP REMINDER STATUS SYNC TRIGGER
-- ============================================================================
-- The old `status` column was removed from the reminders table, but the
-- sync trigger still references it, causing "record has no field status" errors.
-- This migration removes the obsolete trigger and function.
-- ============================================================================

-- Drop the trigger that references the non-existent status column
DROP TRIGGER IF EXISTS keep_reminder_status_in_sync ON public.reminders;
DROP TRIGGER IF EXISTS trigger_sync_reminder_status ON public.reminders;

-- Drop the sync function as it's no longer needed
DROP FUNCTION IF EXISTS public.sync_reminder_status() CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  -- Verify trigger is dropped
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'keep_reminder_status_in_sync'
    AND tgrelid = 'public.reminders'::regclass
  ) THEN
    RAISE NOTICE '✅ Trigger keep_reminder_status_in_sync dropped successfully';
  ELSE
    RAISE WARNING '⚠️ Trigger keep_reminder_status_in_sync still exists';
  END IF;

  -- Verify function is dropped
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'sync_reminder_status'
  ) THEN
    RAISE NOTICE '✅ Function sync_reminder_status dropped successfully';
  ELSE
    RAISE WARNING '⚠️ Function sync_reminder_status still exists';
  END IF;
END $$;
