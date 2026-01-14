-- Fix notifications INSERT policy to prevent recursion
-- The current policy directly queries memberships table which can cause issues
-- Solution: Use is_active_member SECURITY DEFINER function

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;

-- Create new INSERT policy using SECURITY DEFINER function
-- is_active_member() bypasses RLS to prevent recursion
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT
TO public
WITH CHECK (
  -- User must be authenticated and an active member of the organization
  auth.uid() IS NOT NULL
  AND is_active_member(auth.uid(), organization_id)
);

COMMENT ON POLICY "notifications_insert_policy" ON public.notifications IS
'Active members can create notifications for users in their organization. Uses SECURITY DEFINER function to prevent recursion.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
