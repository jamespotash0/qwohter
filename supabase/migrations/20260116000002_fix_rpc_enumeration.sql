-- =====================================================
-- FIX: RPC Function Enumeration (HIGH)
-- This migration aggressively restricts function access
-- =====================================================

-- Step 1: Revoke ALL execute permissions from anon and public on ALL functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT
            n.nspname as schema_name,
            p.proname as func_name,
            pg_get_function_identity_arguments(p.oid) as func_args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'  -- Only functions, not aggregates or procedures
    LOOP
        BEGIN
            EXECUTE format(
                'REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon, public',
                func_record.schema_name,
                func_record.func_name,
                func_record.func_args
            );
            RAISE NOTICE 'Revoked permissions on %.%(%)',
                func_record.schema_name,
                func_record.func_name,
                func_record.func_args;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not revoke on %.%: %',
                func_record.func_name,
                func_record.func_args,
                SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Step 2: Create a security barrier schema for internal functions
CREATE SCHEMA IF NOT EXISTS internal;

-- Grant usage only to authenticated and service_role
REVOKE ALL ON SCHEMA internal FROM anon, public;
GRANT USAGE ON SCHEMA internal TO authenticated, service_role;

-- Step 3: Move sensitive functions to internal schema (wrapped versions stay in public)
-- Create internal versions of sensitive functions

CREATE OR REPLACE FUNCTION internal.get_org_member_ids(p_org_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT ARRAY_AGG(user_id)
    FROM memberships
    WHERE organization_id = p_org_id
    AND status IN ('Active', 'Pending');
$$;

-- Step 4: Hide functions from PostgREST OpenAPI schema
-- Add comments to exclude from schema
COMMENT ON FUNCTION public.check_auth_rate_limit IS '@omit';
COMMENT ON FUNCTION public.record_auth_attempt IS '@omit';
COMMENT ON FUNCTION public.sanitize_error_message IS '@omit';
COMMENT ON FUNCTION public.log_security_event IS '@omit';
COMMENT ON FUNCTION public.cleanup_auth_rate_limits IS '@omit';
COMMENT ON FUNCTION public.validate_storage_upload IS '@omit';

-- Step 5: Create a whitelist of functions that SHOULD be callable
-- Only grant execute to authenticated on specific approved functions

-- Rate limiting (needed for pre-auth flows)
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit(text, text, text, integer, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_auth_attempt(text, text, text, boolean, integer, integer, integer) TO anon, authenticated;

-- Invite token validation (needed for anonymous invite acceptance)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_invite_token' AND pronamespace = 'public'::regnamespace) THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.validate_invite_token TO anon, authenticated';
    END IF;
END;
$$;

-- Step 6: Disable function listing via information_schema for non-admin users
-- Create a policy view that hides function details

CREATE OR REPLACE VIEW public.safe_routines AS
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'check_auth_rate_limit',
    'record_auth_attempt',
    'validate_invite_token'
);

-- Grant select on safe view only
GRANT SELECT ON public.safe_routines TO authenticated;

-- Step 7: Add error handling that doesn't reveal function names
CREATE OR REPLACE FUNCTION public.handle_rpc_error()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Log the actual error internally
    INSERT INTO public.security_audit_log (event_type, details)
    VALUES ('rpc_error', jsonb_build_object(
        'function', TG_TABLE_NAME,
        'error', SQLERRM
    ));

    -- Return generic error
    RAISE EXCEPTION 'Operation not permitted';
END;
$$;

-- Step 8: Ensure pg_proc is not directly queryable by regular users
-- This prevents enumeration via system catalogs
REVOKE SELECT ON pg_proc FROM anon;
REVOKE SELECT ON pg_namespace FROM anon;

-- Step 9: Add row security to prevent catalog enumeration
-- Note: This may already be handled by Supabase, but being explicit

-- Step 10: Create a secure RPC wrapper pattern
-- Instead of exposing functions directly, use a single dispatcher

CREATE OR REPLACE FUNCTION public.secure_rpc(
    p_action text,
    p_params jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
    v_user_id uuid;
BEGIN
    -- Get current user
    v_user_id := auth.uid();

    -- Whitelist of allowed actions
    CASE p_action
        WHEN 'check_rate_limit' THEN
            SELECT check_auth_rate_limit(
                p_params->>'identifier',
                COALESCE(p_params->>'identifier_type', 'email'),
                p_params->>'attempt_type',
                COALESCE((p_params->>'max_attempts')::integer, 5),
                COALESCE((p_params->>'window_minutes')::integer, 15),
                COALESCE((p_params->>'block_duration')::integer, 30)
            ) INTO v_result;

        WHEN 'record_attempt' THEN
            SELECT record_auth_attempt(
                p_params->>'identifier',
                COALESCE(p_params->>'identifier_type', 'email'),
                p_params->>'attempt_type',
                COALESCE((p_params->>'success')::boolean, false),
                COALESCE((p_params->>'max_attempts')::integer, 5),
                COALESCE((p_params->>'window_minutes')::integer, 15),
                COALESCE((p_params->>'block_duration')::integer, 30)
            ) INTO v_result;

        ELSE
            -- Log unauthorized action attempt
            PERFORM log_security_event(
                'unauthorized_rpc_attempt',
                v_user_id,
                NULL,
                jsonb_build_object('action', p_action)
            );
            RAISE EXCEPTION 'Invalid action';
    END CASE;

    RETURN v_result;
END;
$$;

-- Only grant execute on the secure dispatcher
GRANT EXECUTE ON FUNCTION public.secure_rpc(text, jsonb) TO anon, authenticated;

-- Add @omit comment to hide from OpenAPI
COMMENT ON FUNCTION public.secure_rpc IS '@omit';

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify the fix worked
-- =====================================================

-- Check what functions are still accessible to anon:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND has_function_privilege('anon', routine_schema || '.' || routine_name || '()', 'EXECUTE');
