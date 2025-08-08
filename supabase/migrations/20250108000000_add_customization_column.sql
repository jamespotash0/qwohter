-- Add customization column to quotes table for Smart Quote Editor
ALTER TABLE public.quotes 
ADD COLUMN customization JSONB DEFAULT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.quotes.customization IS 'Stores Smart Quote Editor customizations including custom sections, HTML, and metadata';