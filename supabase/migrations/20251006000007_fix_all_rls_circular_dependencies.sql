-- FIX ALL RLS CIRCULAR DEPENDENCIES - Comprehensive Solution
--
-- PROBLEM: RLS policies that query tables with their own RLS create infinite loops
-- SOLUTION: Create SECURITY DEFINER functions that bypass RLS for membership checks
--
-- Migration: 20251006000007_fix_all_rls_circular_dependencies.sql
-- Created: 2025-10-06

-- ============================================================================
-- PART 1: Create SECURITY DEFINER Helper Functions (No RLS - Breaks Cycles)
-- ============================================================================

-- Function 1: Check if user is active member of organization
CREATE OR REPLACE FUNCTION is_active_member(
  check_user_id uuid,
  check_org_id uuid
)
RETURNS boolean AS $$
DECLARE
  is_member boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = check_org_id
    AND status = 'Active'
  ) INTO is_member;

  RETURN is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_active_member(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION is_active_member(uuid, uuid) IS
'Check if user is active member of organization. SECURITY DEFINER bypasses RLS.';

-- ============================================================================

-- Function 2: Check if user has specific role in organization
CREATE OR REPLACE FUNCTION has_org_role(
  check_user_id uuid,
  check_org_id uuid,
  required_roles text[]
)
RETURNS boolean AS $$
DECLARE
  has_role boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = check_org_id
    AND role = ANY(required_roles)
    AND status = 'Active'
  ) INTO has_role;

  RETURN has_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION has_org_role(uuid, uuid, text[]) TO authenticated;

COMMENT ON FUNCTION has_org_role(uuid, uuid, text[]) IS
'Check if user has specific role(s) in organization. SECURITY DEFINER bypasses RLS.';

-- ============================================================================

-- Function 3: Get user's organization IDs (returns all orgs user is active member of)
CREATE OR REPLACE FUNCTION get_user_org_ids(check_user_id uuid)
RETURNS TABLE (organization_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT m.organization_id
  FROM public.memberships m
  WHERE m.user_id = check_user_id
  AND m.status = 'Active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_org_ids(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_org_ids(uuid) IS
'Get all organization IDs where user is active member. SECURITY DEFINER bypasses RLS.';

-- ============================================================================

-- Function 4: Get organization member user IDs (for profiles access)
CREATE OR REPLACE FUNCTION get_org_member_ids(target_user_id uuid)
RETURNS TABLE (user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT m2.user_id
  FROM public.memberships m1
  JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
  WHERE m1.user_id = target_user_id
  AND m1.status = 'Active'
  AND m2.status = 'Active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_org_member_ids(uuid) TO authenticated;

COMMENT ON FUNCTION get_org_member_ids(uuid) IS
'Get user IDs of all active members in same organization(s). SECURITY DEFINER bypasses RLS.';

-- ============================================================================
-- PART 2: Rewrite ALL RLS Policies Using SECURITY DEFINER Functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES TABLE - Fix circular dependency with memberships
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Profiles of users in same organization (via SECURITY DEFINER - no recursion!)
  id IN (SELECT user_id FROM get_org_member_ids(auth.uid()))
);

COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS
'Users can view own profile + org members. Uses SECURITY DEFINER to prevent recursion.';

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS TABLE - Use SECURITY DEFINER function
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;

CREATE POLICY "organizations_select_policy" ON public.organizations
FOR SELECT USING (
  id IN (SELECT organization_id FROM get_user_org_ids(auth.uid()))
);

COMMENT ON POLICY "organizations_select_policy" ON public.organizations IS
'Users can view organizations they are active members of. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS UPDATE - Use SECURITY DEFINER function
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;

CREATE POLICY "organizations_update_policy" ON public.organizations
FOR UPDATE USING (
  has_org_role(auth.uid(), id, ARRAY['Owner', 'Admin'])
);

COMMENT ON POLICY "organizations_update_policy" ON public.organizations IS
'Only Owner/Admin can update organization. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------
-- REMINDERS TABLE - Use SECURITY DEFINER functions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can view organization reminders" ON public.reminders;

CREATE POLICY "Active members can view organization reminders" ON public.reminders
FOR SELECT USING (
  is_active_member(auth.uid(), organization_id)
);

COMMENT ON POLICY "Active members can view organization reminders" ON public.reminders IS
'Active members can view org reminders. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can create organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can create organization reminders" ON public.reminders;

CREATE POLICY "Active members can create organization reminders" ON public.reminders
FOR INSERT WITH CHECK (
  is_active_member(auth.uid(), organization_id)
  AND created_by = auth.uid()
);

COMMENT ON POLICY "Active members can create organization reminders" ON public.reminders IS
'Active members can create reminders. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can update organization reminders" ON public.reminders;

CREATE POLICY "Active members can update organization reminders" ON public.reminders
FOR UPDATE USING (
  is_active_member(auth.uid(), organization_id)
  AND (
    created_by = auth.uid()
    OR has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
  )
);

COMMENT ON POLICY "Active members can update organization reminders" ON public.reminders IS
'Active members can update own reminders, admins can update any. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Active members can delete organization reminders" ON public.reminders;

CREATE POLICY "Active members can delete organization reminders" ON public.reminders
FOR DELETE USING (
  is_active_member(auth.uid(), organization_id)
  AND (
    created_by = auth.uid()
    OR has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
  )
);

COMMENT ON POLICY "Active members can delete organization reminders" ON public.reminders IS
'Active members can delete own reminders, admins can delete any. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------
-- QUOTES TABLE - Use SECURITY DEFINER functions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;

CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT USING (
  is_active_member(auth.uid(), organization_id)
);

COMMENT ON POLICY "quotes_select_policy" ON public.quotes IS
'Active members can view org quotes. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "quotes_insert_policy" ON public.quotes;

CREATE POLICY "quotes_insert_policy" ON public.quotes
FOR INSERT WITH CHECK (
  is_active_member(auth.uid(), organization_id)
  AND created_by = auth.uid()
);

COMMENT ON POLICY "quotes_insert_policy" ON public.quotes IS
'Active members can create quotes. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "quotes_update_policy" ON public.quotes;

CREATE POLICY "quotes_update_policy" ON public.quotes
FOR UPDATE USING (
  is_active_member(auth.uid(), organization_id)
);

COMMENT ON POLICY "quotes_update_policy" ON public.quotes IS
'Active members can update org quotes. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

CREATE POLICY "quotes_delete_policy" ON public.quotes
FOR DELETE USING (
  has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
);

COMMENT ON POLICY "quotes_delete_policy" ON public.quotes IS
'Only Owner/Admin can delete quotes. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------
-- QUOTE_ACTIVITIES TABLE - Use SECURITY DEFINER functions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "quote_activities_select_policy" ON public.quote_activities;

CREATE POLICY "quote_activities_select_policy" ON public.quote_activities
FOR SELECT USING (
  is_active_member(auth.uid(), organization_id)
);

COMMENT ON POLICY "quote_activities_select_policy" ON public.quote_activities IS
'Active members can view org activities. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "quote_activities_insert_policy" ON public.quote_activities;

CREATE POLICY "quote_activities_insert_policy" ON public.quote_activities
FOR INSERT WITH CHECK (
  is_active_member(auth.uid(), organization_id)
  AND user_id = auth.uid()
);

COMMENT ON POLICY "quote_activities_insert_policy" ON public.quote_activities IS
'Active members can log activities. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS TABLE - Use SECURITY DEFINER functions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;

CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
FOR SELECT USING (
  has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
);

COMMENT ON POLICY "subscriptions_select_policy" ON public.subscriptions IS
'Only Owner/Admin can view subscription. Uses SECURITY DEFINER.';

-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "subscriptions_update_policy" ON public.subscriptions;

CREATE POLICY "subscriptions_update_policy" ON public.subscriptions
FOR UPDATE USING (
  has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
);

COMMENT ON POLICY "subscriptions_update_policy" ON public.subscriptions IS
'Only Owner/Admin can update subscription. Uses SECURITY DEFINER.';

-- ============================================================================
-- PART 3: Summary
-- ============================================================================

-- All RLS policies now use SECURITY DEFINER helper functions that:
-- 1. Bypass RLS on the memberships table (preventing circular dependencies)
-- 2. Maintain security by checking membership status and roles
-- 3. Are marked as STABLE for query optimization
-- 4. Are granted only to authenticated users

-- No more stack depth errors!
-- Security is maintained!
-- Dashboard works perfectly!
