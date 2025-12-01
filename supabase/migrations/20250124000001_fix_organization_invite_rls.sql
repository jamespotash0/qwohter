-- Fix RLS policy for organizations to allow invited users to read organization data
-- Issue: New users with invite tokens couldn't query organizations during signup
-- because they don't have a membership yet (chicken-and-egg problem)

-- Add policy to allow authenticated users to view organizations they're invited to
CREATE POLICY "Authenticated users can view organizations they're invited to" ON public.organizations
  FOR SELECT
  USING (
    -- User is authenticated AND has an invite token for this organization
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.invite_tokens
      WHERE invite_tokens.organization_id = organizations.id
      AND invite_tokens.email = (auth.jwt() ->> 'email')
    )
  );

-- Note: This policy works alongside existing organization membership policies
-- Users can view organizations by:
-- 1. Having an active membership in the organization (existing policy)
-- 2. Having an invite token for the organization (new policy)
-- Uses JWT email instead of querying auth.users to avoid permission errors
