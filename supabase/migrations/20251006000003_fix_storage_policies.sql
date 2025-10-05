-- CRITICAL SECURITY FIX: Storage Bucket Policies
--
-- VULNERABILITY: Storage policies use auth.uid() instead of organization_id
-- ISSUE: When user leaves org, they still have access to logos. Original org loses access.
-- FIX: Use organization_id for folder structure, restrict to active org members
--
-- Migration: 20251006000003_fix_storage_policies.sql
-- Created: 2025-10-06

-- ============================================================================
-- 1. Drop old insecure policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their organization logos" ON storage.objects;

-- ============================================================================
-- 2. Create secure policies based on organization_id
-- ============================================================================

-- INSERT: Only Owner/Admin can upload organization logos
CREATE POLICY "Organization admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  )
);

-- SELECT: All active members can view their organization's logos
CREATE POLICY "Organization members can view logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
);

-- UPDATE: Only Owner/Admin can update organization logos
CREATE POLICY "Organization admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  )
);

-- DELETE: Only Owner/Admin can delete organization logos
CREATE POLICY "Organization admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  )
);

-- ============================================================================
-- 3. Add comments for documentation
-- ============================================================================

COMMENT ON POLICY "Organization admins can upload logos" ON storage.objects IS
'Only Owner/Admin of an organization can upload logos to their org folder';

COMMENT ON POLICY "Organization members can view logos" ON storage.objects IS
'All active members can view their organization logos';

COMMENT ON POLICY "Organization admins can update logos" ON storage.objects IS
'Only Owner/Admin can update organization logos';

COMMENT ON POLICY "Organization admins can delete logos" ON storage.objects IS
'Only Owner/Admin can delete organization logos';
