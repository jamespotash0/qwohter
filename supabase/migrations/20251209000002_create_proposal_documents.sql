-- Migration: Create proposal_documents table for file attachments
-- Date: 2025-12-09
-- Description: Stores metadata for files uploaded to proposals.
--              Actual files stored in Supabase Storage bucket.

-- ============================================================================
-- CREATE TABLE
-- ============================================================================

CREATE TABLE public.proposal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- File metadata
  file_name text NOT NULL,
  storage_path text NOT NULL,  -- Path in Supabase Storage: {org_id}/{proposal_id}/{filename}
  file_size bigint,            -- Size in bytes
  mime_type text,              -- e.g., 'application/pdf', 'image/jpeg'

  -- Organization context
  tab_key text,                -- Which form tab this file belongs to (optional)
  description text,            -- Optional user-provided description

  -- Audit
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_proposal_documents_proposal_id ON public.proposal_documents(proposal_id);
CREATE INDEX idx_proposal_documents_organization_id ON public.proposal_documents(organization_id);
CREATE INDEX idx_proposal_documents_tab_key ON public.proposal_documents(tab_key) WHERE tab_key IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_proposal_documents_updated_at
  BEFORE UPDATE ON public.proposal_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents for proposals in their organization
CREATE POLICY "Users can view proposal documents in their organization"
  ON public.proposal_documents
  FOR SELECT
  USING (is_active_member(auth.uid(), organization_id));

-- Users can insert documents for proposals in their organization
CREATE POLICY "Users can upload documents to proposals in their organization"
  ON public.proposal_documents
  FOR INSERT
  WITH CHECK (is_active_member(auth.uid(), organization_id));

-- Users can update documents in their organization
CREATE POLICY "Users can update documents in their organization"
  ON public.proposal_documents
  FOR UPDATE
  USING (is_active_member(auth.uid(), organization_id));

-- Users can delete documents in their organization
CREATE POLICY "Users can delete documents in their organization"
  ON public.proposal_documents
  FOR DELETE
  USING (is_active_member(auth.uid(), organization_id));

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for proposal documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposal-documents',
  'proposal-documents',
  false,  -- Private bucket
  52428800,  -- 50MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for proposal-documents bucket
-- Path format: {organization_id}/{proposal_id}/{filename}

-- Allow authenticated users to upload files to their organization's folder
CREATE POLICY "Users can upload to their organization folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proposal-documents'
    AND is_active_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- Allow users to view files in their organization's folder
CREATE POLICY "Users can view files in their organization folder"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proposal-documents'
    AND is_active_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- Allow users to update files in their organization's folder
CREATE POLICY "Users can update files in their organization folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proposal-documents'
    AND is_active_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- Allow users to delete files in their organization's folder
CREATE POLICY "Users can delete files in their organization folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposal-documents'
    AND is_active_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.proposal_documents IS 'File attachments for proposals. Actual files stored in Supabase Storage, this table stores metadata and references.';
COMMENT ON COLUMN public.proposal_documents.storage_path IS 'Path to file in Supabase Storage bucket. Format: {organization_id}/{proposal_id}/{filename}';
COMMENT ON COLUMN public.proposal_documents.tab_key IS 'Optional reference to which form tab this document belongs to';
