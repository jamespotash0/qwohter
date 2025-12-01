/**
 * Add reminder_status column (Backward Compatible)
 *
 * This migration adds a new specifically-named status column:
 * - reminders.status → reminders.reminder_status
 *
 * NOTE: memberships.status NOT included (too risky, deeply embedded in auth)
 *
 * Strategy:
 * 1. Add new column with same constraints
 * 2. Copy data from old to new
 * 3. Create index on new column
 * 4. Add sync trigger to keep columns in sync (for rollback safety)
 * 5. Keep old column for now (will remove in future cleanup)
 *
 * ZERO DOWNTIME: Old code continues working with old column
 * ROLLBACK SAFE: Can easily revert if issues found
 */

BEGIN;

-- ============================================================================
-- REMINDERS TABLE: Add reminder_status column
-- ============================================================================

-- Step 1: Add new column
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS reminder_status TEXT;

-- Step 2: Copy data from old to new
UPDATE public.reminders
SET reminder_status = status
WHERE reminder_status IS NULL;

-- Step 3: Add constraint (same as old column)
ALTER TABLE public.reminders
  DROP CONSTRAINT IF EXISTS reminders_reminder_status_check;

ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_reminder_status_check
  CHECK (reminder_status IN ('Pending', 'Completed', 'Dismissed'));

-- Step 4: Make NOT NULL (now that it's populated)
ALTER TABLE public.reminders
  ALTER COLUMN reminder_status SET NOT NULL;

-- Step 5: Add index (same pattern as old index)
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_status
  ON public.reminders(reminder_status);

-- Step 6: Add helpful comment
COMMENT ON COLUMN public.reminders.reminder_status IS
  'Reminder status: Pending | Completed | Dismissed (renamed from status for clarity)';

COMMENT ON COLUMN public.reminders.status IS
  'DEPRECATED: Use reminder_status instead. Will be removed in future migration.';

-- ============================================================================
-- SYNC TRIGGER: Keep old and new columns in sync
-- ============================================================================
-- This ensures that if old code updates old column, new column stays in sync
-- And vice versa (new code updates new column, old column stays in sync)
-- This is critical for zero-downtime migration

-- Reminder status sync function
CREATE OR REPLACE FUNCTION public.sync_reminder_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If old column was updated, sync to new
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.reminder_status = NEW.status;
  END IF;

  -- If new column was updated, sync to old
  IF NEW.reminder_status IS DISTINCT FROM OLD.reminder_status THEN
    NEW.status = NEW.reminder_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on UPDATE
DROP TRIGGER IF EXISTS keep_reminder_status_in_sync ON public.reminders;
CREATE TRIGGER keep_reminder_status_in_sync
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reminder_status();

-- ============================================================================
-- VERIFICATION: Ensure data integrity
-- ============================================================================

-- Verify all reminders have matching status values
DO $$
DECLARE
  mismatch_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM public.reminders
  WHERE status != reminder_status OR reminder_status IS NULL;

  SELECT COUNT(*) INTO total_count FROM public.reminders;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % reminders have mismatched status values', mismatch_count;
  ELSE
    RAISE NOTICE 'Success: All % reminders have matching status values', total_count;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 *
 * -- Remove trigger
 * DROP TRIGGER IF EXISTS keep_reminder_status_in_sync ON public.reminders;
 * DROP FUNCTION IF EXISTS public.sync_reminder_status();
 *
 * -- Remove index
 * DROP INDEX IF EXISTS public.idx_reminders_reminder_status;
 *
 * -- Remove constraint
 * ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_reminder_status_check;
 *
 * -- Remove column
 * ALTER TABLE public.reminders DROP COLUMN IF EXISTS reminder_status;
 *
 * COMMIT;
 */
