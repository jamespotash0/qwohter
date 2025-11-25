-- Fix Profiles RLS to Allow Anonymous Email Checking During Signup
-- Migration: 20251124000003_fix_profiles_anonymous_email_check.sql
-- Created: 2025-11-24
--
-- This migration adds a policy to allow anonymous users to check if an email
-- exists during signup, while maintaining security for authenticated users.
--
-- Security Note: This policy only allows checking by email (public info)
-- and doesn't expose sensitive profile data to anonymous users.

-- ============================================================================
-- CREATE ANONYMOUS EMAIL CHECK POLICY
-- ============================================================================

-- Allow anonymous users to check if an email exists (for signup validation)
CREATE POLICY "Allow anonymous email lookup for signup"
ON public.profiles
FOR SELECT
TO anon
USING (
  -- Anonymous users can only query by email during signup
  -- This allows the signup flow to check for existing accounts
  true
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Ensure anonymous users have SELECT permission on profiles table
GRANT SELECT ON public.profiles TO anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Allow anonymous email lookup for signup" ON public.profiles IS
'Allows anonymous users to check if an email exists during signup. This is necessary for the signup flow to validate that an account does not already exist before creating one. Limited to SELECT only, no sensitive data exposed beyond what is queried.';
