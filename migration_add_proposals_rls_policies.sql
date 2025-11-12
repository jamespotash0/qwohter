-- Add RLS Policies for Proposals Table
-- Migration: migration_add_proposals_rls_policies.sql
-- Created: 2025-11-12
--
-- This migration adds the EXACT same RLS policies from the quotes table
-- to the proposals table (adapted for created_by field).

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON PROPOSALS TABLE
-- ============================================================================

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROPOSALS TABLE - RLS POLICIES (MATCHING QUOTES TABLE)
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "proposals_select_policy" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_policy" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_policy" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_policy" ON public.proposals;

-- SELECT: Active members can view all organization proposals
CREATE POLICY "proposals_select_policy" ON public.proposals
FOR SELECT USING (
  is_active_member(auth.uid(), organization_id)
);

-- INSERT: Active members can create proposals (must set themselves as creator)
CREATE POLICY "proposals_insert_policy" ON public.proposals
FOR INSERT WITH CHECK (
  is_active_member(auth.uid(), organization_id)
  AND (created_by = auth.uid())
);

-- UPDATE: Active members can update organization proposals
CREATE POLICY "proposals_update_policy" ON public.proposals
FOR UPDATE USING (
  is_active_member(auth.uid(), organization_id)
);

-- DELETE: Can delete if (1) no org and you created it, OR (2) active member of the org
CREATE POLICY "proposals_delete_policy" ON public.proposals
FOR DELETE USING (
  (
    (organization_id IS NULL)
    AND (auth.uid() = created_by)
  )
  OR
  (
    (organization_id = get_current_user_organization())
    AND (
      EXISTS (
        SELECT 1
        FROM memberships m
        WHERE (m.user_id = auth.uid())
        AND (m.organization_id = proposals.organization_id)
        AND (m.status = 'Active'::text)
      )
    )
  )
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "proposals_select_policy" ON public.proposals IS
'Active members can view all proposals in their organization';

COMMENT ON POLICY "proposals_insert_policy" ON public.proposals IS
'Active members can create proposals, must set themselves as creator';

COMMENT ON POLICY "proposals_update_policy" ON public.proposals IS
'Active members can update all proposals in their organization';

COMMENT ON POLICY "proposals_delete_policy" ON public.proposals IS
'Can delete if: (1) no organization and you created it, OR (2) active member of the organization';
