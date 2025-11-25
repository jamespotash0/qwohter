-- Fix RLS policy for invite tokens to allow invited users to access their token
-- Issue: New users couldn't query invite_tokens after OTP verification because
-- they don't have a membership yet (chicken-and-egg problem)

-- Add policy to allow authenticated users to view invite tokens that match their email
CREATE POLICY "Authenticated users can view their own invite tokens" ON public.invite_tokens
  FOR SELECT
  USING (
    -- User is authenticated
    auth.uid() IS NOT NULL
    -- AND the token's email matches the authenticated user's email
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Note: This policy works alongside the existing organization membership policy
-- Users can view tokens either by:
-- 1. Having an active membership in the organization (existing policy)
-- 2. Being the invited user with matching email (new policy)
