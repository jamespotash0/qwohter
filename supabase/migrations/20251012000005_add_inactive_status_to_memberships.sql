-- Add Inactive Status to Memberships Table
-- Migration: 20251012000005_add_inactive_status_to_memberships.sql
-- Created: 2025-10-12
--
-- This migration adds 'Inactive' as a valid status value for the memberships table
-- to support soft delete functionality

-- ============================================================================
-- DROP OLD CONSTRAINT IF EXISTS
-- ============================================================================

ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_status_check;

-- ============================================================================
-- ADD NEW CONSTRAINT WITH INACTIVE STATUS
-- ============================================================================

ALTER TABLE public.memberships
ADD CONSTRAINT memberships_status_check
CHECK (status IN ('Pending', 'Active', 'Suspended', 'Inactive'));

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON CONSTRAINT memberships_status_check ON public.memberships IS
'Ensures membership status is one of: Pending (awaiting approval), Active (full member), Suspended (temporarily disabled), or Inactive (soft deleted/removed)';
