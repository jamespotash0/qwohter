-- Create quote_activities table to track all quote-related activities
CREATE TABLE IF NOT EXISTS public.quote_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    quote_number TEXT NOT NULL,
    project_name TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    activity_type TEXT NOT NULL, -- 'created', 'status_changed', 'updated', 'deleted', 'reminder_set'
    activity_details JSONB, -- Additional details like old_status, new_status, etc.
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_quote_activities_organization_id ON public.quote_activities(organization_id);
CREATE INDEX idx_quote_activities_created_at ON public.quote_activities(created_at DESC);
CREATE INDEX idx_quote_activities_quote_id ON public.quote_activities(quote_id);
CREATE INDEX idx_quote_activities_activity_type ON public.quote_activities(activity_type);

-- Enable Row Level Security
ALTER TABLE public.quote_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see activities from their organization
CREATE POLICY "Users can view activities from their organization"
    ON public.quote_activities
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.memberships
            WHERE user_id = auth.uid()
            AND status = 'Active'
        )
    );

-- Allow inserting activities
CREATE POLICY "Users can insert activities for their organization"
    ON public.quote_activities
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id
            FROM public.memberships
            WHERE user_id = auth.uid()
            AND status = 'Active'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT ON public.quote_activities TO authenticated;

-- Add comment
COMMENT ON TABLE public.quote_activities IS 'Tracks all activities related to quotes including creation, updates, status changes, and deletions';
