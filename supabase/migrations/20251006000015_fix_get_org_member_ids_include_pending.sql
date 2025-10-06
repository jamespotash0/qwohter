-- Fix get_org_member_ids to include Pending members
-- Admins need to see profiles of pending members to approve them

CREATE OR REPLACE FUNCTION get_org_member_ids(target_user_id uuid)
RETURNS TABLE (user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT m2.user_id
  FROM public.memberships m1
  JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
  WHERE m1.user_id = target_user_id
  AND m1.status = 'Active'  -- Current user must be Active
  AND m2.status IN ('Active', 'Pending');  -- Can see both Active and Pending members
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_member_ids(uuid) IS
'Get user IDs of all members (Active and Pending) in same organization(s). SECURITY DEFINER bypasses RLS.';
