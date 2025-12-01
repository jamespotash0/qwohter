-- ============================================================================
-- CLEANUP ORPHANED TRIGGER FUNCTIONS - INVESTIGATION SCRIPT
-- ============================================================================
-- This script helps you investigate orphaned trigger functions.
--
-- ✅ A MIGRATION HAS ALREADY BEEN CREATED FOR THE 4 IDENTIFIED ORPHANED FUNCTIONS
-- See: supabase/migrations/20251103000007_cleanup_orphaned_trigger_functions.sql
--
-- Use this script if you need to investigate other orphaned functions in the future.
--
-- ⚠️ IMPORTANT: Review each section before running!
-- ⚠️ BACKUP YOUR DATABASE FIRST: pg_dump your_database > backup.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY THESE ARE TRULY ORPHANED
-- ============================================================================
-- Run this query first to confirm no triggers are using these functions:

SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name,
  c.relname AS table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE p.proname IN (
  'create_project_on_quote_won',
  'sync_profile_email',
  'update_dashboard_configurations_updated_at',
  'update_product_series_timestamp'
);

-- Expected result: 0 rows (meaning no triggers use these functions)

-- ============================================================================
-- STEP 2: VERIFY REPLACEMENTS EXIST
-- ============================================================================

-- Check that the NEW project sync function exists and is being used:
SELECT
  t.tgname AS trigger_name,
  p.proname AS function_name,
  c.relname AS table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE p.proname = 'sync_project_on_quote_status_change';

-- Expected result: 1 row showing 'trigger_sync_project_on_quote_status_change' on 'quotes' table

-- ============================================================================
-- STEP 3: SAFE REMOVAL (one at a time for safety)
-- ============================================================================

-- 1. Remove old project creation function (replaced by sync_project_on_quote_status_change)
-- ✅ SAFE - This was explicitly replaced in migration 20251008000000
DROP FUNCTION IF EXISTS create_project_on_quote_won() CASCADE;

-- Verification:
-- Should see: NOTICE: drop cascades to... (if anything was depending on it)
-- Should NOT see any errors about breaking active triggers

-- ============================================================================

-- 2. Remove unused profile email sync function
-- ⚠️ CHECK FIRST - Verify email syncing still works via handle_auth_user_email_sync()
-- To verify, check that this function and trigger exist:
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'handle_auth_user_email_sync';

-- If the above returns 1 row, it's safe to remove sync_profile_email:
DROP FUNCTION IF EXISTS sync_profile_email() CASCADE;

-- ============================================================================

-- 3. Dashboard configurations updated_at function
-- ⚠️ CAUTION - Check if dashboard_configurations table needs updated_at automation

-- First, check if table exists and has updated_at column:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dashboard_configurations'
  AND column_name = 'updated_at';

-- If table doesn't exist or doesn't need auto-updating, safe to remove:
-- DROP FUNCTION IF EXISTS update_dashboard_configurations_updated_at() CASCADE;

-- ⚠️ RECOMMENDED: Keep this commented until you verify dashboard_configurations
-- doesn't need this trigger. If the table exists and needs auto-updating,
-- you should CREATE a trigger for this function instead of dropping it!

-- ============================================================================

-- 4. Product series timestamp function
-- ⚠️ CAUTION - Check if product_series table needs timestamp automation

-- First, check if table exists and has updated_at column:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product_series'
  AND column_name IN ('updated_at', 'timestamp');

-- If table doesn't exist or doesn't need auto-updating, safe to remove:
-- DROP FUNCTION IF EXISTS update_product_series_timestamp() CASCADE;

-- ⚠️ RECOMMENDED: Keep this commented until you verify product_series
-- doesn't need this trigger. If the table exists and needs auto-updating,
-- you should CREATE a trigger for this function instead of dropping it!

-- ============================================================================
-- STEP 4: VERIFICATION AFTER CLEANUP
-- ============================================================================

-- List all remaining trigger functions:
SELECT
  p.proname AS function_name,
  COUNT(t.tgname) AS trigger_count,
  STRING_AGG(t.tgname, ', ') AS triggers_using_it
FROM pg_proc p
LEFT JOIN pg_trigger t ON t.tgfoid = p.oid
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prorettype = 'trigger'::regtype
GROUP BY p.proname
ORDER BY trigger_count DESC, p.proname;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
SAFE TO REMOVE IMMEDIATELY:
✅ create_project_on_quote_won - Replaced by sync_project_on_quote_status_change
✅ sync_profile_email - Never used, email sync handled by handle_auth_user_email_sync

NEEDS INVESTIGATION:
❓ update_dashboard_configurations_updated_at - May need to CREATE trigger instead of DROP
❓ update_product_series_timestamp - May need to CREATE trigger instead of DROP

REASONING:
- If these functions exist but have no triggers, it could mean:
  1. The functions were created but triggers were forgotten (BUG - should create trigger)
  2. The functions are truly unused (SAFE - can drop)

To decide, check:
- Does the table exist?
- Does it have an updated_at/timestamp column?
- Do you want automatic timestamp updates?

If YES to all, CREATE a trigger instead of dropping the function!

Example:
CREATE TRIGGER update_dashboard_configurations_timestamp
  BEFORE UPDATE ON dashboard_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_configurations_updated_at();
*/

-- ============================================================================
-- EXECUTION SUMMARY
-- ============================================================================

-- Run these queries in this order:
-- 1. STEP 1 verification query (should return 0 rows)
-- 2. STEP 2 verification query (should return 1 row)
-- 3. DROP create_project_on_quote_won() - SAFE
-- 4. DROP sync_profile_email() - SAFE (after verifying handle_auth_user_email_sync exists)
-- 5. Investigate dashboard_configurations and product_series tables
-- 6. Either DROP or CREATE TRIGGER for the last two functions
-- 7. Run STEP 4 verification to see final state

-- ============================================================================
