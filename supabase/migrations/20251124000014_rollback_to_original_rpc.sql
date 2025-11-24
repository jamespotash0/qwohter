-- Rollback to original RPC function (before debugging)
-- Restore the function that existed at commit ef6cf7d

-- Drop all the experimental versions
DROP FUNCTION IF EXISTS create_org_with_owner(text, text, text, uuid);
DROP FUNCTION IF EXISTS create_org_with_owner(text, text, text, text, uuid);

-- Restore original function with owner_id parameter (org_code removed since frontend doesn't send it)
CREATE OR REPLACE FUNCTION create_org_with_owner(
  org_name text,
  found_via text DEFAULT NULL,
  industry text DEFAULT NULL,
  owner_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (org_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  -- Insert organization with industry and found_via
  INSERT INTO organizations (
    name,
    industry,
    found_via,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    industry,
    found_via,
    now(),
    now()
  )
  RETURNING id INTO new_org_id;

  -- Insert owner membership
  INSERT INTO memberships (
    user_id,
    organization_id,
    role,
    status,
    join_type,
    joined_at,
    created_at,
    updated_at
  ) VALUES (
    owner_id,
    new_org_id,
    'Owner',
    'Active',
    'Direct',
    now(),
    now(),
    now()
  );

  -- Return the organization ID
  RETURN QUERY SELECT new_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_org_with_owner(text, text, text, uuid) TO authenticated;

-- Drop the auto-create owner trigger FIRST (before dropping the column it depends on)
DROP TRIGGER IF EXISTS trigger_auto_create_owner_membership ON organizations;
DROP FUNCTION IF EXISTS auto_create_owner_membership();

-- Now we can remove the created_by column
ALTER TABLE organizations DROP COLUMN IF EXISTS created_by;

COMMENT ON FUNCTION create_org_with_owner IS 'Original RPC function restored - creates organization with owner membership (trigger_link_contact_to_member removed to fix errors)';

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';
