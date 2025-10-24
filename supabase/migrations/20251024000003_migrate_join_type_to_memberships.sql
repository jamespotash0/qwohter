-- Migration: Migrate join_type from profiles to memberships
-- Created: 2025-10-24
--
-- This migration completes the move of join_type tracking from profiles to memberships table
-- join_type belongs in memberships because it's organization-specific, not user-specific

BEGIN;

-- ============================================================================
-- 1. ADD join_type COLUMN TO MEMBERSHIPS (if not exists)
-- ============================================================================

-- Add join_type column to memberships table
ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS join_type text;

-- Add constraint for valid join_type values
ALTER TABLE public.memberships
DROP CONSTRAINT IF EXISTS valid_join_type;

ALTER TABLE public.memberships
ADD CONSTRAINT valid_join_type CHECK (
  join_type IS NULL OR
  join_type IN ('Direct', 'Invited', 'Requested')
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_memberships_join_type ON public.memberships(join_type)
WHERE join_type IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.memberships.join_type IS 'How the member joined: Direct (org creator), Invited (sent email invite), Requested (self-requested via org code)';

-- ============================================================================
-- 2. MIGRATE EXISTING DATA FROM profiles.join_type TO memberships.join_type
-- ============================================================================

-- Migrate join_type from profiles to memberships for existing records
-- Only update memberships where join_type is NULL and profiles.join_type exists
UPDATE public.memberships m
SET join_type = p.join_type
FROM public.profiles p
WHERE m.user_id = p.id
  AND m.join_type IS NULL
  AND p.join_type IS NOT NULL;

-- Set default 'Direct' for any remaining NULL values (shouldn't happen, but safety net)
UPDATE public.memberships
SET join_type = 'Direct'
WHERE join_type IS NULL;

-- ============================================================================
-- 3. UPDATE create_org_with_owner FUNCTION TO SET join_type
-- ============================================================================

-- Update the function to include join_type for organization creators
CREATE OR REPLACE FUNCTION public.create_org_with_owner(
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
  -- Insert organization with industry and found_via
  INSERT INTO organizations (
    name,
    organization_code,
    industry,
    found_via,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    org_code,
    industry,
    found_via,
    now(),
    now()
  )
  RETURNING id INTO new_org_id;

  -- Insert owner membership with join_type = 'Direct'
  INSERT INTO memberships (
    user_id,
    organization_id,
    role,
    status,
    joined_at,
    join_type,  -- NEW: Set join_type for organization creator
    created_at,
    updated_at
  ) VALUES (
    owner_id,
    new_org_id,
    'Owner',
    'Active',
    now(),
    'Direct',  -- Organization creator joined directly
    now(),
    now()
  );

  -- Return the organization ID
  RETURN QUERY SELECT new_org_id;
END;
$$;

-- Ensure correct permissions
GRANT EXECUTE ON FUNCTION public.create_org_with_owner(text, text, text, text, uuid) TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.create_org_with_owner IS 'Securely creates an organization with industry and found_via fields, assigns the creator as owner with join_type=Direct';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually if needed)
-- ============================================================================

-- Check memberships have join_type populated
-- SELECT join_type, COUNT(*) as count
-- FROM public.memberships
-- GROUP BY join_type
-- ORDER BY count DESC;

-- Verify no NULL join_types in memberships
-- SELECT COUNT(*) as null_join_types
-- FROM public.memberships
-- WHERE join_type IS NULL;

-- ============================================================================
-- NEXT STEPS (to be done after verifying this migration works)
-- ============================================================================

-- After confirming all code is updated and this migration is successful:
-- 1. Deploy and test in development
-- 2. Verify no code references profiles.join_type
-- 3. Run migration to drop profiles.join_type column (separate migration)
