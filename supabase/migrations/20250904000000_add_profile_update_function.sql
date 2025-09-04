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
    -- SECURITY: Ensure user can only update their own profile
    IF user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only update own profile';
    END IF;
    
    -- SECURITY: Validate full name input
    IF full_name_value IS NULL OR length(trim(full_name_value)) < 1 THEN
        RAISE EXCEPTION 'Full name cannot be empty';
    END IF;
    
    IF length(full_name_value) > 100 THEN
        RAISE EXCEPTION 'Full name cannot exceed 100 characters';
    END IF;
    
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
    -- SECURITY: Ensure user can only update their own profile
    IF user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only update own profile';
    END IF;
    
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
    -- SECURITY: Ensure user can only create org for themselves
    IF creator_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied: Can only create organization for yourself';
    END IF;
    
    -- SECURITY: Validate organization name
    IF org_name IS NULL OR length(trim(org_name)) < 2 THEN
        RAISE EXCEPTION 'Organization name must be at least 2 characters';
    END IF;
    
    IF length(org_name) > 100 THEN
        RAISE EXCEPTION 'Organization name cannot exceed 100 characters';
    END IF;
    
    -- SECURITY: Validate organization code format
    IF org_code IS NULL OR length(org_code) != 8 THEN
        RAISE EXCEPTION 'Organization code must be exactly 8 characters';
    END IF;
    
    IF org_code !~ '^[A-Z0-9]{8}$' THEN
        RAISE EXCEPTION 'Organization code must contain only uppercase letters and numbers';
    END IF;
    
    -- SECURITY: Check if user already has an organization
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = creator_user_id AND organization_id IS NOT NULL) THEN
        RAISE EXCEPTION 'User already belongs to an organization';
    END IF;
    
    -- SECURITY: Ensure organization code is unique
    IF EXISTS (SELECT 1 FROM public.organizations WHERE organization_code = org_code) THEN
        RAISE EXCEPTION 'Organization code already exists. Please try again.';
    END IF;
    
    -- SECURITY: Rate limiting - max 3 organization creation attempts per hour
    PERFORM public.cleanup_org_rate_limits(); -- Clean up old records first
    
    IF (SELECT count(*) FROM public.organization_creation_rate_limit WHERE user_id = creator_user_id AND created_at > now() - interval '1 hour') >= 3 THEN
        RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 organization creation attempts per hour';
    END IF;
    
    -- Record this attempt for rate limiting
    INSERT INTO public.organization_creation_rate_limit (user_id) VALUES (creator_user_id);
    
    -- Create the organization
    INSERT INTO public.organizations (name, organization_code, organization_info)
    VALUES (org_name, org_code, '{}'::jsonb)
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

-- Create rate limiting table for organization creation
CREATE TABLE IF NOT EXISTS public.organization_creation_rate_limit (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, created_at)
);

-- Add index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_org_rate_limit_created_at ON public.organization_creation_rate_limit(created_at);

-- Function to clean up old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_org_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    DELETE FROM public.organization_creation_rate_limit 
    WHERE created_at < now() - interval '1 hour';
END;
$$;