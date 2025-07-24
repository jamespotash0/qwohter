-- Step 1: Add role-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role text NOT NULL DEFAULT 'member',
ADD COLUMN invited_by uuid,
ADD COLUMN joined_at timestamp with time zone NOT NULL DEFAULT now();

-- Step 2: Migrate existing data from organization_members to profiles
UPDATE public.profiles 
SET role = om.role,
    invited_by = om.user_id, -- This might need adjustment based on your needs
    joined_at = om.joined_at
FROM public.organization_members om
WHERE profiles.id = om.user_id;

-- Step 3: Drop the organization_members table
DROP TABLE public.organization_members;

-- Step 4: Update RLS policies for quotes table to use profiles.role
DROP POLICY IF EXISTS "Admins can delete organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update organization quotes" ON public.quotes;

-- Create new RLS policies using profiles.role
CREATE POLICY "Admins can delete organization quotes" 
ON public.quotes 
FOR DELETE 
USING (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = quotes.organization_id 
    AND profiles.role IN ('admin', 'owner')
  ))
);

CREATE POLICY "Users can create organization quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = quotes.organization_id
  ))
);

CREATE POLICY "Users can update organization quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = quotes.organization_id
  ))
);

-- Step 5: Update RLS policies for organizations table
DROP POLICY IF EXISTS "Organization admins can update" ON public.organizations;

CREATE POLICY "Organization admins can update" 
ON public.organizations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = organizations.id 
    AND profiles.role IN ('admin', 'owner')
  )
);

-- Step 6: Update handle_new_user function to set role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create a new organization for the user
    INSERT INTO public.organizations (name, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Workspace'), NEW.id)
    RETURNING id INTO new_org_id;
    
    -- Create the user's profile with the organization and owner role
    INSERT INTO public.profiles (id, email, full_name, organization_id, role, joined_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id, 'owner', now());
    
    RETURN NEW;
END;
$$;