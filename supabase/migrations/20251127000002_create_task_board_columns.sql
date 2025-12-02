-- Create task_board_columns table for custom kanban columns
-- Organizations can create their own columns beyond the defaults

CREATE TABLE IF NOT EXISTS public.task_board_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- Unique identifier for the column (e.g., 'todo', 'in_progress', 'review')
    color TEXT NOT NULL DEFAULT '#94A3B8', -- Slate gray hex color
    position INTEGER NOT NULL DEFAULT 0, -- Order of columns
    is_default BOOLEAN NOT NULL DEFAULT false, -- Default columns cannot be deleted
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each organization can only have one column with a given slug
    UNIQUE(organization_id, slug)
);

-- Create indexes
CREATE INDEX idx_task_board_columns_org ON public.task_board_columns(organization_id);
CREATE INDEX idx_task_board_columns_position ON public.task_board_columns(organization_id, position);

-- Enable RLS
ALTER TABLE public.task_board_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view columns in their organization"
    ON public.task_board_columns FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid() AND status = 'Active'
        )
    );

CREATE POLICY "Admins and Owners can manage columns"
    ON public.task_board_columns FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.memberships
            WHERE user_id = auth.uid()
            AND status = 'Active'
            AND role IN ('Owner', 'Admin')
        )
    );

-- Updated at trigger
CREATE TRIGGER set_task_board_columns_updated_at
    BEFORE UPDATE ON public.task_board_columns
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Remove the CHECK constraint on project_tasks.status to allow custom statuses
ALTER TABLE public.project_tasks DROP CONSTRAINT IF EXISTS project_tasks_status_check;

-- Add a new check that just ensures status is not empty
ALTER TABLE public.project_tasks ADD CONSTRAINT project_tasks_status_check
    CHECK (status IS NOT NULL AND status <> '');

-- Function to create default columns for an organization
CREATE OR REPLACE FUNCTION create_default_task_columns(org_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.task_board_columns (organization_id, name, slug, color, position, is_default)
    VALUES
        (org_id, 'To-Do', 'todo', '#94A3B8', 0, true),       -- Slate gray
        (org_id, 'In Progress', 'in_progress', '#3B82F6', 1, true), -- Blue
        (org_id, 'Completed', 'done', '#10B981', 2, true)    -- Green
    ON CONFLICT (organization_id, slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default columns for all existing organizations
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM public.organizations LOOP
        PERFORM create_default_task_columns(org.id);
    END LOOP;
END $$;

-- Trigger to create default columns when a new organization is created
CREATE OR REPLACE FUNCTION trigger_create_default_task_columns()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_task_columns(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_created_create_task_columns
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_task_columns();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_board_columns;

COMMENT ON TABLE public.task_board_columns IS 'Custom kanban board columns per organization';
