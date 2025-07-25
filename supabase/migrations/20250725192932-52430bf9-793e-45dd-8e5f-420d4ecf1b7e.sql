-- Add status column to profiles table for member approval workflow
ALTER TABLE public.profiles 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add constraint to ensure valid status values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('pending', 'active', 'suspended'));

-- Update existing profiles to be active
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;

-- Add organization_code column to organizations for easy joining
ALTER TABLE public.organizations 
ADD COLUMN organization_code text UNIQUE;

-- Generate unique codes for existing organizations
UPDATE public.organizations 
SET organization_code = UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8))
WHERE organization_code IS NULL;

-- Make organization_code required for new organizations
ALTER TABLE public.organizations 
ALTER COLUMN organization_code SET NOT NULL;

-- Update RLS policies to handle pending members
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (
  organization_id = get_current_user_organization() OR 
  id = auth.uid()
);

-- Allow pending users to update their own profile during signup
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;

CREATE POLICY "Users can update their profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- Update quotes policies to only show for active members
DROP POLICY IF EXISTS "Users can view organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update organization quotes" ON public.quotes;

CREATE POLICY "Users can view organization quotes" 
ON public.quotes 
FOR SELECT 
USING (
  (organization_id IS NULL AND auth.uid() = user_id) OR 
  (organization_id = get_current_user_organization() AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'))
);

CREATE POLICY "Users can create organization quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (
  (organization_id IS NULL AND auth.uid() = user_id) OR 
  (organization_id = get_current_user_organization() AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'))
);

CREATE POLICY "Users can update organization quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  (organization_id IS NULL AND auth.uid() = user_id) OR 
  (organization_id = get_current_user_organization() AND 
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active'))
);

-- Function to approve a member (only admins can call this)
CREATE OR REPLACE FUNCTION public.approve_member(member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to reject a member (only admins can call this)
CREATE OR REPLACE FUNCTION public.reject_member(member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;