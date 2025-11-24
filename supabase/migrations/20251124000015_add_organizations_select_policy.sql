-- Add SELECT policy for organizations table
-- Allows users to view organizations they are members of

CREATE POLICY "Users can view organizations they belong to"
ON organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM memberships
    WHERE memberships.organization_id = organizations.id
    AND memberships.user_id = auth.uid()
    AND memberships.status = 'Active'
  )
);

COMMENT ON POLICY "Users can view organizations they belong to" ON organizations
IS 'Allows authenticated users to view organizations where they have an active membership';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
