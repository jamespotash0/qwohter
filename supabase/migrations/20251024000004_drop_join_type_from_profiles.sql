-- Migration: Drop join_type column from profiles table
-- Created: 2025-10-24
--
-- IMPORTANT: Only run this migration AFTER:
-- 1. Migration 20251024000003_migrate_join_type_to_memberships.sql has been deployed
-- 2. All code has been updated to use memberships.join_type instead of profiles.join_type
-- 3. Verification in production confirms no code references profiles.join_type
--
-- This is the final cleanup step to remove join_type from profiles table

BEGIN;

-- ============================================================================
-- DROP join_type FROM profiles
-- ============================================================================

-- Drop the index first
DROP INDEX IF EXISTS public.idx_profiles_join_type;

-- Remove the column
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS join_type;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After running this migration, verify:
-- 1. profiles table no longer has join_type column
-- 2. memberships table has join_type for all records
-- 3. Application continues to work correctly
-- 4. No errors in application logs

-- Query to verify profiles schema (run in psql):
-- \d profiles;

-- Query to verify memberships has join_type (run in psql):
-- SELECT COUNT(*) as total_memberships,
--        COUNT(join_type) as with_join_type,
--        COUNT(*) - COUNT(join_type) as missing_join_type
-- FROM public.memberships;
