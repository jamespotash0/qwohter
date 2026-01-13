-- Migration: Rename quote_source to proposal_source in proposals table
-- Date: 2025-12-16
-- Description: Rename legacy quote_source column to proposal_source for consistency
-- ============================================================================

-- Rename the column
ALTER TABLE public.proposals
RENAME COLUMN quote_source TO proposal_source;

-- Drop old index and create new one with correct name
DROP INDEX IF EXISTS idx_proposals_quote_source;
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_source
ON proposals(proposal_source) WHERE proposal_source IS NOT NULL;

-- Update column comment
COMMENT ON COLUMN proposals.proposal_source IS 'Lead source for this proposal (e.g., Website, Referral, Cold Call)';
