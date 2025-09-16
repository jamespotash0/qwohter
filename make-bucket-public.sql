-- Make organization-logos bucket public for easier logo display
-- Run this in Supabase SQL Editor

UPDATE storage.buckets 
SET public = true 
WHERE id = 'organization-logos';

-- Verify the change
SELECT id, name, public FROM storage.buckets WHERE id = 'organization-logos';