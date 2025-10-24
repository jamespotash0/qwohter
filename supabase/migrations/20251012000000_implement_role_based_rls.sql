-- Implement Role-Based RLS Policies
-- Migration: 20251012000000_implement_role_based_rls.sql
-- Created: 2025-10-12
--
-- This migration implements role-based Row Level Security policies that match
-- the permission matrix defined in the Permissions tab UI.

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's role in their organization
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
  AND status = 'Active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_role() IS
'Returns the current users role (Owner, Admin, Member) in their organization';

-- Function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  AND status = 'Active'
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_organization_id() IS
'Returns the current users organization_id';

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND (
      CASE
        WHEN required_role = 'Owner' THEN role IN ('Owner')
        WHEN required_role = 'Admin' THEN role IN ('Owner', 'Admin')
        WHEN required_role = 'Member' THEN role IN ('Owner', 'Admin', 'Member')
        ELSE FALSE
      END
    )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_has_role(TEXT) IS
'Check if user has at least the specified role level (hierarchical: Owner > Admin > Member)';

-- ============================================================================
-- QUOTES TABLE - ROLE-BASED RLS POLICIES
-- ============================================================================

-- Drop existing user-only policies
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can delete their own quotes" ON public.quotes;

-- SELECT: All members can view organization quotes, Members can only see their own
CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT USING (
  -- Owner/Admin can view all quotes in their organization
  (public.user_has_role('Admin') AND user_id IN (
    SELECT user_id
    FROM public.profiles
    WHERE organization_id = public.get_user_organization_id()
    AND status = 'Active'
  ))
  OR
  -- Members can view their own quotes
  (auth.uid() = user_id)
);

-- INSERT: All members can create quotes
CREATE POLICY "quotes_insert_policy" ON public.quotes
FOR INSERT WITH CHECK (
  -- User must be an active member of an organization
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
);

-- UPDATE: Owner/Admin can edit any quote, Members can edit own quotes
CREATE POLICY "quotes_update_policy" ON public.quotes
FOR UPDATE USING (
  -- Owner/Admin can edit all quotes in their organization
  (public.user_has_role('Admin') AND user_id IN (
    SELECT user_id
    FROM public.profiles
    WHERE organization_id = public.get_user_organization_id()
    AND status = 'Active'
  ))
  OR
  -- Members can edit their own quotes
  (auth.uid() = user_id)
);

-- DELETE: Owner/Admin can delete any quote, Members can delete own quotes
CREATE POLICY "quotes_delete_policy" ON public.quotes
FOR DELETE USING (
  -- Owner/Admin can delete all quotes in their organization
  (public.user_has_role('Admin') AND user_id IN (
    SELECT user_id
    FROM public.profiles
    WHERE organization_id = public.get_user_organization_id()
    AND status = 'Active'
  ))
  OR
  -- Members can delete their own quotes
  (auth.uid() = user_id)
);

-- ============================================================================
-- PROFILES TABLE - ROLE-BASED RLS POLICIES
-- ============================================================================

-- UPDATE: Only Owner/Admin can update roles, users can update their own profile
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE USING (
  -- Users can update their own profile (but not role)
  (auth.uid() = user_id)
  OR
  -- Owner/Admin can update profiles in their organization
  (public.user_has_role('Admin') AND organization_id = public.get_user_organization_id())
) WITH CHECK (
  -- Ensure users can't elevate their own role
  (auth.uid() = user_id AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid()))
  OR
  -- Owner/Admin can update any profile in their organization
  (public.user_has_role('Admin') AND organization_id = public.get_user_organization_id())
);

-- DELETE: Only Owner/Admin can remove members
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE USING (
  -- Owner/Admin can remove members in their organization (except themselves)
  public.user_has_role('Admin')
  AND organization_id = public.get_user_organization_id()
  AND user_id != auth.uid() -- Can't delete yourself
);

-- ============================================================================
-- ORGANIZATIONS TABLE - ROLE-BASED RLS POLICIES
-- ============================================================================

-- UPDATE: Only Owner/Admin can update organization settings
DROP POLICY IF EXISTS "Users can update organizations they belong to" ON public.organizations;

CREATE POLICY "organizations_update_policy" ON public.organizations
FOR UPDATE USING (
  -- Owner/Admin can update their organization
  public.user_has_role('Admin')
  AND id = public.get_user_organization_id()
);

-- DELETE: Only Owner can delete organization
DROP POLICY IF EXISTS "organizations_delete_policy" ON public.organizations;

CREATE POLICY "organizations_delete_policy" ON public.organizations
FOR DELETE USING (
  -- Only Owner can delete organization
  public.user_has_role('Owner')
  AND id = public.get_user_organization_id()
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "quotes_select_policy" ON public.quotes IS
'Owner/Admin can view all organization quotes, Members can view their own quotes';

COMMENT ON POLICY "quotes_insert_policy" ON public.quotes IS
'All active organization members can create quotes';

COMMENT ON POLICY "quotes_update_policy" ON public.quotes IS
'Owner/Admin can edit all organization quotes, Members can edit their own quotes';

COMMENT ON POLICY "quotes_delete_policy" ON public.quotes IS
'Owner/Admin can delete all organization quotes, Members can delete their own quotes';

COMMENT ON POLICY "profiles_update_policy" ON public.profiles IS
'Users can update their own profile. Owner/Admin can update any profile in their organization';

COMMENT ON POLICY "profiles_delete_policy" ON public.profiles IS
'Owner/Admin can remove members from their organization (except themselves)';

COMMENT ON POLICY "organizations_update_policy" ON public.organizations IS
'Owner/Admin can update organization settings';

COMMENT ON POLICY "organizations_delete_policy" ON public.organizations IS
'Only Owner can delete the organization';
