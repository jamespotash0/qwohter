-- ============================================================================
-- Storage RLS Policies for projects-attachments bucket
-- ============================================================================
-- Run this in Supabase SQL Editor after creating the bucket

-- Allow authenticated users to upload files to their organization folder
CREATE POLICY "Users can upload files to their organization folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'projects-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow authenticated users to view files from their organization folder
CREATE POLICY "Users can view files from their organization folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'projects-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow authenticated users to delete files from their organization folder
CREATE POLICY "Users can delete files from their organization folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'projects-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );
