-- Create the organization-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', false);

-- Set up RLS policies for the organization-logos bucket
CREATE POLICY "Users can upload their organization logos"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their organization logos"
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their organization logos"
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their organization logos"
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'organization-logos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);