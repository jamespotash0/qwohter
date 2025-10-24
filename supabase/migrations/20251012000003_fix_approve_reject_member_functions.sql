-- Fix Approve/Reject Member Functions to Use Memberships Table
-- Migration: 20251012000003_fix_approve_reject_member_functions.sql
-- Created: 2025-10-12
--
-- This migration updates approve_member and reject_member functions
-- to work with the memberships table instead of profiles table

-- ============================================================================
-- DROP OLD FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.approve_member(uuid);
DROP FUNCTION IF EXISTS public.reject_member(uuid);

-- ============================================================================
-- APPROVE MEMBER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_member(member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    member_org_id uuid;
    current_user_role text;
BEGIN
    -- Get the member's organization from memberships table
    SELECT organization_id INTO member_org_id
    FROM public.memberships
    WHERE user_id = member_id;

    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Membership not found';
    END IF;

    -- Get current user's role in the organization
    SELECT role INTO current_user_role
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND status = 'Active';

    -- Check if current user is admin/owner of that organization
    IF current_user_role NOT IN ('Admin', 'Owner') THEN
        RAISE EXCEPTION 'Only Admins and Owners can approve members';
    END IF;

    -- Approve the member in memberships table
    UPDATE public.memberships
    SET status = 'Active',
        updated_at = NOW()
    WHERE user_id = member_id
    AND organization_id = member_org_id
    AND status = 'Pending';

    RETURN true;
END;
$$;

-- ============================================================================
-- REJECT MEMBER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reject_member(member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    member_org_id uuid;
    current_user_role text;
BEGIN
    -- Get the member's organization from memberships table
    SELECT organization_id INTO member_org_id
    FROM public.memberships
    WHERE user_id = member_id;

    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Membership not found';
    END IF;

    -- Get current user's role in the organization
    SELECT role INTO current_user_role
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND status = 'Active';

    -- Check if current user is admin/owner of that organization
    IF current_user_role NOT IN ('Admin', 'Owner') THEN
        RAISE EXCEPTION 'Only Admins and Owners can reject members';
    END IF;

    -- Delete the pending member from memberships table
    DELETE FROM public.memberships
    WHERE user_id = member_id
    AND organization_id = member_org_id
    AND status = 'Pending';

    RETURN true;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.approve_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_member(uuid) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.approve_member(uuid) IS
'Approves a pending member by updating their status to Active in the memberships table';

COMMENT ON FUNCTION public.reject_member(uuid) IS
'Rejects a pending member by deleting their record from the memberships table';
