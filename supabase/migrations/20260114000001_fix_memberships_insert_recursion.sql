-- Fix infinite recursion in memberships INSERT policy
-- The issue: The INSERT policy has an inline EXISTS query against memberships table
-- that triggers RLS evaluation, causing infinite recursion.
--
-- Current problematic policy:
-- WITH CHECK ((user_id = auth.uid())
--   OR has_org_role(auth.uid(), organization_id, ARRAY['Owner', 'Admin'])
--   OR NOT EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = memberships.organization_id))
--
-- The NOT EXISTS clause directly queries memberships without SECURITY DEFINER,
-- triggering RLS evaluation recursively.
--
-- Solution: Create a SECURITY DEFINER function for the "first member" check.

-- Create function to check if an organization has any members
-- Uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.org_has_no_members(check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE organization_id = check_org_id
  );
END;
$function$;

COMMENT ON FUNCTION public.org_has_no_members(uuid) IS
'Check if an organization has no members. Uses SECURITY DEFINER to bypass RLS and prevent recursion in memberships INSERT policy.';

GRANT EXECUTE ON FUNCTION public.org_has_no_members(uuid) TO authenticated;

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "memberships_insert_policy" ON public.memberships;

-- Create new INSERT policy using the SECURITY DEFINER function
CREATE POLICY "memberships_insert_policy" ON public.memberships
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    -- User can create their own membership
    user_id = auth.uid()
    -- OR admin/owner can create memberships for others
    OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])
    -- OR it's the first member of the organization (no recursion now!)
    OR org_has_no_members(organization_id)
  )
);

COMMENT ON POLICY "memberships_insert_policy" ON public.memberships IS
'Users can create own memberships, admins can invite others, or first member can join empty org. Uses SECURITY DEFINER functions to prevent recursion.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
