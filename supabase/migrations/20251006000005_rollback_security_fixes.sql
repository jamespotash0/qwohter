-- ROLLBACK SECURITY FIXES - Fix Stack Depth Recursion
--
-- The new RLS policies are causing infinite recursion because they query
-- tables that also have RLS policies, creating circular dependencies.
--
-- This migration rolls back to the original (insecure but working) policies
-- and we'll rewrite them properly without recursion.
--
-- Migration: 20251006000005_rollback_security_fixes.sql
-- Created: 2025-10-06

-- ============================================================================
-- 1. Rollback Profiles RLS to original (temporary - will fix properly)
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Restore original policy (allows all authenticated users to view all profiles)
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS
'Temporary: Allows authenticated users to view profiles (will be fixed properly)';

-- ============================================================================
-- 2. Rollback Organizations RLS to original (temporary)
-- ============================================================================

DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;

-- Restore original policy
CREATE POLICY "organizations_select_policy" ON public.organizations
FOR SELECT USING (
  id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
);

COMMENT ON POLICY "organizations_select_policy" ON public.organizations IS
'Users can view organizations they are active members of';

-- ============================================================================
-- 3. Rollback Reminders RLS to original (temporary)
-- ============================================================================

DROP POLICY IF EXISTS "Active members can view organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can create organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can update organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can delete organization reminders" ON public.reminders;

-- Restore original policies (without status check to avoid recursion)
CREATE POLICY "Users can view organization reminders" ON public.reminders
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create organization reminders" ON public.reminders
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update organization reminders" ON public.reminders
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND organization_id = reminders.organization_id
      AND role IN ('Owner', 'Admin')
    )
  )
);

CREATE POLICY "Users can delete organization reminders" ON public.reminders
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
  )
  AND (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND organization_id = reminders.organization_id
      AND role IN ('Owner', 'Admin')
    )
  )
);
