-- Make organization_id nullable in profiles table to allow users without organizations
ALTER TABLE public.profiles ALTER COLUMN organization_id DROP NOT NULL;

-- Update RLS policies to handle NULL organization_id cases
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;

-- Recreate policies with proper NULL handling
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (
  (id = auth.uid()) OR 
  (organization_id IS NOT NULL AND organization_id = get_current_user_organization())
);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());