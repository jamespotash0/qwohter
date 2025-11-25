-- ============================================================================
-- VERIFICATION SCRIPT - Run in BOTH Production and Staging
-- ============================================================================
-- This script checks your database setup to ensure everything is in place
-- Run in PRODUCTION first, save the output
-- Then run in STAGING and compare the results
-- ============================================================================

-- ============================================================================
-- 1. COUNT ALL OBJECTS
-- ============================================================================

SELECT 'SUMMARY' as check_type,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as tables,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f') as functions,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname NOT LIKE 'pg_%') as triggers,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policies;

-- ============================================================================
-- 2. LIST ALL TABLES
-- ============================================================================

SELECT 'TABLES' as check_type, tablename as name,
  CASE WHEN rowsecurity THEN 'YES' ELSE 'NO' END as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 3. LIST ALL FUNCTIONS (Essential ones)
-- ============================================================================

SELECT 'FUNCTIONS' as check_type, proname as name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND proname IN (
    -- Trigger functions
    'handle_user_deletion',
    'update_quote_creator_name_on_profile_change',
    'normalize_membership_role',
    'normalize_membership_status',
    'sync_subscription_user_count',
    'set_owner_department',
    'update_quote_creator_name_on_membership_change',
    'update_active_user_count',
    'create_workflow_columns_for_new_org',
    'create_default_workflow_columns',
    'mark_stripe_quantity_for_sync',
    'update_subscription_is_active',
    'check_quote_is_main_version_and_won',
    'ensure_single_main_version',
    'increment_quote_version',
    'normalize_quote_status',
    'track_quote_status_change',
    'sync_projects_from_is_on_board',
    'set_quote_creator_name',
    'sync_project_on_quote_status_change',
    'update_quote_analytics_fields',
    'sync_quote_on_board_status',
    'sync_reminder_status',
    'cleanup_expired_invite_tokens',
    'handle_updated_at',
    -- RLS helper functions
    'is_active_member',
    'has_org_role',
    'can_view_membership',
    'is_owner_or_admin',
    'get_current_user_organization',
    'get_current_user_role',
    'get_org_member_ids',
    'has_valid_subscription',
    'user_has_admin_role_in_org',
    'user_has_role_in_org',
    'get_user_org_ids',
    'is_org_folder_admin',
    'get_user_org_folders'
  )
ORDER BY proname;

-- ============================================================================
-- 4. LIST ALL TRIGGERS
-- ============================================================================

SELECT 'TRIGGERS' as check_type,
  tgname as trigger_name,
  tgrelid::regclass::text as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname NOT LIKE 'pg_%'
ORDER BY table_name, trigger_name;

-- ============================================================================
-- 5. COUNT POLICIES PER TABLE
-- ============================================================================

SELECT 'POLICIES' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 6. CHECK FOR MISSING FUNCTIONS (Expected vs Actual)
-- ============================================================================

WITH expected_functions AS (
  SELECT unnest(ARRAY[
    'handle_user_deletion',
    'update_quote_creator_name_on_profile_change',
    'normalize_membership_role',
    'normalize_membership_status',
    'sync_subscription_user_count',
    'set_owner_department',
    'update_quote_creator_name_on_membership_change',
    'update_active_user_count',
    'create_workflow_columns_for_new_org',
    'create_default_workflow_columns',
    'mark_stripe_quantity_for_sync',
    'update_subscription_is_active',
    'check_quote_is_main_version_and_won',
    'ensure_single_main_version',
    'increment_quote_version',
    'normalize_quote_status',
    'track_quote_status_change',
    'sync_projects_from_is_on_board',
    'set_quote_creator_name',
    'sync_project_on_quote_status_change',
    'update_quote_analytics_fields',
    'sync_quote_on_board_status',
    'sync_reminder_status',
    'cleanup_expired_invite_tokens',
    'handle_updated_at',
    'is_active_member',
    'has_org_role',
    'can_view_membership',
    'is_owner_or_admin',
    'get_current_user_organization',
    'get_current_user_role',
    'get_org_member_ids',
    'has_valid_subscription',
    'user_has_admin_role_in_org',
    'user_has_role_in_org',
    'get_user_org_ids',
    'is_org_folder_admin',
    'get_user_org_folders'
  ]) as function_name
),
actual_functions AS (
  SELECT proname as function_name
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prokind = 'f'
)
SELECT 'MISSING_FUNCTIONS' as check_type, e.function_name
FROM expected_functions e
LEFT JOIN actual_functions a ON e.function_name = a.function_name
WHERE a.function_name IS NULL
ORDER BY e.function_name;

-- ============================================================================
-- 7. CHECK FOR TABLES WITHOUT RLS ENABLED
-- ============================================================================

SELECT 'TABLES_WITHOUT_RLS' as check_type, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- ============================================================================
-- 8. CHECK FOR TABLES WITHOUT POLICIES
-- ============================================================================

WITH all_tables AS (
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
),
tables_with_policies AS (
  SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
)
SELECT 'TABLES_WITHOUT_POLICIES' as check_type, t.tablename
FROM all_tables t
LEFT JOIN tables_with_policies p ON t.tablename = p.tablename
WHERE p.tablename IS NULL
  AND t.tablename NOT IN ('subscription_plans') -- subscription_plans is read-only
ORDER BY t.tablename;

-- ============================================================================
-- 9. VERIFY CRITICAL TABLES EXIST
-- ============================================================================

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'organizations',
    'memberships',
    'subscriptions',
    'subscription_plans',
    'quotes',
    'projects',
    'reminders',
    'quote_status_transitions',
    'quote_activities',
    'project_workflow_columns',
    'subscription_seat_usage_events',
    'organization_creation_log',
    'user_onboarding_progress',
    'invite_tokens'
  ]) as table_name
),
actual_tables AS (
  SELECT tablename as table_name FROM pg_tables WHERE schemaname = 'public'
)
SELECT 'MISSING_TABLES' as check_type, e.table_name
FROM expected_tables e
LEFT JOIN actual_tables a ON e.table_name = a.table_name
WHERE a.table_name IS NULL
ORDER BY e.table_name;

-- ============================================================================
-- 10. FINAL HEALTH CHECK
-- ============================================================================

SELECT 'HEALTH_CHECK' as check_type,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') >= 15 THEN '✅'
    ELSE '❌'
  END as tables_ok,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f') >= 38 THEN '✅'
    ELSE '❌'
  END as functions_ok,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_trigger WHERE tgname NOT LIKE 'pg_%') >= 30 THEN '✅'
    ELSE '❌'
  END as triggers_ok,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 58 THEN '✅'
    ELSE '❌'
  END as policies_ok,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false) = 0 THEN '✅'
    ELSE '❌'
  END as rls_ok;

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run this entire script in PRODUCTION Supabase SQL Editor
-- 2. Save the output
-- 3. Run this entire script in STAGING Supabase SQL Editor
-- 4. Compare the outputs
-- 5. Look for any differences in the MISSING_* sections
-- 6. Check that HEALTH_CHECK shows all ✅ in STAGING
-- ============================================================================
