-- Enable DELETE events for realtime on project_workflow_columns table
-- By default, Supabase only sends minimal data for DELETE events (just the primary key)
-- Setting REPLICA IDENTITY FULL allows realtime to broadcast all column values on DELETE

-- Set replica identity to FULL for project_workflow_columns
-- This allows DELETE events to include all column data in realtime payload
ALTER TABLE project_workflow_columns REPLICA IDENTITY FULL;

-- Verify the table is in the realtime publication
-- This ensures INSERT, UPDATE, and DELETE events are all broadcast
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'project_workflow_columns'
  ) THEN
    -- Add table to realtime publication if not already there
    ALTER PUBLICATION supabase_realtime ADD TABLE project_workflow_columns;
    RAISE NOTICE 'Added project_workflow_columns to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'project_workflow_columns already in supabase_realtime publication';
  END IF;
END $$;
