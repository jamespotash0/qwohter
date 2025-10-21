-- Add denormalized analytics fields to quotes table for fast queries

ALTER TABLE quotes
-- Financial fields (extracted from price_details JSONB)
ADD COLUMN total_value DECIMAL(12,2),           -- Final selling price
ADD COLUMN subtotal DECIMAL(12,2),              -- Before adjustments
ADD COLUMN margin_percentage DECIMAL(5,2),      -- Profit margin

-- Key timestamps for analytics (denormalized from transitions)
ADD COLUMN submitted_at TIMESTAMPTZ,            -- When moved to Submitted status
ADD COLUMN won_at TIMESTAMPTZ,                  -- When marked Won
ADD COLUMN rejected_at TIMESTAMPTZ,             -- When marked Rejected
ADD COLUMN closed_at TIMESTAMPTZ;               -- Won or Rejected date (for grouping)

-- Indexes for analytics queries
CREATE INDEX idx_quotes_total_value ON quotes(total_value) WHERE total_value IS NOT NULL;
CREATE INDEX idx_quotes_org_created ON quotes(organization_id, created_at DESC);
CREATE INDEX idx_quotes_org_status ON quotes(organization_id, status);
CREATE INDEX idx_quotes_won_date ON quotes(organization_id, won_at DESC) WHERE won_at IS NOT NULL;
CREATE INDEX idx_quotes_submitted_date ON quotes(organization_id, submitted_at DESC) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_quotes_closed_date ON quotes(organization_id, closed_at DESC) WHERE closed_at IS NOT NULL;

COMMENT ON COLUMN quotes.total_value IS 'Denormalized from price_details.final_selling_price - updated via trigger';
COMMENT ON COLUMN quotes.submitted_at IS 'Timestamp when quote status changed to Submitted';
COMMENT ON COLUMN quotes.won_at IS 'Timestamp when quote status changed to Won - used for revenue recognition';
COMMENT ON COLUMN quotes.rejected_at IS 'Timestamp when quote status changed to Rejected';
COMMENT ON COLUMN quotes.closed_at IS 'Timestamp when quote was finalized (Won or Rejected) - used for conversion analytics';
