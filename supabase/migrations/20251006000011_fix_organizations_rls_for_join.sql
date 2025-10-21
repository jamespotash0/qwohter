-- Fix RLS policy to allow users to query organizations by code when joining
-- Users need to be able to search for organizations by code even if they're not members yet
--
-- NOTE: This migration updates the policies created in 20251006000007
-- It allows ALL authenticated users to SELECT organizations (needed for join flow)
-- while using SECURITY DEFINER functions for UPDATE to avoid circular dependencies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations by code" ON organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;

-- Allow authenticated users to SELECT organizations by organization_code
-- This is needed for the "join organization" flow
CREATE POLICY "Allow users to search organizations by code"
ON organizations
FOR SELECT
TO authenticated
USING (true);

-- Only allow organization owners/admins to update (using SECURITY DEFINER to avoid circular dependency)
CREATE POLICY "Only members can update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  has_org_role(auth.uid(), id, ARRAY['Owner', 'Admin'])
);

-- Only allow authenticated users to create organizations (handled by RPC function)
CREATE POLICY "Authenticated users can create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comments
COMMENT ON POLICY "Allow users to search organizations by code" ON organizations
IS 'Allows any authenticated user to search for organizations by code to join them';

COMMENT ON POLICY "Only members can update their organization" ON organizations
IS 'Only Owner/Admin can update organization. Uses SECURITY DEFINER to prevent circular dependency.';
