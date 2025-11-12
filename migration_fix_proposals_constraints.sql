-- Migration: Fix Proposals Table Constraints
-- Renames old quotes_formbuilder_test constraints to proposals naming convention

-- 1. Rename Primary Key Constraint
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS quotes_formbuilder_test_pkey CASCADE;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);

-- 2. Rename Unique Constraint
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS quotes_formbuilder_test_proposal_number_key CASCADE;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_proposal_number_key UNIQUE (proposal_number);

-- 3. Rename Foreign Key Constraints
ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS quotes_formbuilder_test_created_by_fkey CASCADE;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES profiles (id)
  ON DELETE CASCADE;

ALTER TABLE proposals
  DROP CONSTRAINT IF EXISTS quotes_formbuilder_test_organization_id_fkey CASCADE;

ALTER TABLE proposals
  ADD CONSTRAINT proposals_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES organizations (id)
  ON DELETE CASCADE;

-- Note: proposals_form_id_fkey and proposals_proposal_status_check are already correctly named
