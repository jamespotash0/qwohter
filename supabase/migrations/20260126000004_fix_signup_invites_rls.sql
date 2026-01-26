-- Migration: Fix Signup Invites RLS Policies
-- Description:
--   1. Use is_super_admin() helper function for consistency
--   2. Fix overly permissive "mark as used" policy - require email match
--   3. Combine policies to avoid "multiple permissive policies" performance warning
--   4. Use (SELECT auth.email()) pattern for optimal query performance
--
-- The previous policy allowed anyone to mark invites as used, which could allow
-- unauthorized users to "burn" invites. Now requires:
--   - Authenticated user
--   - User's email matches the invite's email

-- =============================================================================
-- Drop existing policies
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can validate signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can create signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Anyone can mark signup invites as used" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can view all signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can update signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Authenticated users can update signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Authenticated user can mark their own signup invite as used" ON signup_invites;
DROP POLICY IF EXISTS "Select signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can delete signup invites" ON signup_invites;

-- =============================================================================
-- Recreate policies using is_super_admin() function
-- =============================================================================

-- Single SELECT policy that handles all cases:
-- - Super admins can see all invites (including expired/used)
-- - Anyone else (including anonymous) can only see valid invites for validation
--
-- This avoids the "multiple permissive policies" performance warning
CREATE POLICY "Select signup invites"
  ON signup_invites
  FOR SELECT
  USING (
    -- Super admin can see all invites
    public.is_super_admin()
    OR (
      -- Anyone else can only see valid (non-used, non-expired, non-revoked) invites
      NOT is_used
      AND revoked_at IS NULL
      AND expires_at > NOW()
    )
  );

-- Only super admins can create signup invites
CREATE POLICY "Super admins can create signup invites"
  ON signup_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

-- Single UPDATE policy that handles both cases:
-- 1. Super admins can update any invite (for revoking, admin actions, etc.)
-- 2. Regular users can only mark their own invite as used (email must match)
--
-- Uses (SELECT auth.email()) pattern for optimal query performance
CREATE POLICY "Authenticated users can update signup invites"
  ON signup_invites
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admin can update any invite
    public.is_super_admin()
    OR (
      -- Regular user can only update their own invite (email match)
      -- and only if it's not already used/revoked
      NOT is_used
      AND revoked_at IS NULL
      AND LOWER(email) = LOWER((SELECT auth.email()))
    )
  )
  WITH CHECK (
    -- Super admin can set any values
    public.is_super_admin()
    OR (
      -- Regular user can only set is_used to true (one-way transition)
      is_used = true
    )
  );

-- Super admins can delete signup invites (for cleanup)
CREATE POLICY "Super admins can delete signup invites"
  ON signup_invites
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- =============================================================================
-- Documentation
-- =============================================================================

COMMENT ON POLICY "Select signup invites" ON signup_invites IS
  'Combined SELECT policy: Super admins can view all invites. Others (including anonymous) can only view valid invites for validation purposes.';

COMMENT ON POLICY "Authenticated users can update signup invites" ON signup_invites IS
  'Combined UPDATE policy: Super admins can update any invite. Regular users can only mark their own invite (email match) as used. Uses (SELECT auth.email()) for optimal performance.';
