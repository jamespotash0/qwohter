-- Fix infinite recursion in memberships RLS policy
-- The issue: memberships SELECT policy was querying memberships table itself
-- Solution: Use SECURITY DEFINER function that bypasses RLS entirely

-- Create a function to check if user can see a membership
CREATE OR REPLACE FUNCTION can_view_membership(
  check_user_id uuid,
  membership_user_id uuid,
  membership_org_id uuid
)
RETURNS boolean AS $$
DECLARE
  can_view boolean;
BEGIN
  -- User can always see their own membership
  IF check_user_id = membership_user_id THEN
    RETURN true;
  END IF;

  -- Check if user is active member of same organization
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = membership_org_id
    AND status = 'Active'
  ) INTO can_view;

  RETURN can_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION can_view_membership(uuid, uuid, uuid) TO authenticated;

COMMENT ON FUNCTION can_view_membership(uuid, uuid, uuid) IS
'Check if user can view a membership. SECURITY DEFINER bypasses RLS to prevent recursion.';

-- Drop old policy
DROP POLICY IF EXISTS "memberships_select_policy" ON public.memberships;

-- Create new policy using SECURITY DEFINER function (no recursion!)
CREATE POLICY "memberships_select_policy" ON public.memberships
FOR SELECT USING (
  can_view_membership(auth.uid(), user_id, organization_id)
);

COMMENT ON POLICY "memberships_select_policy" ON public.memberships IS
'Users can see own memberships and memberships in their orgs. Uses SECURITY DEFINER to prevent recursion.';
