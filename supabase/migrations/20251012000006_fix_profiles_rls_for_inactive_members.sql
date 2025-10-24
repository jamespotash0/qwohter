-- Fix Profiles RLS to Allow Viewing Inactive Members
-- Migration: 20251012000006_fix_profiles_rls_for_inactive_members.sql
-- Created: 2025-10-12
--
-- This migration updates the profiles RLS policy to allow viewing profiles
-- of all members in the organization, including inactive ones

-- ============================================================================
-- DROP OLD POLICY
-- ============================================================================

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

-- ============================================================================
-- CREATE NEW POLICY USING MEMBERSHIPS
-- ============================================================================

CREATE POLICY "Users can view profiles in their organization"
ON public.profiles
FOR SELECT
USING (
  -- Allow viewing own profile
  id = auth.uid()
  OR
  -- Allow viewing profiles of users in the same organization (via memberships)
  EXISTS (
    SELECT 1
    FROM public.memberships m1
    JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid()
      AND m1.status = 'Active'  -- Current user must be active
      AND m2.user_id = profiles.id  -- The profile being viewed
      -- Don't filter by m2.status - allow viewing inactive members too
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view profiles in their organization" ON public.profiles IS
'Allows active members to view profiles of all members in their organization, including inactive members, for admin/audit purposes';
