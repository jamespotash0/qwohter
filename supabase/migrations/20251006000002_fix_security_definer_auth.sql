-- CRITICAL SECURITY FIX: SECURITY DEFINER Functions Authorization
--
-- VULNERABILITY: Functions like approve_member(), reject_member(), update_member_role()
--               run with elevated privileges but lack authorization checks
-- ATTACK: Users can self-approve into organizations or modify their own roles
-- FIX: Add strict authorization checks to all SECURITY DEFINER functions
--
-- Migration: 20251006000002_fix_security_definer_auth.sql
-- Created: 2025-10-06

-- ============================================================================
-- 1. Fix approve_member() - Add authorization and prevent self-approval
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_member(member_id uuid)
RETURNS boolean AS $$
DECLARE
  member_org_id uuid;
  member_user_id uuid;
BEGIN
  -- Get organization and user of the member being approved
  SELECT organization_id, user_id INTO member_org_id, member_user_id
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
    RAISE EXCEPTION 'Access denied: Only admins can approve members';
  END IF;

  -- Prevent self-approval
  IF member_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot approve yourself';
  END IF;

  -- Update membership to Active
  UPDATE public.memberships
  SET
    status = 'Active',
    joined_at = now(),
    updated_at = now()
  WHERE id = member_id
  AND status = 'Pending'; -- Only approve if currently pending

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_member(uuid) IS
'Approves a pending membership. Requires Owner/Admin role in same organization. Prevents self-approval.';

-- ============================================================================
-- 2. Fix reject_member() - Add authorization and prevent self-rejection
-- ============================================================================

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

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_member(uuid) IS
'Rejects a membership request. Requires Owner/Admin role. Prevents self-rejection and owner rejection.';

-- ============================================================================
-- 3. Fix update_member_role() - Add authorization and prevent role escalation
-- ============================================================================

CREATE OR REPLACE FUNCTION update_member_role(
  member_id uuid,
  new_role text
)
RETURNS boolean AS $$
DECLARE
  member_org_id uuid;
  member_user_id uuid;
  current_role text;
  caller_role text;
BEGIN
  -- Validate new role
  IF new_role NOT IN ('Owner', 'Admin', 'Member') THEN
    RAISE EXCEPTION 'Invalid role: must be Owner, Admin, or Member';
  END IF;

  -- Get membership details
  SELECT organization_id, user_id, role
  INTO member_org_id, member_user_id, current_role
  FROM public.memberships
  WHERE id = member_id;

  -- Check if membership exists
  IF member_org_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;

  -- Get caller's role
  SELECT role INTO caller_role
  FROM public.memberships
  WHERE user_id = auth.uid()
  AND organization_id = member_org_id
  AND status = 'Active';

  -- Verify caller has permission (must be Owner or Admin)
  IF caller_role NOT IN ('Owner', 'Admin') THEN
    RAISE EXCEPTION 'Access denied: Only admins can update member roles';
  END IF;

  -- Prevent self-role modification
  IF member_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own role';
  END IF;

  -- Prevent modifying the Owner role (Owner is permanent)
  IF current_role = 'Owner' THEN
    RAISE EXCEPTION 'Cannot modify owner role';
  END IF;

  -- Prevent promoting to Owner (only one Owner per org)
  IF new_role = 'Owner' THEN
    RAISE EXCEPTION 'Cannot promote to owner role';
  END IF;

  -- Admins can only modify Members, not other Admins
  IF caller_role = 'Admin' AND current_role = 'Admin' THEN
    RAISE EXCEPTION 'Admins cannot modify other admin roles';
  END IF;

  -- Update the role
  UPDATE public.memberships
  SET
    role = new_role,
    updated_at = now()
  WHERE id = member_id
  AND status = 'Active';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_member_role(uuid, text) IS
'Updates a member role. Requires Owner/Admin. Prevents self-modification, owner changes, and unauthorized escalation.';

-- ============================================================================
-- 4. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION approve_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_member_role(uuid, text) TO authenticated;
