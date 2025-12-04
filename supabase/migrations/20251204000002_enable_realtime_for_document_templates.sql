-- Enable Realtime for document_templates and form_document_templates tables
-- This allows frontend to receive live updates when templates are created/modified in the backend

-- Add document_templates to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'document_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.document_templates;
    RAISE NOTICE 'Added document_templates to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'document_templates already in supabase_realtime publication';
  END IF;
END $$;

-- Add form_document_templates to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'form_document_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.form_document_templates;
    RAISE NOTICE 'Added form_document_templates to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'form_document_templates already in supabase_realtime publication';
  END IF;
END $$;
