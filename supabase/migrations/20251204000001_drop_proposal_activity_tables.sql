-- ============================================================================
-- CONSOLIDATE AND RENAME ACTIVITY TRACKING TABLES
-- ============================================================================
-- This migration:
-- 1. Drops empty proposal_activities table
-- 2. Drops empty proposal_status_transitions table
-- 3. Drops duplicate trigger and function
-- 4. Renames quote_activities → proposal_activities (preserves data)
-- 5. Renames quote_status_transitions → proposal_status_transitions (preserves data)
-- 6. Updates trigger function for new table/column names
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop empty proposal_activities table and its objects
-- ============================================================================
DROP POLICY IF EXISTS "Users can view proposal activities from their organization" ON public.proposal_activities;
DROP POLICY IF EXISTS "Users can insert proposal activities for their organization" ON public.proposal_activities;
DROP INDEX IF EXISTS idx_proposal_activities_organization_id;
DROP INDEX IF EXISTS idx_proposal_activities_created_at;
DROP INDEX IF EXISTS idx_proposal_activities_proposal_id;
DROP INDEX IF EXISTS idx_proposal_activities_activity_type;
DROP TABLE IF EXISTS public.proposal_activities CASCADE;

-- ============================================================================
-- STEP 2: Drop empty proposal_status_transitions table and its objects
-- ============================================================================
DROP POLICY IF EXISTS "Users can view proposal transitions in their org" ON public.proposal_status_transitions;
DROP POLICY IF EXISTS "System can insert proposal transitions" ON public.proposal_status_transitions;
DROP INDEX IF EXISTS idx_proposal_transitions_proposal;
DROP INDEX IF EXISTS idx_proposal_transitions_org_date;
DROP INDEX IF EXISTS idx_proposal_transitions_status_date;
DROP INDEX IF EXISTS idx_proposal_transitions_won;
DROP INDEX IF EXISTS idx_proposal_transitions_rejected;
DROP INDEX IF EXISTS idx_proposal_transitions_submitted;
DROP TABLE IF EXISTS public.proposal_status_transitions CASCADE;

-- ============================================================================
-- STEP 3: Drop duplicate trigger and function (keep track_proposal_status_change)
-- ============================================================================
DROP TRIGGER IF EXISTS track_proposal_status_changes ON public.proposals;
DROP FUNCTION IF EXISTS public.track_proposal_status_changes();

-- ============================================================================
-- STEP 4: Rename quote_activities → proposal_activities
-- ============================================================================
ALTER TABLE public.quote_activities RENAME TO proposal_activities;
ALTER TABLE public.proposal_activities RENAME COLUMN quote_id TO proposal_id;
ALTER TABLE public.proposal_activities RENAME COLUMN quote_number TO proposal_number;

-- Rename indexes
ALTER INDEX idx_quote_activities_organization_id RENAME TO idx_proposal_activities_organization_id;
ALTER INDEX idx_quote_activities_created_at RENAME TO idx_proposal_activities_created_at;
ALTER INDEX idx_quote_activities_quote_id RENAME TO idx_proposal_activities_proposal_id;
ALTER INDEX idx_quote_activities_activity_type RENAME TO idx_proposal_activities_activity_type;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view activities from their organization" ON public.proposal_activities;
DROP POLICY IF EXISTS "Users can insert activities for their organization" ON public.proposal_activities;

CREATE POLICY "Users can view proposal activities from their organization"
  ON public.proposal_activities
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert proposal activities for their organization"
  ON public.proposal_activities
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- STEP 5: Rename quote_status_transitions → proposal_status_transitions
-- ============================================================================
ALTER TABLE public.quote_status_transitions RENAME TO proposal_status_transitions;
ALTER TABLE public.proposal_status_transitions RENAME COLUMN quote_id TO proposal_id;

-- Rename indexes
ALTER INDEX idx_transitions_quote RENAME TO idx_proposal_transitions_proposal;
ALTER INDEX idx_transitions_org_date RENAME TO idx_proposal_transitions_org_date;
ALTER INDEX idx_transitions_status_date RENAME TO idx_proposal_transitions_status_date;
ALTER INDEX idx_transitions_won RENAME TO idx_proposal_transitions_won;
ALTER INDEX idx_transitions_rejected RENAME TO idx_proposal_transitions_rejected;
ALTER INDEX idx_transitions_submitted RENAME TO idx_proposal_transitions_submitted;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view transitions in their org" ON public.proposal_status_transitions;
DROP POLICY IF EXISTS "System can insert transitions" ON public.proposal_status_transitions;

CREATE POLICY "Users can view proposal transitions in their org"
  ON public.proposal_status_transitions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "System can insert proposal transitions"
  ON public.proposal_status_transitions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- STEP 6: Update trigger function to use new table/column names
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_proposal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only proceed if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN

    -- Log the status change to audit table
    INSERT INTO proposal_status_transitions (
      proposal_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by,
      transitioned_at,
      notes
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NOW(),
      CASE
        WHEN OLD.status IS NULL THEN 'Proposal created'
        ELSE 'Status changed from ' || OLD.status || ' to ' || NEW.status
      END
    );

    -- Update timestamp fields based on new status (CASE-INSENSITIVE)
    IF LOWER(NEW.status) = 'submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF LOWER(NEW.status) = 'accepted' THEN
      NEW.won_at = NOW();
    ELSIF LOWER(NEW.status) = 'rejected' THEN
      NEW.rejected_at = NOW();
    ELSIF LOWER(NEW.status) = 'paid' THEN
      NEW.paid_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- VERIFICATION (for manual testing - uncomment to run)
-- ============================================================================
/*
-- Verify proposal_activities is gone
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'proposal_activities';

-- Verify proposal_status_transitions exists with data
SELECT COUNT(*) FROM proposal_status_transitions;

-- Verify column was renamed
SELECT column_name FROM information_schema.columns
WHERE table_name = 'proposal_status_transitions' AND column_name = 'proposal_id';

-- Verify trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'track_proposal_status_change';
*/
