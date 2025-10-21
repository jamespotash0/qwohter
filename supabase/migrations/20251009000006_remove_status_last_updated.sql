-- Remove status_last_updated column as it's replaced by specific timestamp fields
-- (submitted_at, won_at, rejected_at, closed_at)

-- Drop the column
ALTER TABLE quotes
DROP COLUMN IF EXISTS status_last_updated;

COMMENT ON TABLE quotes IS 'Quotes table - status_last_updated removed in favor of submitted_at, won_at, rejected_at, closed_at for accurate analytics';
