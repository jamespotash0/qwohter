-- Standardize Role Capitalization Across All Tables
-- Migration: 20251012000001_standardize_role_capitalization.sql
-- Created: 2025-10-12
--
-- This migration updates all role fields to use capitalized values
-- ('Owner', 'Admin', 'Member') instead of lowercase ('owner', 'admin', 'member')

-- ============================================================================
-- UPDATE EXISTING DATA
-- ============================================================================

-- Update organization_members table (if it exists)
UPDATE public.organization_members
SET role = CASE
  WHEN role = 'owner' THEN 'Owner'
  WHEN role = 'admin' THEN 'Admin'
  WHEN role = 'member' THEN 'Member'
  ELSE role
END
WHERE role IN ('owner', 'admin', 'member');

-- Update memberships table (if it exists)
UPDATE public.memberships
SET role = CASE
  WHEN role = 'owner' THEN 'Owner'
  WHEN role = 'admin' THEN 'Admin'
  WHEN role = 'member' THEN 'Member'
  ELSE role
END
WHERE role IN ('owner', 'admin', 'member');

-- Update profiles table (if it has role column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    UPDATE public.profiles
    SET role = CASE
      WHEN role = 'owner' THEN 'Owner'
      WHEN role = 'admin' THEN 'Admin'
      WHEN role = 'member' THEN 'Member'
      ELSE role
    END
    WHERE role IN ('owner', 'admin', 'member');
  END IF;
END $$;

-- ============================================================================
-- UPDATE CHECK CONSTRAINTS
-- ============================================================================

-- Drop and recreate constraint for organization_members
ALTER TABLE public.organization_members
DROP CONSTRAINT IF EXISTS organization_members_role_check;

ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_role_check
CHECK (role IN ('Owner', 'Admin', 'Member'));

-- Drop and recreate constraint for memberships
ALTER TABLE public.memberships
DROP CONSTRAINT IF EXISTS memberships_role_check;

ALTER TABLE public.memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN ('Owner', 'Admin', 'Member'));

-- Update default value for organization_members
ALTER TABLE public.organization_members
ALTER COLUMN role SET DEFAULT 'Member';

-- Update default value for memberships
ALTER TABLE public.memberships
ALTER COLUMN role SET DEFAULT 'Member';

-- ============================================================================
-- UPDATE PROFILES TABLE (if it has role column)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    -- Drop existing constraint
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check';

    -- Add new constraint with capitalized values
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (''Owner'', ''Admin'', ''Member''))';

    -- Update default value
    EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT ''Member''';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT organization_members_role_check ON public.organization_members IS
'Role must be one of: Owner, Admin, Member (capitalized)';

COMMENT ON CONSTRAINT memberships_role_check ON public.memberships IS
'Role must be one of: Owner, Admin, Member (capitalized)';
