-- Drop project_updates table (feature removed)
-- This migration removes the project updates/comments functionality

-- Remove from realtime publication first
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.project_updates;

-- Drop the trigger
DROP TRIGGER IF EXISTS set_project_updates_updated_at ON public.project_updates;

-- Drop indexes
DROP INDEX IF EXISTS idx_project_updates_project_id;
DROP INDEX IF EXISTS idx_project_updates_organization_id;
DROP INDEX IF EXISTS idx_project_updates_user_id;
DROP INDEX IF EXISTS idx_project_updates_status;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view updates in their organization" ON public.project_updates;
DROP POLICY IF EXISTS "Users can create updates in their organization" ON public.project_updates;
DROP POLICY IF EXISTS "Users can update their own updates" ON public.project_updates;
DROP POLICY IF EXISTS "Users can delete their own updates" ON public.project_updates;

-- Drop the table
DROP TABLE IF EXISTS public.project_updates;
