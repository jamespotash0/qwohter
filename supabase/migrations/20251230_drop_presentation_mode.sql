-- Migration: Drop unused presentation_mode column
-- This column was never enforced in the UI - users can switch freely between
-- Rich Text and Google Docs modes regardless of the stored value.
-- Removing it to clean up dead code.

ALTER TABLE public.proposals
DROP COLUMN IF EXISTS presentation_mode;
