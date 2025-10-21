-- Backfill won_date for existing Won and Completed quotes
-- Uses status_last_updated or created_at as the won date

UPDATE quotes
SET won_date = COALESCE(status_last_updated, created_at)
WHERE (status = 'Won' OR status = 'Completed')
  AND won_date IS NULL;

-- Add comment
COMMENT ON COLUMN quotes.won_date IS 'Timestamp when the quote was first marked as Won or Completed. Backfilled using status_last_updated or created_at for existing quotes.';
