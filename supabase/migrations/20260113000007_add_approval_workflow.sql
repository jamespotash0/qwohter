-- Migration: Add proposal approval workflow
-- Description: Adds organization setting for requiring approval,
--              new 'Pending Approval' status, and approval_requests table

-- ============================================================================
-- 1. ADD ORGANIZATION SETTING
-- ============================================================================

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS require_proposal_approval BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.organizations.require_proposal_approval IS
'When true, Members must request approval from Admins/Owners before submitting proposals';

-- ============================================================================
-- 2. UPDATE STATUS NORMALIZATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_proposal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize status to proper capitalization
  IF NEW.status IS NOT NULL THEN
    CASE LOWER(REPLACE(NEW.status, ' ', ''))
      WHEN 'won' THEN NEW.status := 'Won';
      WHEN 'rejected' THEN NEW.status := 'Rejected';
      WHEN 'submitted' THEN NEW.status := 'Submitted';
      WHEN 'draft' THEN NEW.status := 'Draft';
      WHEN 'incomplete' THEN NEW.status := 'Incomplete';
      WHEN 'pending' THEN NEW.status := 'Pending';
      WHEN 'pendingapproval' THEN NEW.status := 'Pending Approval';
      ELSE
        -- Keep original for unknown statuses
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger (if exists from legacy quotes system) and create new one
DROP TRIGGER IF EXISTS normalize_quote_status_trigger ON proposals;
DROP TRIGGER IF EXISTS normalize_proposal_status_trigger ON proposals;
CREATE TRIGGER normalize_proposal_status_trigger
  BEFORE INSERT OR UPDATE OF status
  ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION normalize_proposal_status();

-- ============================================================================
-- 3. CREATE APPROVAL REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Who requested and when
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Who responded and when (null until approved/rejected)
  responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMP WITH TIME ZONE,

  -- Status: pending, approved, rejected
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Optional comment from requester or reviewer
  request_comment TEXT,
  response_comment TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_proposal ON public.proposal_approval_requests(proposal_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org ON public.proposal_approval_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.proposal_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON public.proposal_approval_requests(requested_by);

-- Enable RLS
ALTER TABLE public.proposal_approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approval requests in their org"
  ON public.proposal_approval_requests FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
  );

CREATE POLICY "Members can create approval requests"
  ON public.proposal_approval_requests FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND status = 'Active'
    )
    AND requested_by = auth.uid()
  );

CREATE POLICY "Admins can update approval requests"
  ON public.proposal_approval_requests FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND status = 'Active'
        AND role IN ('Owner', 'Admin')
    )
  );

-- Updated_at trigger (uses existing handle_updated_at function)
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON public.proposal_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_approval_requests;

COMMENT ON TABLE public.proposal_approval_requests IS 'Tracks approval requests for proposals when require_proposal_approval is enabled';

-- ============================================================================
-- 4. UPDATE NOTIFICATIONS TABLE CONSTRAINT (if exists)
-- ============================================================================

-- Drop existing constraint and add new one with approval types
DO $$
BEGIN
  -- Only run if notifications table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
      type IN (
        'task_assigned', 'task_due', 'update_mention', 'update_reply', 'general',
        'signature_sent', 'signature_viewed', 'signature_signed',
        'proposal_submitted', 'proposal_won', 'proposal_rejected',
        'reminder_due',
        'approval_requested', 'approval_approved', 'approval_rejected'
      )
    );
  END IF;
END $$;
