-- Add archived column to quotes table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for better query performance on archived quotes
CREATE INDEX IF NOT EXISTS idx_quotes_archived ON public.quotes(archived);

-- Add comment
COMMENT ON COLUMN public.quotes.archived IS 'Indicates if the quote has been archived. Archived quotes are hidden from main view but accessible in Archives tab.';
