-- Fix Update Member Role Function to Use Memberships Table
-- Migration: 20251012000004_fix_update_member_role_function.sql
-- Created: 2025-10-12
--
-- This migration updates the update_member_role function
-- to work with the memberships table instead of profiles table

-- ============================================================================
-- DROP OLD FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_member_role(uuid, text);

-- ============================================================================
-- UPDATE MEMBER ROLE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_member_role(
    member_id uuid,
    new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    member_org_id uuid;
    current_user_role text;
    member_data json;
BEGIN
    -- Validate role input (convert to proper case)
    IF LOWER(new_role) NOT IN ('admin', 'member', 'owner') THEN
        RAISE EXCEPTION 'Invalid role. Must be Admin, Member, or Owner';
    END IF;

    -- Normalize the role to match database format (capitalize first letter)
    new_role := INITCAP(LOWER(new_role));

    -- Get the member's organization from memberships table
    SELECT organization_id INTO member_org_id
    FROM public.memberships
    WHERE user_id = member_id
    AND status = 'Active';

    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Member not found or not active in any organization';
    END IF;

    -- Get current user's role in the same organization
    SELECT role INTO current_user_role
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = member_org_id
    AND status = 'Active';

    -- Check if current user has admin/owner role
    IF current_user_role NOT IN ('Admin', 'Owner') THEN
        RAISE EXCEPTION 'Access denied: Only Admins and Owners can update member roles';
    END IF;

    -- Prevent changing owner role
    IF EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = member_id
        AND organization_id = member_org_id
        AND role = 'Owner'
    ) THEN
        RAISE EXCEPTION 'Cannot change Owner role. Use transfer_ownership function instead';
    END IF;

    -- Prevent promoting to Owner (must use transfer_ownership)
    IF new_role = 'Owner' THEN
        RAISE EXCEPTION 'Cannot promote to Owner. Use transfer_ownership function instead';
    END IF;

    -- Update the member's role in memberships table
    UPDATE public.memberships
    SET
        role = new_role,
        updated_at = NOW()
    WHERE user_id = member_id
    AND organization_id = member_org_id;

    -- Return updated member data
    SELECT json_build_object(
        'user_id', m.user_id,
        'organization_id', m.organization_id,
        'role', m.role,
        'status', m.status,
        'updated_at', m.updated_at
    ) INTO member_data
    FROM public.memberships m
    WHERE m.user_id = member_id
    AND m.organization_id = member_org_id;

    RETURN member_data;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, text) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.update_member_role(uuid, text) IS
'Updates a member''s role in the memberships table. Only Admins and Owners can change roles. Cannot change or promote to Owner role.';
