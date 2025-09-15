-- Add function to update member role (admin can promote/demote members)
CREATE OR REPLACE FUNCTION public.update_member_role(
    member_id uuid,
    new_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    member_org_id uuid;
    current_user_org_id uuid;
    member_data json;
BEGIN
    -- Validate role input
    IF new_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin or member';
    END IF;
    
    -- Get the member's organization
    SELECT organization_id INTO member_org_id 
    FROM public.profiles 
    WHERE id = member_id;
    
    IF member_org_id IS NULL THEN
        RAISE EXCEPTION 'Member not found or not in any organization';
    END IF;
    
    -- Get current user's organization
    SELECT organization_id INTO current_user_org_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Check if current user is in the same organization
    IF current_user_org_id != member_org_id THEN
        RAISE EXCEPTION 'Access denied: Can only manage members in your organization';
    END IF;
    
    -- Check if current user has admin/owner role
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND organization_id = member_org_id 
        AND role IN ('admin', 'owner')
    ) THEN
        RAISE EXCEPTION 'Access denied: Only admins can update member roles';
    END IF;
    
    -- Prevent changing owner role
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = member_id AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Cannot change owner role';
    END IF;
    
    -- Update the member's role
    UPDATE public.profiles 
    SET 
        role = new_role,
        updated_at = now()
    WHERE id = member_id;
    
    -- Return updated member data
    SELECT to_json(p.*) INTO member_data
    FROM public.profiles p
    WHERE p.id = member_id;
    
    RETURN member_data;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_member_role(uuid, text) TO authenticated;