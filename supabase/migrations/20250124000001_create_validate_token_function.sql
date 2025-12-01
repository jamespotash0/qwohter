-- Create a secure function to validate invite tokens
-- This bypasses RLS so anonymous users can validate tokens during signup
-- SECURITY DEFINER means it runs with the privileges of the function owner (bypasses RLS)

BEGIN;

-- Drop existing RLS policies (we'll replace with function-based approach for validation)
DROP POLICY IF EXISTS "Users can view invite tokens sent to their email" ON public.invite_tokens;

-- Keep the policy for authenticated members to view their org's tokens
-- (This one stays because it's for the admin panel)

-- Create a secure function to validate tokens (bypasses RLS)
CREATE OR REPLACE FUNCTION public.validate_invite_token(token_value TEXT)
RETURNS TABLE (
  id UUID,
  token TEXT,
  email TEXT,
  organization_id UUID,
  role TEXT,
  department TEXT,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_used BOOLEAN,
  revoked_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Return token data if it's valid (not used, not revoked, not expired)
  RETURN QUERY
  SELECT
    t.id,
    t.token,
    t.email,
    t.organization_id,
    t.role,
    t.department,
    t.created_by,
    t.expires_at,
    t.created_at,
    t.updated_at,
    t.is_used,
    t.revoked_at
  FROM invite_tokens t
  WHERE t.token = token_value
    AND t.is_used = false
    AND t.revoked_at IS NULL
    AND t.expires_at > NOW()
  LIMIT 1;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.validate_invite_token(TEXT) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_invite_token IS 'Securely validates invite tokens for anonymous users during signup. Bypasses RLS to allow token validation before authentication.';

RAISE NOTICE '✅ Created secure validate_invite_token function';

COMMIT;
