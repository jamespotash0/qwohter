-- Create Transfer Ownership Function
-- Migration: 20251012000002_create_transfer_ownership_function.sql
-- Created: 2025-10-12
--
-- This migration creates a database function to safely transfer organization ownership
-- from the current owner to another member. Only one Owner is allowed per organization.

-- ============================================================================
-- TRANSFER OWNERSHIP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_ownership(
  p_new_owner_id UUID,
  p_organization_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_current_owner_id UUID;
  v_new_owner_exists BOOLEAN;
  v_result JSON;
BEGIN
  -- Get the current user (must be the owner)
  SELECT user_id INTO v_current_owner_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  AND organization_id = p_organization_id
  AND role = 'Owner'
  AND status = 'Active';

  -- Check if current user is the owner
  IF v_current_owner_id IS NULL THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  -- Check if new owner exists and is an active member
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = p_new_owner_id
    AND organization_id = p_organization_id
    AND status = 'Active'
    AND role IN ('Admin', 'Member')
  ) INTO v_new_owner_exists;

  IF NOT v_new_owner_exists THEN
    RAISE EXCEPTION 'New owner must be an active Admin or Member of the organization';
  END IF;

  -- Prevent transferring to yourself
  IF v_current_owner_id = p_new_owner_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to yourself';
  END IF;

  -- Begin the transfer (atomic operation)
  -- Step 1: Demote current owner to Admin
  UPDATE public.profiles
  SET role = 'Admin',
      updated_at = NOW()
  WHERE user_id = v_current_owner_id
  AND organization_id = p_organization_id;

  -- Step 2: Promote new member to Owner
  UPDATE public.profiles
  SET role = 'Owner',
      updated_at = NOW()
  WHERE user_id = p_new_owner_id
  AND organization_id = p_organization_id;

  -- Also update memberships table if it exists
  UPDATE public.memberships
  SET role = 'Admin',
      updated_at = NOW()
  WHERE user_id = v_current_owner_id
  AND organization_id = p_organization_id;

  UPDATE public.memberships
  SET role = 'Owner',
      updated_at = NOW()
  WHERE user_id = p_new_owner_id
  AND organization_id = p_organization_id;

  -- Return success result
  v_result := json_build_object(
    'success', true,
    'previous_owner_id', v_current_owner_id,
    'new_owner_id', p_new_owner_id,
    'organization_id', p_organization_id,
    'transferred_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ownership transfer failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.transfer_ownership(UUID, UUID) IS
'Transfers organization ownership from current owner to another member. Current owner becomes Admin. Only one owner allowed per organization.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.transfer_ownership(UUID, UUID) TO authenticated;
