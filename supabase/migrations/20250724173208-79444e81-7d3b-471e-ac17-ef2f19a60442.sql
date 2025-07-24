-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_has_role_in_org(org_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_admin_role_in_org(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id = org_id 
    AND role IN ('admin', 'owner')
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can create organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update organization quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can delete organization quotes" ON public.quotes;

DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Organization admins can update" ON public.organizations;

DROP POLICY IF EXISTS "Uers can view profiles in their organization" ON public.profiles;

-- Create new simple RLS policies using security definer functions
CREATE POLICY "Users can view organization quotes" 
ON public.quotes 
FOR SELECT 
USING (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (organization_id = public.get_current_user_organization())
);

CREATE POLICY "Users can create organization quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (organization_id = public.get_current_user_organization())
);

CREATE POLICY "Users can update organization quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (organization_id = public.get_current_user_organization())
);

CREATE POLICY "Admins can delete organization quotes" 
ON public.quotes 
FOR DELETE 
USING (
  ((organization_id IS NULL) AND (auth.uid() = user_id)) 
  OR (public.user_has_admin_role_in_org(organization_id))
);

CREATE POLICY "Users can view organizations they belong to" 
ON public.organizations 
FOR SELECT 
USING (id = public.get_current_user_organization());

CREATE POLICY "Organization admins can update" 
ON public.organizations 
FOR UPDATE 
USING (public.user_has_admin_role_in_org(id));

CREATE POLICY "Users can view profiles in their organization" 
ON public.profiles 
FOR SELECT 
USING (organization_id = public.get_current_user_organization());