-- Add organization_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create a function to get the first organization for existing users
CREATE OR REPLACE FUNCTION assign_default_organization()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    default_org_id UUID;
BEGIN
    -- For each user without an organization_id
    FOR user_record IN 
        SELECT id FROM public.profiles WHERE organization_id IS NULL
    LOOP
        -- Try to find an organization this user is a member of
        SELECT om.organization_id INTO default_org_id
        FROM public.organization_members om
        WHERE om.user_id = user_record.id
        LIMIT 1;
        
        -- If user is not a member of any organization, create one for them
        IF default_org_id IS NULL THEN
            INSERT INTO public.organizations (name, created_by)
            VALUES ('Personal Workspace', user_record.id)
            RETURNING id INTO default_org_id;
            
            -- Add user as owner of the new organization
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES (default_org_id, user_record.id, 'owner');
        END IF;
        
        -- Update the user's profile with the organization
        UPDATE public.profiles 
        SET organization_id = default_org_id 
        WHERE id = user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to assign organizations to existing users
SELECT assign_default_organization();

-- Make organization_id NOT NULL now that all users have organizations
ALTER TABLE public.profiles 
ALTER COLUMN organization_id SET NOT NULL;

-- Update quotes table to ensure all quotes have organization_id
UPDATE public.quotes 
SET organization_id = (
    SELECT p.organization_id 
    FROM public.profiles p 
    WHERE p.id = quotes.user_id
)
WHERE organization_id IS NULL;

-- Make organization_id NOT NULL in quotes table
ALTER TABLE public.quotes 
ALTER COLUMN organization_id SET NOT NULL;

-- Update profiles RLS policies to consider organization memberships
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (
    organization_id IN (
        SELECT p.organization_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

-- Update profile creation trigger to assign user to organization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create a new organization for the user
    INSERT INTO public.organizations (name, created_by)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Workspace'), NEW.id)
    RETURNING id INTO new_org_id;
    
    -- Create the user's profile with the organization
    INSERT INTO public.profiles (id, email, full_name, organization_id)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id);
    
    -- Add user as owner of the organization
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
    
    RETURN NEW;
END;
$$;

-- Clean up the temporary function
DROP FUNCTION assign_default_organization();