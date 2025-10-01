-- Add won_date column to quotes table
-- This tracks the first time a quote was marked as "Won"
-- Used for accurate monthly revenue calculations

ALTER TABLE quotes
ADD COLUMN won_date TIMESTAMPTZ;

-- Add index for performance on revenue queries
CREATE INDEX idx_quotes_won_date ON quotes(won_date);

-- Create a comment explaining the field
COMMENT ON COLUMN quotes.won_date IS 'Timestamp when the quote was first marked as Won. Used for revenue tracking.';
