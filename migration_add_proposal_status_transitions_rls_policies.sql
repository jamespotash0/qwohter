-- Add RLS Policies for Proposal Status Transitions Table
-- Migration: migration_add_proposal_status_transitions_rls_policies.sql
-- Created: 2025-11-12
--
-- This migration adds the EXACT same RLS policies from the quote_status_transitions table
-- to the proposal_status_transitions table, using the is_active_member() function.

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON PROPOSAL_STATUS_TRANSITIONS TABLE
-- ============================================================================

ALTER TABLE public.proposal_status_transitions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROPOSAL_STATUS_TRANSITIONS TABLE - RLS POLICIES (MATCHING QUOTE_STATUS_TRANSITIONS TABLE)
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "proposal_status_transitions_select_policy" ON public.proposal_status_transitions;
DROP POLICY IF EXISTS "proposal_status_transitions_insert_policy" ON public.proposal_status_transitions;
DROP POLICY IF EXISTS "Users can view transitions in their org" ON public.proposal_status_transitions;
DROP POLICY IF EXISTS "System can insert transitions" ON public.proposal_status_transitions;

-- SELECT: Users can view transitions in their organization
CREATE POLICY "proposal_status_transitions_select_policy" ON public.proposal_status_transitions
FOR SELECT USING (
  is_active_member(auth.uid(), organization_id)
);

-- INSERT: System can insert transitions for active organization members
CREATE POLICY "proposal_status_transitions_insert_policy" ON public.proposal_status_transitions
FOR INSERT WITH CHECK (
  is_active_member(auth.uid(), organization_id)
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "proposal_status_transitions_select_policy" ON public.proposal_status_transitions IS
'Active members can view all status transitions in their organization';

COMMENT ON POLICY "proposal_status_transitions_insert_policy" ON public.proposal_status_transitions IS
'System can insert status transitions for active organization members';
