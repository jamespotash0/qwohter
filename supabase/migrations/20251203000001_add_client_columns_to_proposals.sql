-- Migration: Add client info direct columns to proposals table
-- Date: 2025-12-03
-- Purpose: Store key client info as direct columns for faster querying/filtering
-- while still keeping full data in form_data JSONB

-- ============================================================================
-- PART 1: Add direct columns for client info
-- ============================================================================

-- Client name (contact person)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Client company (required field in UI)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS client_company TEXT;

-- Job location (required field in UI, for filtering by location)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS job_location TEXT;

-- Total value (for sorting/filtering, populated from computed_totals or form_data)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS total_value DECIMAL(12,2);

-- Template type (e.g., 'generic_wall', 'base', 'smart')
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS template_type TEXT;

-- Whether proposal is displayed on the board view
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS is_on_board BOOLEAN DEFAULT false;

-- Source of the quote (e.g., 'Website', 'Referral', 'Cold Call', etc.)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS quote_source TEXT;

-- ============================================================================
-- PART 2: Add indexes for new columns
-- ============================================================================

-- Index for client_company (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_proposals_client_company
ON proposals(client_company);

-- Index for job_location (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_proposals_job_location
ON proposals(job_location);

-- Index for total_value (for sorting by value)
CREATE INDEX IF NOT EXISTS idx_proposals_total_value
ON proposals(total_value) WHERE total_value IS NOT NULL;

-- Composite index for organization + client_company (common filter pattern)
CREATE INDEX IF NOT EXISTS idx_proposals_org_client
ON proposals(organization_id, client_company);

-- Index for is_on_board (for board view filtering)
CREATE INDEX IF NOT EXISTS idx_proposals_is_on_board
ON proposals(organization_id, is_on_board) WHERE is_on_board = true;

-- Index for quote_source (for analytics/filtering by source)
CREATE INDEX IF NOT EXISTS idx_proposals_quote_source
ON proposals(quote_source) WHERE quote_source IS NOT NULL;

-- ============================================================================
-- PART 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN proposals.client_name IS 'Contact person name for the client';
COMMENT ON COLUMN proposals.client_company IS 'Company/organization name of the client (required)';
COMMENT ON COLUMN proposals.job_location IS 'Physical location where work will be performed (required)';
COMMENT ON COLUMN proposals.total_value IS 'Total proposal value for quick sorting/filtering (denormalized from computed_totals)';
COMMENT ON COLUMN proposals.template_type IS 'PDF template type used for this proposal (e.g., generic_wall, base, smart)';
COMMENT ON COLUMN proposals.is_on_board IS 'Whether this proposal appears on the kanban board view';
COMMENT ON COLUMN proposals.quote_source IS 'Lead source for this quote (e.g., Website, Referral, Cold Call)';
