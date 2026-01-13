-- Migration: Add is_complete column to proposals table
-- Date: 2025-12-08
-- Purpose: Simple boolean flag to track whether a proposal is complete
--          Displays as a hazard icon in the proposals table when false

-- Add is_complete column with default false (new proposals start as incomplete)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN proposals.is_complete IS 'Simple flag indicating whether the proposal is complete. When false, displays a hazard icon in the proposals table.';

-- Create index for filtering by completion status
CREATE INDEX IF NOT EXISTS idx_proposals_is_complete
ON proposals(is_complete);
