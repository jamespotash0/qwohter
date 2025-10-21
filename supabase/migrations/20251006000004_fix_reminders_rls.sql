-- HIGH PRIORITY SECURITY FIX: Reminders RLS Policies
--
-- VULNERABILITY: Reminders policies don't check status='Active'
-- ISSUE: Inactive/rejected members can still access organization reminders
-- FIX: Add status='Active' check to all reminder policies
--
-- Migration: 20251006000004_fix_reminders_rls.sql
-- Created: 2025-10-06

-- ============================================================================
-- Drop existing reminder policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can create organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update organization reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete organization reminders" ON public.reminders;

-- ============================================================================
-- Create secure policies with Active status check
-- ============================================================================

-- SELECT: Only active members can view reminders
CREATE POLICY "Active members can view organization reminders"
ON public.reminders FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
);

-- INSERT: Only active members can create reminders
CREATE POLICY "Active members can create organization reminders"
ON public.reminders FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
  AND created_by = auth.uid()
);

-- UPDATE: Only active members can update reminders they created or if they're Admin/Owner
CREATE POLICY "Active members can update organization reminders"
ON public.reminders FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
  AND (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND organization_id = reminders.organization_id
      AND role IN ('Owner', 'Admin')
      AND status = 'Active'
    )
  )
);

-- DELETE: Only active members can delete reminders they created or if they're Admin/Owner
CREATE POLICY "Active members can delete organization reminders"
ON public.reminders FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
  )
  AND (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND organization_id = reminders.organization_id
      AND role IN ('Owner', 'Admin')
      AND status = 'Active'
    )
  )
);

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON POLICY "Active members can view organization reminders" ON public.reminders IS
'Only active organization members can view reminders';

COMMENT ON POLICY "Active members can create organization reminders" ON public.reminders IS
'Only active members can create reminders for their organization';

COMMENT ON POLICY "Active members can update organization reminders" ON public.reminders IS
'Active members can update their own reminders, or admins can update any';

COMMENT ON POLICY "Active members can delete organization reminders" ON public.reminders IS
'Active members can delete their own reminders, or admins can delete any';
