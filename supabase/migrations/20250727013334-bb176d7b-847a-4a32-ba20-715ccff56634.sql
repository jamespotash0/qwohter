-- Fix organization creation issues and ensure proper security

-- First, update the handle_new_user function to set proper search_path 
-- and avoid creating profiles with inconsistent state
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Create the user's profile WITHOUT an organization
    -- User will choose to create or join organization in the UI flow
    INSERT INTO public.profiles (id, email, full_name, organization_id, role, status, joined_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NULL, 'member', 'pending', now());
    
    RETURN NEW;
END;
$function$;

-- Update all security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.user_has_role_in_org(org_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role = required_role
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_has_admin_role_in_org(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role IN ('admin', 'owner')
  );
$function$;

CREATE OR REPLACE FUNCTION public.approve_member(member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    member_org_id uuid;
BEGIN
    -- Get the member's organization
    SELECT organization_id INTO member_org_id 
    FROM public.profiles 
    WHERE id = member_id;
    
    -- Check if current user is admin/owner of that organization
    IF NOT user_has_admin_role_in_org(member_org_id) THEN
        RETURN false;
    END IF;
    
    -- Approve the member
    UPDATE public.profiles 
    SET status = 'active' 
    WHERE id = member_id AND status = 'pending';
    
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_member(member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    member_org_id uuid;
BEGIN
    -- Get the member's organization
    SELECT organization_id INTO member_org_id 
    FROM public.profiles 
    WHERE id = member_id;
    
    -- Check if current user is admin/owner of that organization
    IF NOT user_has_admin_role_in_org(member_org_id) THEN
        RETURN false;
    END IF;
    
    -- Remove the pending member
    DELETE FROM public.profiles 
    WHERE id = member_id AND status = 'pending';
    
    RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_quote_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.date_last_downloaded IS DISTINCT FROM OLD.date_last_downloaded AND NEW.date_last_downloaded IS NOT NULL THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$function$;