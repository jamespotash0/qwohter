-- Fix infinite recursion in profiles RLS policy
-- The previous policy still had circular references, this creates a truly simple policy

-- Drop the problematic profiles select policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Create a much simpler profiles select policy that avoids recursion
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  -- Allow anonymous access for signup email checking
  auth.uid() IS NULL OR
  -- Allow users to view their own profile
  auth.uid() = id OR
  -- Allow viewing profiles if user is authenticated (simplified)
  auth.uid() IS NOT NULL
);

-- Alternative: Even simpler policy for debugging
-- Uncomment this and comment above if still having issues:
/*
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (true);
*/

-- Comment on the policy
COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS 'Simple policy: anonymous users can check emails, authenticated users can view profiles';

-- Ensure anonymous users have SELECT permission
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;