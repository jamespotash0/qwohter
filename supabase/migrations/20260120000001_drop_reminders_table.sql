-- Migration: Drop deprecated reminders table
-- Description: Removes the reminders table after data has been migrated to project_tasks
--
-- IMPORTANT: Only run this AFTER verifying the migration in 20260119000002 worked correctly!
-- Check that all reminders have been migrated to project_tasks before running this.
--
-- Verification query (run this first):
-- SELECT COUNT(*) as original_reminders FROM reminders;
-- SELECT COUNT(*) as migrated_tasks FROM project_tasks WHERE remind_before_days IS NOT NULL;

-- =============================================================================
-- SAFETY CHECK: Verify migration completed
-- =============================================================================
DO $$
DECLARE
  reminder_count INTEGER;
  task_reminder_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reminder_count FROM reminders;
  SELECT COUNT(*) INTO task_reminder_count FROM project_tasks WHERE remind_before_days IS NOT NULL;

  IF reminder_count > 0 AND task_reminder_count = 0 THEN
    RAISE EXCEPTION 'Migration appears incomplete! Found % reminders but no migrated tasks. Run 20260119000002 first.', reminder_count;
  END IF;

  RAISE NOTICE 'Safety check passed. Original reminders: %, Tasks with reminders: %', reminder_count, task_reminder_count;
END $$;

-- =============================================================================
-- Drop indexes first
-- =============================================================================
DROP INDEX IF EXISTS idx_reminders_organization_id;
DROP INDEX IF EXISTS idx_reminders_created_by;
DROP INDEX IF EXISTS idx_reminders_quote_id;
DROP INDEX IF EXISTS idx_reminders_due_date;
DROP INDEX IF EXISTS idx_reminders_status;

-- =============================================================================
-- Drop any triggers
-- =============================================================================
DROP TRIGGER IF EXISTS set_reminders_updated_at ON reminders;

-- =============================================================================
-- Drop the reminders table
-- =============================================================================
DROP TABLE IF EXISTS reminders CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Reminders table has been dropped. Task reminders are now managed in project_tasks.';
END $$;
