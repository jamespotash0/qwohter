-- Add function to update user profile during signup (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_user_profile(user_id uuid, full_name_value text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result json;
BEGIN
    -- Update the profile with full name
    UPDATE public.profiles 
    SET 
        full_name = full_name_value,
        updated_at = now()
    WHERE id = user_id;
    
    -- If no profile was updated (doesn't exist), create one
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, email, full_name)
        SELECT user_id, au.email, full_name_value
        FROM auth.users au
        WHERE au.id = user_id;
    END IF;
    
    -- Return the updated profile
    SELECT to_json(p.*) INTO result
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RETURN result;
END;
$$;

-- Add function to update profile for organization creator (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_org_creator_profile(
    user_id uuid, 
    org_id uuid DEFAULT NULL,
    role_value text DEFAULT 'admin',
    status_value text DEFAULT 'active'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result json;
BEGIN
    -- Update the profile with organization details
    UPDATE public.profiles 
    SET 
        organization_id = COALESCE(org_id, organization_id),
        role = role_value,
        status = status_value,
        updated_at = now()
    WHERE id = user_id;
    
    -- Return the updated profile
    SELECT to_json(p.*) INTO result
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RETURN result;
END;
$$;

-- Add function to create organization and link user (single atomic operation)
CREATE OR REPLACE FUNCTION public.create_organization_and_link_user(
    org_name text,
    org_code text,
    creator_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    new_org_id uuid;
    result json;
BEGIN
    -- Create the organization
    INSERT INTO public.organizations (name, organization_code, organization_info, created_by)
    VALUES (org_name, org_code, '{}'::jsonb, creator_user_id)
    RETURNING id INTO new_org_id;
    
    -- Update the user's profile with the organization
    UPDATE public.profiles 
    SET 
        organization_id = new_org_id,
        role = 'admin',
        status = 'active',
        updated_at = now()
    WHERE id = creator_user_id;
    
    -- Return the organization data
    SELECT to_json(o.*) INTO result
    FROM public.organizations o
    WHERE o.id = new_org_id;
    
    RETURN result;
END;
$$;