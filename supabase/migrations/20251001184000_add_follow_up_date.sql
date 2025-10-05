-- Add follow_up_date column to quotes table
-- This replaces the follow_up_days integer with a precise timestamp
-- Allows setting exact deadline dates and times

ALTER TABLE quotes
ADD COLUMN follow_up_date TIMESTAMPTZ;

-- Add index for performance on follow-up queries
CREATE INDEX idx_quotes_follow_up_date ON quotes(follow_up_date);

-- Migrate existing follow_up_days data to follow_up_date
-- Calculate deadline based on status_last_updated + follow_up_days
UPDATE quotes
SET follow_up_date = (
  COALESCE(status_last_updated, created_at) +
  (follow_up_days || ' days')::interval
)
WHERE follow_up_days IS NOT NULL AND follow_up_days > 0;

-- Add comment
COMMENT ON COLUMN quotes.follow_up_date IS 'Timestamp when follow-up is due. Replaces follow_up_days for more precise deadline tracking.';
