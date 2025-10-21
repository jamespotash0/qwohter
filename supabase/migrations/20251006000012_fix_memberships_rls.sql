-- Fix memberships RLS policies to prevent circular dependencies
-- The memberships table policies were not updated in migration 007
-- They still use old functions that can create circular dependencies

-- Drop old policies
DROP POLICY IF EXISTS "memberships_select_policy" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert_policy" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update_policy" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete_policy" ON public.memberships;

-- MEMBERSHIPS SELECT - No circular dependency, queries memberships table directly
CREATE POLICY "memberships_select_policy" ON public.memberships
FOR SELECT USING (
  -- User can always see their own memberships
  user_id = auth.uid()
  OR
  -- User can see other memberships in their organization if they are an active member
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
);

-- MEMBERSHIPS INSERT - Allow authenticated users (for join/create org flows)
CREATE POLICY "memberships_insert_policy" ON public.memberships
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid() -- Can create own membership
    OR has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin']) -- Or admin can create
  )
);

-- MEMBERSHIPS UPDATE - Only admins can update memberships
CREATE POLICY "memberships_update_policy" ON public.memberships
FOR UPDATE USING (
  has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
);

-- MEMBERSHIPS DELETE - Only admins can delete memberships
CREATE POLICY "memberships_delete_policy" ON public.memberships
FOR DELETE USING (
  has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
);

-- Add comments
COMMENT ON POLICY "memberships_select_policy" ON public.memberships IS
'Users can see own memberships and memberships in their orgs. Self-referential query is safe.';

COMMENT ON POLICY "memberships_insert_policy" ON public.memberships IS
'Users can create own memberships, admins can create any. Uses SECURITY DEFINER for admin check.';

COMMENT ON POLICY "memberships_update_policy" ON public.memberships IS
'Only Owner/Admin can update memberships. Uses SECURITY DEFINER.';

COMMENT ON POLICY "memberships_delete_policy" ON public.memberships IS
'Only Owner/Admin can delete memberships. Uses SECURITY DEFINER.';
