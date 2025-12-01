-- Create project_tasks table for task management
-- This table stores tasks that can be assigned to team members
-- Tasks can be linked to a project (project_id) or standalone (project_id = NULL)

CREATE TABLE IF NOT EXISTS public.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE, -- Nullable for standalone tasks
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    related_update_id UUID REFERENCES public.project_updates(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_organization_id ON public.project_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_by ON public.project_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_priority ON public.project_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_project_tasks_due_date ON public.project_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_at ON public.project_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Organization members can view and manage tasks for their projects
CREATE POLICY "Users can view tasks for their organization's projects"
    ON public.project_tasks
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "Users can create tasks for their organization's projects"
    ON public.project_tasks
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update tasks in their organization"
    ON public.project_tasks
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "Users can delete their own tasks or admins can delete any"
    ON public.project_tasks
    FOR DELETE
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships
            WHERE user_id = auth.uid()
            AND organization_id = project_tasks.organization_id
            AND status = 'Active'
            AND role IN ('Owner', 'Admin')
        )
    );

-- Add updated_at trigger
CREATE TRIGGER set_project_tasks_updated_at
    BEFORE UPDATE ON public.project_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;

COMMENT ON TABLE public.project_tasks IS 'Stores project tasks that can be assigned to team members';
