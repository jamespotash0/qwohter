-- ============================================================================
-- Migration: Remove Organization Code System
-- ============================================================================
-- This migration removes all organization_code functionality from the database
-- Run this in Supabase SQL Editor after deploying frontend changes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop obsolete RPC functions that use organization codes
-- ============================================================================

-- Drop function that creates org with code
DROP FUNCTION IF EXISTS create_organization_and_link_user(TEXT, TEXT, UUID);

-- Drop function that looks up org by code
DROP FUNCTION IF EXISTS get_organization_by_code(TEXT);

-- Drop security function that returns org code for user
DROP FUNCTION IF EXISTS get_organization_code_for_user(UUID);

RAISE NOTICE 'Obsolete RPC functions dropped';

-- ============================================================================
-- 2. Remove organization_code column from organizations table
-- ============================================================================

-- Drop any indexes on organization_code
DROP INDEX IF EXISTS organizations_organization_code_idx;
DROP INDEX IF EXISTS idx_organizations_code;
DROP INDEX IF EXISTS organizations_code_unique;

-- Drop unique constraint if exists
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_organization_code_key;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS unique_organization_code;

-- Remove the column
ALTER TABLE organizations DROP COLUMN IF EXISTS organization_code;

RAISE NOTICE 'organization_code column removed from organizations table';

-- ============================================================================
-- 3. Remove organization_code column from invite_tokens table
-- ============================================================================

-- Remove the column
ALTER TABLE invite_tokens DROP COLUMN IF EXISTS organization_code;

RAISE NOTICE 'organization_code column removed from invite_tokens table';

-- ============================================================================
-- 4. Update create_org_with_owner RPC function (remove org_code parameter)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_org_with_owner(
  org_name TEXT,
  found_via TEXT,
  industry TEXT,
  owner_id UUID
)
RETURNS TABLE(org_id UUID, membership_id UUID) AS $$
DECLARE
  new_org_id UUID;
  new_membership_id UUID;
BEGIN
  -- Create organization without org_code
  INSERT INTO organizations (
    name,
    found_via,
    industry,
    phone_number,
    fax_number,
    company_address,
    website,
    quote_starting_point
  )
  VALUES (
    org_name,
    found_via,
    industry,
    '',  -- Default empty phone_number
    '',  -- Default empty fax_number
    '',  -- Default empty company_address
    '',  -- Default empty website
    '1000'  -- Default quote starting point
  )
  RETURNING id INTO new_org_id;

  -- Create owner membership
  INSERT INTO memberships (
    user_id,
    organization_id,
    role,
    status,
    joined_at
  )
  VALUES (
    owner_id,
    new_org_id,
    'Owner',
    'Active',
    NOW()
  )
  RETURNING id INTO new_membership_id;

  RAISE NOTICE 'Organization created: %, Membership created: %', new_org_id, new_membership_id;

  RETURN QUERY SELECT new_org_id, new_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'create_org_with_owner function updated without org_code';

-- ============================================================================
-- 5. Grant permissions on updated function
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_org_with_owner(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_org_with_owner(TEXT, TEXT, TEXT, UUID) TO service_role;

RAISE NOTICE 'Permissions granted on updated function';

-- ============================================================================
-- 6. Cleanup: Remove any triggers related to org_code generation
-- ============================================================================

-- Drop trigger if it exists (common pattern for auto-generating codes)
DROP TRIGGER IF EXISTS generate_organization_code_trigger ON organizations;
DROP TRIGGER IF EXISTS set_organization_code_trigger ON organizations;

-- Drop associated trigger function if exists
DROP FUNCTION IF EXISTS generate_organization_code();
DROP FUNCTION IF EXISTS set_organization_code();

RAISE NOTICE 'Organization code triggers and functions removed';



-- ============================================================================
-- 8. Verify changes
-- ============================================================================

DO $$
DECLARE
  org_code_exists BOOLEAN;
  invite_code_exists BOOLEAN;
BEGIN
  -- Check organizations table
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name = 'organization_code'
  ) INTO org_code_exists;

  -- Check invite_tokens table
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'invite_tokens'
    AND column_name = 'organization_code'
  ) INTO invite_code_exists;

  IF org_code_exists THEN
    RAISE WARNING 'organization_code column still exists in organizations table!';
  ELSE
    RAISE NOTICE '✓ organization_code removed from organizations table';
  END IF;

  IF invite_code_exists THEN
    RAISE WARNING 'organization_code column still exists in invite_tokens table!';
  ELSE
    RAISE NOTICE '✓ organization_code removed from invite_tokens table';
  END IF;

  -- Verify functions removed
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_organization_and_link_user') THEN
    RAISE WARNING 'create_organization_and_link_user function still exists!';
  ELSE
    RAISE NOTICE '✓ create_organization_and_link_user function removed';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organization_by_code') THEN
    RAISE WARNING 'get_organization_by_code function still exists!';
  ELSE
    RAISE NOTICE '✓ get_organization_by_code function removed';
  END IF;

  RAISE NOTICE '================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '================================';
END $$;

COMMIT;
