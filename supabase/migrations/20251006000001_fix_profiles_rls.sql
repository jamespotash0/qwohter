-- CRITICAL SECURITY FIX: Profiles RLS Policy
--
-- VULNERABILITY: Current policy allows ANY authenticated user to view ALL profiles
-- FIX: Restrict to own profile + same organization members only
--
-- Migration: 20251006000001_fix_profiles_rls.sql
-- Created: 2025-10-06

-- Drop the insecure policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Create secure policy: Users can only view their own profile and profiles of users in their organization
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Profiles of users in same organization (both must have Active status)
  id IN (
    SELECT m2.user_id
    FROM public.memberships m1
    JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid()
    AND m1.status = 'Active'
    AND m2.status = 'Active'
  )
);

-- Add comment for documentation
COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS
'Users can view their own profile and profiles of active members in their organization only';
