-- Fix storage policies to use SECURITY DEFINER functions
-- The current policies query memberships table directly, which can cause RLS recursion issues
-- Solution: Use existing SECURITY DEFINER helper functions

-- Drop existing policies
DROP POLICY IF EXISTS "Organization admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can delete logos" ON storage.objects;

-- Helper function to get user's organization folders (returns organization_id as text)
CREATE OR REPLACE FUNCTION get_user_org_folders(check_user_id uuid)
RETURNS TABLE (org_folder text) AS $$
BEGIN
  RETURN QUERY
  SELECT m.organization_id::text
  FROM public.memberships m
  WHERE m.user_id = check_user_id
  AND m.status = 'Active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_org_folders(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_org_folders(uuid) IS
'Get organization folder names for user. SECURITY DEFINER bypasses RLS.';

-- Helper function to check if user is admin in specific org folder
CREATE OR REPLACE FUNCTION is_org_folder_admin(check_user_id uuid, folder_name text)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
  org_uuid uuid;
BEGIN
  -- Convert folder name (text) to UUID
  BEGIN
    org_uuid := folder_name::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  -- Check if user is Owner/Admin in this org
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
    AND organization_id = org_uuid
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ) INTO is_admin;

  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_org_folder_admin(uuid, text) TO authenticated;

COMMENT ON FUNCTION is_org_folder_admin(uuid, text) IS
'Check if user is Owner/Admin in specific org folder. SECURITY DEFINER bypasses RLS.';

-- ============================================================================
-- Create secure storage policies using SECURITY DEFINER functions
-- ============================================================================

-- INSERT: Only Owner/Admin can upload organization logos
CREATE POLICY "Organization admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND is_org_folder_admin(auth.uid(), (storage.foldername(name))[1])
);

-- SELECT: All active members can view their organization's logos
CREATE POLICY "Organization members can view logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT org_folder FROM get_user_org_folders(auth.uid())
  )
);

-- UPDATE: Only Owner/Admin can update organization logos
CREATE POLICY "Organization admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND is_org_folder_admin(auth.uid(), (storage.foldername(name))[1])
);

-- DELETE: Only Owner/Admin can delete organization logos
CREATE POLICY "Organization admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND is_org_folder_admin(auth.uid(), (storage.foldername(name))[1])
);

-- Add comments
COMMENT ON POLICY "Organization admins can upload logos" ON storage.objects IS
'Only Owner/Admin can upload logos. Uses SECURITY DEFINER to prevent RLS recursion.';

COMMENT ON POLICY "Organization members can view logos" ON storage.objects IS
'All active members can view their organization logos. Uses SECURITY DEFINER.';

COMMENT ON POLICY "Organization admins can update logos" ON storage.objects IS
'Only Owner/Admin can update logos. Uses SECURITY DEFINER to prevent RLS recursion.';

COMMENT ON POLICY "Organization admins can delete logos" ON storage.objects IS
'Only Owner/Admin can delete logos. Uses SECURITY DEFINER to prevent RLS recursion.';
