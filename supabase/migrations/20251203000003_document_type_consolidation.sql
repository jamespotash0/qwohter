-- Migration: Document Type Consolidation
-- Date: 2025-12-03
-- Purpose: Replace form_type with document_type on forms and proposals
--          Removes form_type in favor of constrained document_type

-- ============================================================================
-- PART 1: Add document_type to forms (if not exists)
-- ============================================================================

-- Add document_type column to forms
ALTER TABLE forms
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'Proposal';

-- Migrate existing form_type data to document_type (only if form_type column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'forms' AND column_name = 'form_type'
  ) THEN
    UPDATE forms
    SET document_type = form_type
    WHERE form_type IN ('Proposal', 'Invoice', 'Service_Request')
      AND (document_type IS NULL OR document_type = 'Proposal');

    -- Drop the old form_type column after migration
    ALTER TABLE forms DROP COLUMN form_type;
  END IF;
END $$;

-- Add constraint for valid document types
ALTER TABLE forms
DROP CONSTRAINT IF EXISTS forms_document_type_check;

ALTER TABLE forms
ADD CONSTRAINT forms_document_type_check
CHECK (document_type IN ('Proposal', 'Invoice', 'Service_Request'));

COMMENT ON COLUMN forms.document_type IS 'Type of document this form creates (Proposal, Invoice, Service_Request)';

-- ============================================================================
-- PART 3: Add document_type to proposals table
-- ============================================================================

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'Proposal';

ALTER TABLE proposals
DROP CONSTRAINT IF EXISTS proposals_document_type_check;

ALTER TABLE proposals
ADD CONSTRAINT proposals_document_type_check
CHECK (document_type IN ('Proposal', 'Invoice', 'Service_Request'));

COMMENT ON COLUMN proposals.document_type IS 'Type of document (inherited from form at creation time)';

-- Index for filtering by document type
CREATE INDEX IF NOT EXISTS idx_proposals_document_type
ON proposals(organization_id, document_type);
