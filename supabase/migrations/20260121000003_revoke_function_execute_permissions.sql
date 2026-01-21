-- Migration: Revoke Function Execute Permissions
-- Description: Security hardening - restrict internal/admin functions to service_role only
--
-- Functions are public by default in PostgreSQL. This migration restricts
-- sensitive functions to prevent unauthorized access.
--
-- NOTE: Uses dynamic SQL to handle functions that may not exist or have different signatures.
-- Each REVOKE is wrapped in exception handling to prevent migration failures.

-- =============================================================================
-- Helper function to safely revoke permissions (handles missing functions)
-- =============================================================================
CREATE OR REPLACE FUNCTION _temp_safe_revoke(func_pattern TEXT, roles TEXT[])
RETURNS void AS $$
DECLARE
  func_record RECORD;
  revoke_sql TEXT;
  role_name TEXT;
BEGIN
  -- Find all functions matching the pattern
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname LIKE func_pattern
  LOOP
    FOREACH role_name IN ARRAY roles
    LOOP
      BEGIN
        revoke_sql := format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM %I',
          func_record.proname, func_record.args, role_name);
        EXECUTE revoke_sql;
      EXCEPTION WHEN OTHERS THEN
        -- Log but don't fail - function may not have this grant
        RAISE NOTICE 'Could not revoke % on %.%(%): %',
          role_name, 'public', func_record.proname, func_record.args, SQLERRM;
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper function to safely grant permissions (handles missing functions)
CREATE OR REPLACE FUNCTION _temp_safe_grant(func_pattern TEXT, grant_role TEXT)
RETURNS void AS $$
DECLARE
  func_record RECORD;
  grant_sql TEXT;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname LIKE func_pattern
  LOOP
    BEGIN
      grant_sql := format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO %I',
        func_record.proname, func_record.args, grant_role);
      EXECUTE grant_sql;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not grant % on %.%(%): %',
        grant_role, 'public', func_record.proname, func_record.args, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SECTION 1: Cleanup/Cron Functions (service_role only)
-- These run as scheduled jobs or internal maintenance - safe to restrict
-- =============================================================================

SELECT _temp_safe_revoke('cleanup_expired_invite_tokens', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_invite_tokens', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_invite_token_attempts', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_old_invite_attempts', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_organization_creation_log', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_all_rate_limiting_logs', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_org_rate_limits', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_auth_rate_limits', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_expired_rate_limits', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_unverified_profiles', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_expired_onboarding', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('cleanup_old_qb_requests', ARRAY['public', 'anon', 'authenticated']);

-- Explicitly grant to service_role
SELECT _temp_safe_grant('cleanup_expired_invite_tokens', 'service_role');
SELECT _temp_safe_grant('cleanup_invite_tokens', 'service_role');
SELECT _temp_safe_grant('cleanup_invite_token_attempts', 'service_role');
SELECT _temp_safe_grant('cleanup_old_invite_attempts', 'service_role');
SELECT _temp_safe_grant('cleanup_organization_creation_log', 'service_role');
SELECT _temp_safe_grant('cleanup_all_rate_limiting_logs', 'service_role');
SELECT _temp_safe_grant('cleanup_org_rate_limits', 'service_role');
SELECT _temp_safe_grant('cleanup_auth_rate_limits', 'service_role');
SELECT _temp_safe_grant('cleanup_expired_rate_limits', 'service_role');
SELECT _temp_safe_grant('cleanup_unverified_profiles', 'service_role');
SELECT _temp_safe_grant('cleanup_expired_onboarding', 'service_role');
SELECT _temp_safe_grant('cleanup_old_qb_requests', 'service_role');

-- =============================================================================
-- SECTION 2: Notification/Cron Functions (service_role only)
-- These are called by pg_cron or edge functions
-- Uses dynamic lookup to handle varying function signatures
-- =============================================================================

SELECT _temp_safe_revoke('process_due_notifications_internal', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('check_due_notifications', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('mark_scheduled_notifications_sent', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('mark_task_reminder_sent', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('invoke_notification_email_edge_function', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('process_all_due_notifications', ARRAY['public', 'anon', 'authenticated']);

-- Explicitly grant to service_role
SELECT _temp_safe_grant('process_due_notifications_internal', 'service_role');
SELECT _temp_safe_grant('check_due_notifications', 'service_role');
SELECT _temp_safe_grant('mark_scheduled_notifications_sent', 'service_role');
SELECT _temp_safe_grant('mark_task_reminder_sent', 'service_role');
SELECT _temp_safe_grant('invoke_notification_email_edge_function', 'service_role');
SELECT _temp_safe_grant('process_all_due_notifications', 'service_role');

-- =============================================================================
-- SECTION 3: Admin/Billing Functions (service_role only)
-- These manage billing state and should never be called by users
-- =============================================================================

SELECT _temp_safe_revoke('block_access', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('restore_access', ARRAY['public', 'anon', 'authenticated']);

-- Explicitly grant to service_role
SELECT _temp_safe_grant('block_access', 'service_role');
SELECT _temp_safe_grant('restore_access', 'service_role');

-- =============================================================================
-- SECTION 4: Security/Logging Functions (service_role only)
-- Internal security infrastructure
-- =============================================================================

SELECT _temp_safe_revoke('log_security_event', ARRAY['public', 'anon', 'authenticated']);
SELECT _temp_safe_revoke('enforce_query_limit', ARRAY['public', 'anon', 'authenticated']);

-- Explicitly grant to service_role
SELECT _temp_safe_grant('log_security_event', 'service_role');
SELECT _temp_safe_grant('enforce_query_limit', 'service_role');

-- =============================================================================
-- SECTION 5: Internal Schema Functions (restrict internal schema)
-- =============================================================================

-- If internal schema exists, restrict it entirely and grant to service_role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'internal') THEN
    REVOKE ALL ON SCHEMA internal FROM public, anon, authenticated;
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA internal FROM public, anon, authenticated;
    -- Grant access to service_role
    GRANT ALL ON SCHEMA internal TO service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA internal TO service_role;
  END IF;
END $$;

-- =============================================================================
-- SECTION 6: Functions that should be authenticated-only (not anon)
-- These require a logged-in user but shouldn't be callable anonymously
-- Uses dynamic lookup to handle varying function signatures
-- =============================================================================

-- Member management (already has internal checks, but add defense in depth)
SELECT _temp_safe_revoke('approve_member', ARRAY['anon']);
SELECT _temp_safe_revoke('reject_member', ARRAY['anon']);
SELECT _temp_safe_revoke('update_member_role', ARRAY['anon']);
SELECT _temp_safe_revoke('transfer_ownership', ARRAY['anon']);

-- Organization creation (must be authenticated)
SELECT _temp_safe_revoke('create_org_with_owner', ARRAY['anon']);

-- Notification scheduling (must be authenticated)
SELECT _temp_safe_revoke('schedule_notification', ARRAY['anon']);
SELECT _temp_safe_revoke('cancel_scheduled_notification', ARRAY['anon']);

-- =============================================================================
-- SECTION 7: Add comments documenting security decisions (dynamic)
-- =============================================================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Add comment to cleanup_expired_invite_tokens if it exists
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'cleanup_expired_invite_tokens'
  LOOP
    EXECUTE format('COMMENT ON FUNCTION public.%I(%s) IS %L',
      func_record.proname, func_record.args,
      'Security: Internal cron function. EXECUTE revoked from all roles except service_role.');
  END LOOP;

  -- Add comment to process_due_notifications_internal if it exists
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'process_due_notifications_internal'
  LOOP
    EXECUTE format('COMMENT ON FUNCTION public.%I(%s) IS %L',
      func_record.proname, func_record.args,
      'Security: Internal cron function for processing notifications. EXECUTE revoked from all roles except service_role.');
  END LOOP;

  -- Add comment to block_access if it exists
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'block_access'
  LOOP
    EXECUTE format('COMMENT ON FUNCTION public.%I(%s) IS %L',
      func_record.proname, func_record.args,
      'Security: Admin-only billing function. EXECUTE revoked from all roles except service_role.');
  END LOOP;

  -- Add comment to log_security_event if it exists
  FOR func_record IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'log_security_event'
  LOOP
    EXECUTE format('COMMENT ON FUNCTION public.%I(%s) IS %L',
      func_record.proname, func_record.args,
      'Security: Internal logging function. EXECUTE revoked from all roles except service_role.');
  END LOOP;
END $$;

-- =============================================================================
-- CLEANUP: Remove temporary helper functions
-- =============================================================================

DROP FUNCTION IF EXISTS _temp_safe_revoke(TEXT, TEXT[]);
DROP FUNCTION IF EXISTS _temp_safe_grant(TEXT, TEXT);
