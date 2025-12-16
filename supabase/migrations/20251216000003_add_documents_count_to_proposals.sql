-- Migration: Add documents_count to proposals
-- This field tracks the count of documents attached to each proposal for quick reference

-- Add documents_count column
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS documents_count INTEGER DEFAULT 0;

-- Create index for querying proposals by document count
CREATE INDEX IF NOT EXISTS idx_proposals_documents_count ON proposals(documents_count) WHERE documents_count > 0;

-- Update existing proposals with their actual document counts
UPDATE public.proposals p
SET documents_count = (
  SELECT COUNT(*)
  FROM public.proposal_documents pd
  WHERE pd.proposal_id = p.id
);

-- Create trigger function to update documents_count automatically
CREATE OR REPLACE FUNCTION update_proposal_documents_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.proposals
    SET documents_count = documents_count + 1
    WHERE id = NEW.proposal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.proposals
    SET documents_count = GREATEST(documents_count - 1, 0)
    WHERE id = OLD.proposal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic count updates
DROP TRIGGER IF EXISTS trigger_proposal_documents_count_insert ON proposal_documents;
CREATE TRIGGER trigger_proposal_documents_count_insert
  AFTER INSERT ON proposal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_documents_count();

DROP TRIGGER IF EXISTS trigger_proposal_documents_count_delete ON proposal_documents;
CREATE TRIGGER trigger_proposal_documents_count_delete
  AFTER DELETE ON proposal_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_documents_count();
