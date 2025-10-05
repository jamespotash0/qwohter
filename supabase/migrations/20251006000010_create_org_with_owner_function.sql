-- Create function to create organization with owner membership
-- This function bypasses RLS policies using SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_org_with_owner(
  org_name text,
  org_code text,
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
  -- Insert organization
  INSERT INTO organizations (
    name,
    organization_code,
    found_via,
    industry,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    org_code,
    found_via,
    industry,
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
    joined_at,
    created_at,
    updated_at
  ) VALUES (
    owner_id,
    new_org_id,
    'Owner',
    'Active',
    now(),
    now(),
    now()
  );

  -- Update profile with organization_id
  UPDATE profiles
  SET organization_id = new_org_id
  WHERE id = owner_id;

  -- Return the organization ID
  RETURN QUERY SELECT new_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_org_with_owner(text, text, text, text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_org_with_owner IS 'Securely creates an organization and assigns the creator as owner';
