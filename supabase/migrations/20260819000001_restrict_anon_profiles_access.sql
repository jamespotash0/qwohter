-- Migration: Replace the blanket anon read on profiles with a scoped RPC
--
-- The policy "Allow anonymous email lookup for signup" was
--   FOR SELECT TO anon USING (true)
-- which is a full-table read, not an existence check. It let anyone holding
-- the anon key -- which ships in the frontend bundle and is public by design --
-- read every profile's email, full_name and is_super_admin.
--
-- It existed for exactly one caller: the duplicate-email pre-check in
-- src/utils/authFlowHelpers.ts. The onboarding org lookup does NOT depend on
-- it: determineOnboardingStep() runs only after authentication, and its
-- membership/organization hops are anon-denied anyway. Pre-validation org
-- resolution goes through validate_invite_token(), which is already scoped.
--
-- This swaps the table read for a SECURITY DEFINER function returning a single
-- boolean -- the same pattern already used by validate_invite_token,
-- validate_signup_invite, validate_admin_invite and the check_*_rate_limit
-- family.
--
-- NOTE: this remains an email-enumeration oracle by design, exactly as the
-- policy was. It no longer returns names, super-admin flags, or the table.
-- To close enumeration entirely, drop the pre-check and let Supabase Auth
-- handle duplicates -- the caller already has a fallback path for that.

-- ============================================================
-- 1. Scoped replacement
-- ============================================================

CREATE OR REPLACE FUNCTION public.email_is_registered(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(email) = lower(p_email)
  );
$$;

COMMENT ON FUNCTION public.email_is_registered(text)
  IS 'Signup duplicate-email pre-check. Returns a boolean only. Replaces the '
     'blanket anon SELECT policy that previously exposed every profile row.';

-- Default privileges grant EXECUTE to PUBLIC on new functions; revoke first so
-- the grant below is the only path in.
REVOKE ALL ON FUNCTION public.email_is_registered(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.email_is_registered(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_is_registered(text) TO anon, authenticated;

-- ============================================================
-- 2. Remove the blanket read
-- ============================================================
--
-- Run this only after the frontend change in authFlowHelpers.ts is deployed.
-- Dropping it first makes the pre-check fail, which is handled gracefully --
-- signup still works, the duplicate message just becomes less specific.

DROP POLICY IF EXISTS "Allow anonymous email lookup for signup" ON public.profiles;

-- Verify afterwards: this must return zero rows.
--
--   SELECT polname, polroles::regrole[]
--   FROM pg_policy
--   WHERE polrelid = 'public.profiles'::regclass
--     AND 'anon'::regrole = ANY (polroles);
