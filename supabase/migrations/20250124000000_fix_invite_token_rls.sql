-- Fix RLS policy for invite tokens to allow invited users to access their token
-- Issue: New users couldn't query invite_tokens after OTP verification because
-- they don't have a membership yet (chicken-and-egg problem)

-- Add policy to allow authenticated users to view invite tokens that match their email
CREATE POLICY "Authenticated users can view their own invite tokens" ON public.invite_tokens
  FOR SELECT
  USING (
    -- User is authenticated AND token's email matches the user's email from JWT
    auth.uid() IS NOT NULL
    AND email = (auth.jwt() ->> 'email')
  );

-- Note: This policy works alongside the existing organization membership policy
-- Users can view tokens either by:
-- 1. Having an active membership in the organization (existing policy)
-- 2. Being the invited user with matching email (new policy)
-- Uses JWT email instead of querying auth.users to avoid permission errors
