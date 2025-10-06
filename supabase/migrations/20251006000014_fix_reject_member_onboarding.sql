-- Fix reject_member function to clear onboarding progress
-- When a member is rejected, they should be able to rejoin via onboarding

CREATE OR REPLACE FUNCTION reject_member(member_id uuid)
RETURNS boolean AS $$
DECLARE
  member_org_id uuid;
  member_user_id uuid;
  member_role text;
BEGIN
  -- Get organization, user, and role of the member being rejected
  SELECT organization_id, user_id, role INTO member_org_id, member_user_id, member_role
  FROM public.memberships
  WHERE id = member_id;

  -- Check if membership exists
  IF member_org_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;

  -- Verify caller is Owner or Admin in the same organization
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND role IN ('Owner', 'Admin')
    AND status = 'Active'
  ) THEN
    RAISE EXCEPTION 'Access denied: Only admins can reject members';
  END IF;

  -- Prevent self-rejection
  IF member_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot reject yourself';
  END IF;

  -- Prevent rejecting the Owner
  IF member_role = 'Owner' THEN
    RAISE EXCEPTION 'Cannot reject organization owner';
  END IF;

  -- Delete the membership (rejection removes the record)
  DELETE FROM public.memberships
  WHERE id = member_id;

  -- Clear onboarding progress so user can rejoin another organization
  DELETE FROM public.user_onboarding_progress
  WHERE user_id = member_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reject_member(uuid) TO authenticated;

COMMENT ON FUNCTION reject_member(uuid) IS
'Reject a pending member and clear their onboarding progress so they can join another organization';
