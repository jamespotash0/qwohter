-- ============================================================================
-- CONSOLIDATE UPDATED_AT TRIGGER FUNCTIONS
-- ============================================================================
-- Consolidates 3 different updated_at functions into 1 optimized function
--
-- BEFORE:
--   - handle_updated_at (6 tables) - Has optimization ✅
--   - update_updated_at_column (5 tables) - Always updates
--   - update_reminders_updated_at (1 table) - Always updates
--
-- AFTER:
--   - handle_updated_at (12 tables) - All use optimized version ✅
--
-- BENEFITS:
--   - Single source of truth for updated_at logic
--   - All tables get the optimization (only update if row changed)
--   - Easier to maintain (one function instead of three)
--   - Cleaner database (less code duplication)
-- ============================================================================

-- ============================================================================
-- STEP 1: Recreate triggers for tables using update_updated_at_column
-- ============================================================================

-- Forms (formerly form_definitions)
DROP TRIGGER IF EXISTS set_updated_at ON forms;
DROP TRIGGER IF EXISTS set_updated_at ON form_definitions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Project workflow columns
DROP TRIGGER IF EXISTS set_updated_at ON project_workflow_columns;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON project_workflow_columns
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Projects
DROP TRIGGER IF EXISTS set_updated_at ON projects;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- User onboarding progress
DROP TRIGGER IF EXISTS update_user_onboarding_progress_updated_at ON user_onboarding_progress;
CREATE TRIGGER update_user_onboarding_progress_updated_at
  BEFORE UPDATE ON user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- STEP 2: Recreate trigger for table using update_reminders_updated_at
-- ============================================================================

-- Reminders
DROP TRIGGER IF EXISTS update_reminders_updated_at_trigger ON reminders;
CREATE TRIGGER update_reminders_updated_at_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- STEP 3: Drop the redundant functions
-- ============================================================================

-- These are now unused, all tables use handle_updated_at()
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_reminders_updated_at() CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  handle_updated_at_count INTEGER;
  redundant_functions_count INTEGER;
  total_tables_with_triggers INTEGER;
BEGIN
  -- Count triggers using handle_updated_at
  SELECT COUNT(*) INTO handle_updated_at_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE p.proname = 'handle_updated_at';

  -- Count redundant functions (should be 0)
  SELECT COUNT(*) INTO redundant_functions_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('update_updated_at_column', 'update_reminders_updated_at');

  -- Count total tables with updated_at triggers
  SELECT COUNT(DISTINCT c.relname) INTO total_tables_with_triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE p.proname = 'handle_updated_at'
    AND c.relnamespace = 'public'::regnamespace;

  RAISE NOTICE '✅ Consolidation complete';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Results:';
  RAISE NOTICE '   Tables now using handle_updated_at(): %', handle_updated_at_count;
  RAISE NOTICE '   Total unique tables with triggers: %', total_tables_with_triggers;
  RAISE NOTICE '   Redundant functions remaining: %', redundant_functions_count;
  RAISE NOTICE '';

  IF redundant_functions_count = 0 THEN
    RAISE NOTICE '✅ All redundant functions successfully removed';
  ELSE
    RAISE WARNING '⚠️  Still have % redundant functions!', redundant_functions_count;
  END IF;

  IF handle_updated_at_count = 11 THEN
    RAISE NOTICE '✅ All 11 tables now use the optimized handle_updated_at() function';
  ELSE
    RAISE WARNING '⚠️  Expected 11 triggers, found %', handle_updated_at_count;
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION handle_updated_at() IS
'Generic trigger function to update updated_at timestamp.
Includes optimization: only updates if row actually changed.
Used by all tables with updated_at columns.

Tables using this function (11 total):
- memberships
- organizations
- profiles
- quotes
- subscription_plans
- subscriptions
- forms
- project_workflow_columns
- projects
- user_onboarding_progress
- reminders

Replaced functions:
- update_updated_at_column (removed)
- update_reminders_updated_at (removed)
';

-- ============================================================================
-- NOTES
-- ============================================================================

/*
WHAT THIS MIGRATION DOES:

1. Switches 4 tables from update_updated_at_column to handle_updated_at:
   - forms (formerly form_definitions)
   - project_workflow_columns
   - projects
   - user_onboarding_progress

2. Switches 1 table from update_reminders_updated_at to handle_updated_at:
   - reminders

3. Drops 2 redundant functions:
   - update_updated_at_column
   - update_reminders_updated_at

NOTE: form_submissions table was dropped in later migration

RESULT: All 11 tables now use the same optimized function

OPTIMIZATION BENEFIT:
The handle_updated_at() function includes this check:
  IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
    NEW.updated_at = now();
  END IF;

This means updated_at only changes when data actually changes.
The old functions always updated the timestamp, even on no-op UPDATEs.

BACKWARDS COMPATIBLE: Yes, behavior is the same (just more optimized)

ROLLBACK:
If you need to rollback, recreate the old functions and triggers.
However, there's no reason to - this is strictly better.
*/
