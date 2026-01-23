-- ============================================================================
-- Add is_super_admin column to profiles table
-- Used to identify platform administrators who can:
-- - Access the admin panel
-- - Create signup invites for new organizations
-- - Manage platform-wide settings
-- ============================================================================

-- Add the column with default false
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- SET PLATFORM ADMIN
-- Replace 'YOUR-USER-ID-HERE' with your actual user UUID from auth.users
-- ============================================================================
-- UPDATE profiles SET is_super_admin = TRUE WHERE id = 'YOUR-USER-ID-HERE';

-- Create index for quick lookups (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin
ON profiles(is_super_admin)
WHERE is_super_admin = true;

-- Documentation
COMMENT ON COLUMN profiles.is_super_admin IS
  'Platform administrator flag. Super admins can access the admin panel and create signup invites.';
