-- Remove follow_up_date column from quotes table
-- Replaced by more flexible reminders table with quote_id linkage

-- Drop the index first
DROP INDEX IF EXISTS idx_quotes_follow_up_date;

-- Drop the column
ALTER TABLE quotes DROP COLUMN IF EXISTS follow_up_date;

-- Also drop the old follow_up_days column if it still exists
ALTER TABLE quotes DROP COLUMN IF EXISTS follow_up_days;

-- Add comment to document the change
COMMENT ON TABLE quotes IS 'Quote data. Follow-ups are now tracked via the reminders table with quote_id foreign key.';
