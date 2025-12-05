-- ============================================================================
-- DROP PROPOSAL_ACTIVITIES TABLE
-- ============================================================================
-- This migration removes the proposal_activities table and all related objects.
-- Activity tracking is being removed from the application.
-- ============================================================================

-- Drop RLS policies first
DROP POLICY IF EXISTS "Users can view proposal activities from their organization" ON public.proposal_activities;
DROP POLICY IF EXISTS "Users can insert proposal activities for their organization" ON public.proposal_activities;
DROP POLICY IF EXISTS "Users can view activities from their organization" ON public.proposal_activities;
DROP POLICY IF EXISTS "Users can insert activities for their organization" ON public.proposal_activities;

-- Drop indexes
DROP INDEX IF EXISTS idx_proposal_activities_organization_id;
DROP INDEX IF EXISTS idx_proposal_activities_created_at;
DROP INDEX IF EXISTS idx_proposal_activities_proposal_id;
DROP INDEX IF EXISTS idx_proposal_activities_activity_type;
DROP INDEX IF EXISTS idx_proposal_activities_quote_id;

-- Drop the table (CASCADE will remove any dependent objects)
DROP TABLE IF EXISTS public.proposal_activities CASCADE;

-- Also drop quote_activities if it exists (legacy table)
DROP POLICY IF EXISTS "Users can view activities from their organization" ON public.quote_activities;
DROP POLICY IF EXISTS "Users can insert activities for their organization" ON public.quote_activities;
DROP INDEX IF EXISTS idx_quote_activities_organization_id;
DROP INDEX IF EXISTS idx_quote_activities_created_at;
DROP INDEX IF EXISTS idx_quote_activities_quote_id;
DROP INDEX IF EXISTS idx_quote_activities_activity_type;
DROP TABLE IF EXISTS public.quote_activities CASCADE;
