-- Create project_updates table for team communication on projects
-- This table stores updates, issues, client requests, and notes related to projects

CREATE TABLE IF NOT EXISTS public.project_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    update_type TEXT NOT NULL DEFAULT 'note' CHECK (update_type IN ('issue', 'client_request', 'progress', 'note')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    attachments JSONB DEFAULT '[]'::jsonb,
    mentions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_organization_id ON public.project_updates(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_user_id ON public.project_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_update_type ON public.project_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_project_updates_status ON public.project_updates(status);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON public.project_updates(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Organization members can view and manage updates for their projects
CREATE POLICY "Users can view updates for their organization's projects"
    ON public.project_updates
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "Users can create updates for their organization's projects"
    ON public.project_updates
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own updates"
    ON public.project_updates
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own updates or admins can delete any"
    ON public.project_updates
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships
            WHERE user_id = auth.uid()
            AND organization_id = project_updates.organization_id
            AND status = 'Active'
            AND role IN ('Owner', 'Admin')
        )
    );

-- Add updated_at trigger
CREATE TRIGGER set_project_updates_updated_at
    BEFORE UPDATE ON public.project_updates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_updates;

COMMENT ON TABLE public.project_updates IS 'Stores project updates, issues, client requests, and notes for team communication';
