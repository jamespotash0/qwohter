-- Drop the problematic policy that's causing infinite recursion
DROP POLICY IF EXISTS "Users can view organization members" ON public.profiles;

-- Also remove the organizations policy temporarily to debug
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;