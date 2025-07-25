-- Update the handle_new_user trigger function to include organization_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    new_org_id UUID;
    org_code TEXT;
BEGIN
    -- Generate unique organization code
    org_code := UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));
    
    -- Create a new organization for the user with organization_code
    INSERT INTO public.organizations (name, created_by, organization_code)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Workspace'), NEW.id, org_code)
    RETURNING id INTO new_org_id;
    
    -- Create the user's profile with the organization and owner role
    INSERT INTO public.profiles (id, email, full_name, organization_id, role, status, joined_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id, 'owner', 'active', now());
    
    RETURN NEW;
END;
$$;