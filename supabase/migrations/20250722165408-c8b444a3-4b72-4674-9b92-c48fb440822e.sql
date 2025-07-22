-- Add new JSONB fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN support_structure JSONB NOT NULL DEFAULT '{}',
ADD COLUMN delivery_details JSONB NOT NULL DEFAULT '{}',
ADD COLUMN labor_details JSONB NOT NULL DEFAULT '{}';