-- Add SELECT policy for organizations table so users can see their organization details
CREATE POLICY "Users can view their organization" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND organization_id IS NOT NULL
  )
);

-- Add policy to allow users to see organization members in their organization  
CREATE POLICY "Users can view organization members" 
ON public.profiles 
FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND organization_id IS NOT NULL
  )
);