-- Add numbering_config JSONB column to organizations table
-- This stores document numbering preferences per document type
--
-- Structure:
-- {
--   "Proposal": { "prefix": "P-", "lastNumber": 1000, "padding": 4 },
--   "Quote": { "prefix": "Q", "lastNumber": 500, "padding": 0 },
--   "Estimate": { "prefix": "EST-", "lastNumber": 100, "padding": 3 }
-- }

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS numbering_config JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN organizations.numbering_config IS 'Document numbering configuration per document type. Keys are document types (Proposal, Quote, Bid, Estimate, Service_Request), values contain prefix, lastNumber, and padding settings.';
