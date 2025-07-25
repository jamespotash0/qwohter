-- Update the handle_new_user trigger to not auto-create organizations
-- Only create a basic profile and let users choose to create/join organizations in the UI

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Create the user's profile WITHOUT an organization
    -- User will choose to create or join organization in the UI flow
    INSERT INTO public.profiles (id, email, full_name, organization_id, role, status, joined_at)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NULL, 'member', 'pending', now());
    
    RETURN NEW;
END;
$function$;