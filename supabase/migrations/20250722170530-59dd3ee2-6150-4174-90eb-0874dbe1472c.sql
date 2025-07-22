-- Add project_name column to quotes table
ALTER TABLE public.quotes 
ADD COLUMN project_name TEXT;