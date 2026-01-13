-- Migration: Cleanup unused columns from proposals table
-- Date: 2025-12-09
-- Description: Remove legacy and redundant columns from proposals table
--              Data is now stored in form_data JSONB or calculated on-the-fly

-- ============================================================================
-- DROP INDEXES FIRST (for columns being removed)
-- ============================================================================

DROP INDEX IF EXISTS idx_proposals_client_address;

-- ============================================================================
-- DROP FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE public.proposals
  DROP CONSTRAINT IF EXISTS proposals_document_template_id_fkey;

-- ============================================================================
-- DROP COLUMNS
-- ============================================================================

-- Legacy columns from old quotes system
ALTER TABLE public.proposals DROP COLUMN IF EXISTS document_version;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS date_last_downloaded;

-- Redundant - presentation now embedded in form
ALTER TABLE public.proposals DROP COLUMN IF EXISTS document_template_id;

-- Redundant - pricing handled in form_data
ALTER TABLE public.proposals DROP COLUMN IF EXISTS product_items;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS computed_totals;

-- Denormalized - can join with profiles table
ALTER TABLE public.proposals DROP COLUMN IF EXISTS created_by_name;

-- Not used in new system
ALTER TABLE public.proposals DROP COLUMN IF EXISTS comments;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS paid_at;

-- Move to form_data (display only, no filtering needed)
ALTER TABLE public.proposals DROP COLUMN IF EXISTS client_address;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.proposals IS 'Proposals table - Form-builder based workflow. Queryable columns for table display, form_data JSONB for all other data.';
