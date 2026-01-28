--HAVENT MIGRATED YET
-- Update create_org_with_owner function to include org_prefix
-- The prefix is generated from org_name if not provided

-- Drop existing function first (to handle signature change)
DROP FUNCTION IF EXISTS create_org_with_owner(text, text, text, text, uuid);

-- Recreate with org_prefix support
CREATE OR REPLACE FUNCTION create_org_with_owner(
  org_name text,
  org_code text,
  org_prefix text DEFAULT NULL,
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
  computed_prefix text;
  cleaned_name text;
  words text[];
BEGIN
  -- Generate prefix from org_name if not provided
  IF org_prefix IS NULL OR org_prefix = '' THEN
    -- Clean the name: replace hyphens/underscores with spaces, remove non-letters except spaces
    cleaned_name := regexp_replace(
      regexp_replace(trim(org_name), '[-_]', ' ', 'g'),
      '[^a-zA-Z\s]', '', 'g'
    );

    -- Split into words
    words := regexp_split_to_array(cleaned_name, '\s+');

    IF array_length(words, 1) = 1 THEN
      -- Single word: first 3 letters
      computed_prefix := UPPER(LEFT(regexp_replace(org_name, '[^a-zA-Z]', '', 'g'), 3));
    ELSE
      -- Multiple words: first letter of first 3 words
      computed_prefix := UPPER(
        COALESCE(LEFT(words[1], 1), '') ||
        COALESCE(LEFT(words[2], 1), '') ||
        COALESCE(LEFT(words[3], 1), '')
      );
    END IF;

    -- Fallback if empty
    IF computed_prefix IS NULL OR computed_prefix = '' THEN
      computed_prefix := 'TSK';
    END IF;
  ELSE
    computed_prefix := UPPER(org_prefix);
  END IF;

  -- Insert organization with prefix
  INSERT INTO organizations (
    name,
    organization_code,
    org_prefix,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    org_code,
    computed_prefix,
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

  -- Return the organization ID
  RETURN QUERY SELECT new_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_org_with_owner(text, text, text, text, text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_org_with_owner IS 'Securely creates an organization with auto-generated task reference prefix and assigns the creator as owner';
