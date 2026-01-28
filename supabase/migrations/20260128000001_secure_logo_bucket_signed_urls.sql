-- Migration: Secure Logo Bucket with Signed URLs
-- Description: Data cleanup for signed URL migration
--
-- IMPORTANT: The bucket must be set to private manually via Supabase Dashboard:
--   1. Go to Storage > organization-logos bucket
--   2. Click "Edit bucket"
--   3. Ensure "Public bucket" is UNCHECKED (private)
--   4. Save changes
--
-- Or via Supabase CLI:
--   supabase storage update organization-logos --public=false
--
-- This migration handles data cleanup only.
--
-- NOTE: Files are now named with UUIDs to prevent enumeration attacks
-- NOTE: Access is via signed URLs only (no public access)

-- =============================================================================
-- SECTION 1: Cleanup - Remove deprecated logo_public_url from existing data
-- =============================================================================

-- Update organizations to remove deprecated logo_public_url from logo_data JSONB
-- This is a data cleanup - the field is no longer used
UPDATE public.organizations
SET logo_data = logo_data - 'logo_public_url'
WHERE logo_data ? 'logo_public_url';

-- =============================================================================
-- SECTION 2: Add index for faster logo lookups if not exists
-- =============================================================================

-- Create index on logo_data for organizations that have logos
CREATE INDEX IF NOT EXISTS idx_organizations_has_logo
ON public.organizations ((logo_data IS NOT NULL))
WHERE logo_data IS NOT NULL;
