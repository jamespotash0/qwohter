-- ============================================================================
-- Project Attachments Table
-- ============================================================================
-- This table stores file attachments for projects (drawings, invoices, photos, etc.)
-- Execute this in Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  category TEXT CHECK (category IN ('drawing', 'invoice', 'photo', 'contract', 'specification', 'proposal', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX idx_project_attachments_organization_id ON project_attachments(organization_id);
CREATE INDEX idx_project_attachments_category ON project_attachments(category);
CREATE INDEX idx_project_attachments_created_at ON project_attachments(created_at DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- Allow users to view attachments from their organization's projects
CREATE POLICY "Users can view attachments from their organization"
  ON project_attachments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow users to upload attachments to their organization's projects
CREATE POLICY "Users can upload attachments to their organization projects"
  ON project_attachments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow users to update attachments they uploaded
CREATE POLICY "Users can update their own attachments"
  ON project_attachments FOR UPDATE
  USING (
    uploaded_by = auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow users to delete attachments from their organization
CREATE POLICY "Users can delete attachments from their organization"
  ON project_attachments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- ============================================================================
-- Storage Bucket Configuration
-- ============================================================================
-- Execute this in Supabase SQL Editor or Dashboard

-- 1. Create storage bucket 'project-attachments' in Supabase Dashboard:
--    - Go to Storage -> Create Bucket
--    - Name: project-attachments
--    - Public: No (private bucket for security - uses signed URLs)
--    - File size limit: 50MB per file
--    - Allowed MIME types: Leave empty or specify (pdf, images, documents)

-- 2. Storage RLS Policies (run in SQL Editor):

-- Allow authenticated users to upload files to their organization folder
CREATE POLICY "Users can upload files to their organization folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow authenticated users to view files from their organization folder
CREATE POLICY "Users can view files from their organization folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- Allow authenticated users to delete files from their organization folder
CREATE POLICY "Users can delete files from their organization folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_attachments_updated_at
  BEFORE UPDATE ON project_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_attachments_updated_at();
