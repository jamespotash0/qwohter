-- ============================================================================
-- Fix Invite Token Validation (SECURED)
-- Creates an RPC function that returns error type for invalid tokens
--
-- Security measures:
-- 1. SET search_path = '' prevents schema injection attacks
-- 2. Input validation for NULL/empty tokens
-- 3. Minimal data returned for invalid tokens (no sensitive data leakage)
-- 4. Explicit REVOKE from PUBLIC before granting to specific roles
-- 5. STABLE marker for read-only function optimization
-- ============================================================================

-- Drop existing function if exists (with all signatures)
DROP FUNCTION IF EXISTS validate_invite_token_with_error(TEXT);

-- Create secured validation function that returns error type
CREATE OR REPLACE FUNCTION validate_invite_token_with_error(token_value TEXT)
RETURNS TABLE (
  id UUID,
  token TEXT,
  email TEXT,
  organization_id UUID,
  role TEXT,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_used BOOLEAN,
  department TEXT,
  revoked_at TIMESTAMPTZ,
  error_type TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Input validation: reject NULL or empty tokens
  IF token_value IS NULL OR TRIM(token_value) = '' THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::BOOLEAN,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'NotFound'::TEXT;
    RETURN;
  END IF;

  -- Use fully qualified table name (public schema)
  SELECT
    it.id,
    it.token,
    it.email,
    it.organization_id,
    it.role,
    it.created_by,
    it.expires_at,
    it.created_at,
    it.is_used,
    it.department,
    it.revoked_at
  INTO token_record
  FROM public.invite_tokens it
  WHERE it.token = TRIM(token_value);

  -- Token not found - return minimal info (no sensitive data)
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      NULL::BOOLEAN,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'NotFound'::TEXT;
    RETURN;
  END IF;

  -- Token found but used - return error type with minimal identifying info
  -- (exclude sensitive fields like created_by for invalid tokens)
  IF token_record.is_used THEN
    RETURN QUERY SELECT
      token_record.id,
      NULL::TEXT,  -- Don't expose token value
      token_record.email,  -- Needed for UX ("this invite for email@... was already used")
      NULL::UUID,  -- Don't expose org for used tokens
      NULL::TEXT,  -- Don't expose role
      NULL::UUID,  -- Don't expose created_by
      token_record.expires_at,
      token_record.created_at,
      token_record.is_used,
      NULL::TEXT,  -- Don't expose department
      NULL::TIMESTAMPTZ,
      'Used'::TEXT;
    RETURN;
  END IF;

  -- Token found but revoked - return error type with minimal info
  IF token_record.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT
      token_record.id,
      NULL::TEXT,
      token_record.email,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      token_record.expires_at,
      token_record.created_at,
      token_record.is_used,
      NULL::TEXT,
      token_record.revoked_at,
      'Revoked'::TEXT;
    RETURN;
  END IF;

  -- Token found but expired - return error type with minimal info
  IF token_record.expires_at < NOW() THEN
    RETURN QUERY SELECT
      token_record.id,
      NULL::TEXT,
      token_record.email,
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID,
      token_record.expires_at,
      token_record.created_at,
      token_record.is_used,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'Expired'::TEXT;
    RETURN;
  END IF;

  -- Token is valid - return full data needed for signup flow
  RETURN QUERY SELECT
    token_record.id,
    token_record.token,
    token_record.email,
    token_record.organization_id,
    token_record.role::TEXT,
    token_record.created_by,
    token_record.expires_at,
    token_record.created_at,
    token_record.is_used,
    token_record.department,
    token_record.revoked_at,
    NULL::TEXT; -- No error = valid token
END;
$$;

-- Revoke default public execute permission first
REVOKE ALL ON FUNCTION validate_invite_token_with_error(TEXT) FROM PUBLIC;

-- Grant execute only to required roles (anon for pre-signup, authenticated for logged-in users)
GRANT EXECUTE ON FUNCTION validate_invite_token_with_error(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_invite_token_with_error(TEXT) TO authenticated;

-- Documentation
COMMENT ON FUNCTION validate_invite_token_with_error IS
  'Securely validates invite token and returns error type if invalid (Used, Revoked, Expired, NotFound).
   Uses SECURITY DEFINER to bypass RLS for anonymous token validation.
   Returns minimal data for invalid tokens to prevent information leakage.';
