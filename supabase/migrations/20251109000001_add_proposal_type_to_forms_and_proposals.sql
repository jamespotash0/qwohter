-- Migration: Add form_type and starting_proposal_number to forms table
-- Add proposal_type, proposal_number, and form_id to proposals table
-- Date: 2025-11-09

-- ============================================================================
-- PART 1: Update forms table
-- ============================================================================

-- ============================================================================
-- PART 2: Update proposals table
-- ============================================================================

-- Add proposal_type column to proposals table (allows custom types, no CHECK constraint)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS proposal_type VARCHAR NOT NULL DEFAULT 'quote';

-- Add proposal_number column to proposals table (unique within organization)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS proposal_number VARCHAR;

-- Add form_id column to track which form template was used
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE SET NULL;

-- Add parent_proposal_id for tracking proposal revisions
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN proposals.proposal_type IS 'Type of document (can be preset or custom). Inherited from the form template.';
COMMENT ON COLUMN proposals.proposal_number IS 'Auto-incrementing proposal number with optional version suffix (e.g., "Q1200", "Q1201", "Q1201.2", "Q1201.3")';
COMMENT ON COLUMN proposals.form_id IS 'Reference to the form template used to create this proposal';
COMMENT ON COLUMN proposals.parent_proposal_id IS 'Reference to the parent proposal if this is a revision (NULL for original proposals)';

-- Create index on proposal_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_number
ON proposals(proposal_number);

-- Create index on form_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_form_id
ON proposals(form_id);

-- Create index on proposal_type for filtering
CREATE INDEX IF NOT EXISTS idx_proposals_proposal_type
ON proposals(proposal_type);

-- Create index on parent_proposal_id for finding all versions
CREATE INDEX IF NOT EXISTS idx_proposals_parent_proposal_id
ON proposals(parent_proposal_id);

-- ============================================================================
-- PART 3: Create unique constraint for proposal numbers within organization
-- ============================================================================

-- Create unique index to ensure proposal_number is unique within an organization
-- This allows the same number format across different organizations but prevents duplicates within one org
CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_unique_number_per_org
ON proposals(organization_id, proposal_number)
WHERE proposal_number IS NOT NULL;

-- ============================================================================
-- PART 4: Helper function to generate next proposal number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_next_proposal_number(
  p_form_id UUID,
  p_starting_number VARCHAR
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix VARCHAR;
  v_starting_num INTEGER;
  v_max_num INTEGER;
  v_next_num INTEGER;
  v_num_length INTEGER;
BEGIN
  -- Parse the starting number to extract prefix and numeric part
  -- Examples: "Q1200" -> prefix="Q", num=1200
  --           "ER-2025-001" -> prefix="ER-2025-", num=1
  --           "SR001" -> prefix="SR", num=1

  -- Extract numeric part from the end of the string
  v_starting_num := CAST(regexp_replace(p_starting_number, '^.*?(\d+)$', '\1') AS INTEGER);

  -- Extract prefix (everything before the final number)
  v_prefix := regexp_replace(p_starting_number, '\d+$', '');

  -- Get the length of the numeric part (for zero-padding)
  v_num_length := length(regexp_replace(p_starting_number, '^.*?(\d+)$', '\1'));

  -- Find the highest number used for proposals from this form
  SELECT COALESCE(MAX(
    CAST(regexp_replace(proposal_number, '^.*?(\d+)$', '\1') AS INTEGER)
  ), v_starting_num - 1)
  INTO v_max_num
  FROM proposals
  WHERE form_id = p_form_id
    AND proposal_number ~ ('^' || v_prefix || '\d+$');

  -- Increment to get next number
  v_next_num := v_max_num + 1;

  -- Construct the full proposal number with proper zero-padding
  RETURN v_prefix || LPAD(v_next_num::VARCHAR, v_num_length, '0');
END;
$$;

COMMENT ON FUNCTION generate_next_proposal_number IS 'Generates the next proposal number by incrementing from the form''s starting number (e.g., Q1200 -> Q1201 -> Q1202)';

-- ============================================================================
-- PART 5: Helper function to generate proposal version number
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_proposal_version(
  p_parent_proposal_number VARCHAR,
  p_organization_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_main_number VARCHAR;
  v_highest_version INTEGER;
  v_next_version INTEGER;
BEGIN
  -- Extract main number (strip any existing version suffix)
  -- Examples: "SR-1005" -> "SR-1005"
  --           "SR-1005.1" -> "SR-1005"
  --           "Q1200.2" -> "Q1200"
  v_main_number := regexp_replace(p_parent_proposal_number, '\.\d+$', '');

  -- Find the highest version number for this base proposal number
  -- Look for all proposals with the same main number (with or without version suffix)
  -- Extract version number from proposal_number strings
  SELECT COALESCE(
    MAX(
      CASE
        WHEN proposal_number ~ ('^' || v_main_number || '\.\d+$') THEN
          -- Has version suffix, extract it
          CAST(regexp_replace(proposal_number, '^.*\.(\d+)$', '\1') AS INTEGER)
        ELSE
          -- No version suffix, version 1
          1
      END
    ),
    0
  )
  INTO v_highest_version
  FROM proposals
  WHERE organization_id = p_organization_id
    AND proposal_number ~ ('^' || v_main_number || '(\.\d+)?$');

  -- Increment to get next version
  v_next_version := v_highest_version + 1;

  -- Construct the versioned proposal number
  -- First version (revision) gets .2 suffix, original has no suffix or .1
  -- Examples: SR-1005 -> SR-1005.2 (first revision)
  --           SR-1005.2 -> SR-1005.3 (second revision)
  IF v_next_version = 1 THEN
    -- This shouldn't happen if called correctly, but handle it
    RETURN v_main_number;
  ELSE
    RETURN v_main_number || '.' || v_next_version;
  END IF;
END;
$$;

COMMENT ON FUNCTION generate_proposal_version IS 'Generates a new version number for a proposal revision (e.g., SR-1005 -> SR-1005.2 -> SR-1005.3)';
