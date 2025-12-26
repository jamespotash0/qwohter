-- Add Google Docs support columns to proposals table
-- Templates are stored in forms.metadata (JSONB) per form

-- Add google_doc_id and presentation_mode columns to proposals table
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS google_doc_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS presentation_mode VARCHAR(50) DEFAULT 'richtext';

-- Comments for documentation
COMMENT ON COLUMN public.proposals.google_doc_id IS 'The generated Google Doc ID for this proposal';
COMMENT ON COLUMN public.proposals.presentation_mode IS 'Presentation mode: richtext or google-docs';
