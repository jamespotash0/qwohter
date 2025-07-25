-- Add pocket_doors column to quotes table
ALTER TABLE public.quotes 
ADD COLUMN pocket_doors jsonb NOT NULL DEFAULT '{}'::jsonb;