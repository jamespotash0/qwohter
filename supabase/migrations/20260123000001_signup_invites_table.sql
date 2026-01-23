-- ============================================================================
-- Signup Invites Table (SECURED)
-- Stores invitation tokens created by the platform owner for new organizations
-- These invites allow users to sign up and create their own organization
--
-- Security measures:
-- 1. RLS enabled with strict policies
-- 2. RPC function uses SET search_path = '' to prevent schema injection
-- 3. Input validation for NULL/empty tokens
-- 4. Explicit REVOKE from PUBLIC before granting to specific roles
-- 5. STABLE marker for read-only function optimization
-- 6. INSERT restricted to super_admin users only
-- ============================================================================

CREATE TABLE IF NOT EXISTS signup_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional tracking fields
  created_by_user_id UUID REFERENCES auth.users(id),  -- Who created the invite
  revoked_at TIMESTAMPTZ,                              -- If invite was manually revoked
  revoked_by_user_id UUID REFERENCES auth.users(id),   -- Who revoked it
  email_sent_at TIMESTAMPTZ,                           -- When email was sent
  email_error TEXT                                     -- Any email sending error
);

-- Index for token lookups (unique constraint already creates index, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_signup_invites_token ON signup_invites(token);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_signup_invites_email ON signup_invites(email);

-- Index for cleanup queries (finding expired/used invites)
CREATE INDEX IF NOT EXISTS idx_signup_invites_status ON signup_invites(is_used, expires_at);

-- RLS Policies
ALTER TABLE signup_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for clean re-run)
DROP POLICY IF EXISTS "Anyone can validate signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can create signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Anyone can mark signup invites as used" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can view all signup invites" ON signup_invites;
DROP POLICY IF EXISTS "Super admins can update signup invites" ON signup_invites;

-- Allow anyone to read valid (non-used, non-expired) tokens for validation
-- This is needed for the sign-up flow to validate signup invite tokens
CREATE POLICY "Anyone can validate signup invites"
  ON signup_invites
  FOR SELECT
  USING (
    NOT is_used
    AND revoked_at IS NULL
    AND expires_at > NOW()
  );

-- Only super admins can create signup invites
-- Checks profiles.is_super_admin = true for the authenticated user
CREATE POLICY "Super admins can create signup invites"
  ON signup_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Super admins can view all signup invites (including expired/used)
CREATE POLICY "Super admins can view all signup invites"
  ON signup_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Allow marking as used during signup - restricted to prevent abuse
-- Only allows setting is_used from false to true (one-way transition)
-- Must be a valid (non-revoked) token
CREATE POLICY "Anyone can mark signup invites as used"
  ON signup_invites
  FOR UPDATE
  USING (
    NOT is_used
    AND revoked_at IS NULL
  )
  WITH CHECK (is_used = true);

-- Super admins can update signup invites (for revoking, etc.)
CREATE POLICY "Super admins can update signup invites"
  ON signup_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_super_admin = true
    )
  );

-- Drop existing function if exists
DROP FUNCTION IF EXISTS validate_signup_invite(TEXT);

-- Create secured validation function
-- Returns token data for valid tokens, empty result for invalid
CREATE OR REPLACE FUNCTION validate_signup_invite(token_value TEXT)
RETURNS TABLE (
  id UUID,
  token TEXT,
  email TEXT,
  expires_at TIMESTAMPTZ,
  is_used BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Input validation: reject NULL or empty tokens
  IF token_value IS NULL OR TRIM(token_value) = '' THEN
    RETURN;  -- Return empty result set for invalid input
  END IF;

  -- Use fully qualified table name (public schema)
  RETURN QUERY
  SELECT
    si.id,
    si.token,
    si.email,
    si.expires_at,
    si.is_used,
    si.created_at,
    si.updated_at
  FROM public.signup_invites si
  WHERE si.token = TRIM(token_value)
    AND si.is_used = FALSE
    AND si.revoked_at IS NULL
    AND si.expires_at > NOW();
END;
$$;

-- Revoke default public execute permission first
REVOKE ALL ON FUNCTION validate_signup_invite(TEXT) FROM PUBLIC;

-- Grant execute only to required roles
GRANT EXECUTE ON FUNCTION validate_signup_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_signup_invite(TEXT) TO authenticated;

-- Documentation
COMMENT ON TABLE signup_invites IS 'Stores invitation tokens for new organization sign-ups. Only the platform owner (super admin) can create these invites.';
COMMENT ON FUNCTION validate_signup_invite IS
  'Securely validates signup invite token for new organization signup.
   Uses SECURITY DEFINER to bypass RLS for anonymous token validation.
   Only returns data for valid (non-used, non-expired, non-revoked) tokens.';
