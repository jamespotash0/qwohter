-- Fix RLS policy to allow invited users to read their own invite tokens
-- Problem: New users couldn't read tokens because they weren't members yet (chicken-and-egg)
-- Solution: Allow users to read tokens that match their authenticated email

BEGIN;

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view invite tokens for their organization" ON public.invite_tokens;

-- Create new policy: Existing members can view their org's tokens
CREATE POLICY "Members can view invite tokens for their organization" ON public.invite_tokens
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
    )
  );

-- Create new policy: Invited users can view tokens sent to their email
-- This allows new users to read the token during signup/join process
-- Uses auth.jwt() to get email from JWT claims (safe and doesn't require table access)
CREATE POLICY "Users can view invite tokens sent to their email" ON public.invite_tokens
  FOR SELECT
  USING (
    email = COALESCE(
      auth.jwt() ->> 'email',
      (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );


COMMIT;
