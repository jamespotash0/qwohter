-- =============================================================================
-- Task Comments, Attachments, and Activity Tables
-- =============================================================================
-- Creates tables for task collaboration features:
-- - task_comments: Comments on tasks with @mentions and threading
-- - task_attachments: File attachments for tasks
-- - task_activities: Activity log for task changes

-- =============================================================================
-- Task Comments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  parent_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for task_comments
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_organization_id ON task_comments(organization_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_comments_parent_id ON task_comments(parent_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

-- RLS for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments for tasks in their organization
CREATE POLICY "Users can view task comments in their organization"
  ON task_comments
  FOR SELECT
  USING (is_active_member((select auth.uid()), organization_id));

-- Policy: Users can insert comments for tasks in their organization
CREATE POLICY "Users can insert task comments in their organization"
  ON task_comments
  FOR INSERT
  WITH CHECK (
    is_active_member((select auth.uid()), organization_id)
    AND user_id = (select auth.uid())
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON task_comments
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON task_comments
  FOR DELETE
  USING (user_id = (select auth.uid()));

-- =============================================================================
-- Task Attachments Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'file',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for task_attachments
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_organization_id ON task_attachments(organization_id);
CREATE INDEX idx_task_attachments_created_at ON task_attachments(created_at DESC);

-- RLS for task_attachments
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view attachments for tasks in their organization
CREATE POLICY "Users can view task attachments in their organization"
  ON task_attachments
  FOR SELECT
  USING (is_active_member((select auth.uid()), organization_id));

-- Policy: Users can insert attachments for tasks in their organization
CREATE POLICY "Users can insert task attachments in their organization"
  ON task_attachments
  FOR INSERT
  WITH CHECK (
    is_active_member((select auth.uid()), organization_id)
    AND user_id = (select auth.uid())
  );

-- Policy: Users can delete attachments they uploaded or if they are admin/owner
CREATE POLICY "Users can delete their own attachments or admins"
  ON task_attachments
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR has_org_role((select auth.uid()), organization_id, ARRAY['Owner', 'Admin'])
  );

-- =============================================================================
-- Task Activities Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for task_activities
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_organization_id ON task_activities(organization_id);
CREATE INDEX idx_task_activities_activity_type ON task_activities(activity_type);
CREATE INDEX idx_task_activities_created_at ON task_activities(created_at DESC);

-- RLS for task_activities
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activities for tasks in their organization
CREATE POLICY "Users can view task activities in their organization"
  ON task_activities
  FOR SELECT
  USING (is_active_member((select auth.uid()), organization_id));

-- Policy: Users can insert activities for tasks in their organization
CREATE POLICY "Users can insert task activities in their organization"
  ON task_activities
  FOR INSERT
  WITH CHECK (is_active_member((select auth.uid()), organization_id));

-- =============================================================================
-- Updated At Trigger for task_comments
-- =============================================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- Storage Bucket for Task Attachments
-- =============================================================================

-- Create storage bucket for task attachments (private - authenticated access only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  FALSE,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-attachments bucket (authenticated users only)
CREATE POLICY "task_attachments_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "task_attachments_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-attachments');

-- =============================================================================
-- Enable Realtime for these tables
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activities;
