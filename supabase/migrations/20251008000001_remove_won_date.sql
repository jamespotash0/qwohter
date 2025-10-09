-- Remove won_date column and related triggers/functions
-- This is no longer needed since we only track Won status for projects

-- Drop the trigger that updates won_date
DROP TRIGGER IF EXISTS update_won_date ON quotes;

-- Drop the function that updates won_date
DROP FUNCTION IF EXISTS update_won_date();

-- Drop the won_date column
ALTER TABLE quotes
DROP COLUMN IF EXISTS won_date;
