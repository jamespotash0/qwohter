-- Fix RLS policy to allow users to query organizations by code when joining
-- Users need to be able to search for organizations by code even if they're not members yet

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations by code" ON organizations;

-- Allow authenticated users to SELECT organizations by organization_code
-- This is needed for the "join organization" flow
CREATE POLICY "Allow users to search organizations by code"
ON organizations
FOR SELECT
TO authenticated
USING (true);

-- Keep existing policies for INSERT/UPDATE/DELETE more restrictive
-- Only allow organization owners/admins to update
CREATE POLICY "Only members can update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM memberships
    WHERE user_id = auth.uid()
    AND role IN ('Owner', 'Admin')
  )
);

-- Only allow authenticated users to create organizations (handled by RPC function)
CREATE POLICY "Authenticated users can create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comment
COMMENT ON POLICY "Allow users to search organizations by code" ON organizations
IS 'Allows any authenticated user to search for organizations by code to join them';
