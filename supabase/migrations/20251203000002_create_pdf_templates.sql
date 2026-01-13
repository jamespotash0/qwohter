-- Migration: Create PDF Templates System
-- Date: 2025-12-03
-- Purpose: Store PDF template definitions and link them to forms

-- ============================================================================
-- PART 1: Create pdf_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Unique slug per organization (or globally for system templates)
  CONSTRAINT pdf_templates_slug_org_unique UNIQUE NULLS NOT DISTINCT (slug, organization_id)
);

-- Comments
COMMENT ON TABLE pdf_templates IS 'PDF rendering templates for proposals';
COMMENT ON COLUMN pdf_templates.name IS 'Display name of the template';
COMMENT ON COLUMN pdf_templates.slug IS 'URL-safe identifier (e.g., generic_wall, base, smart)';
COMMENT ON COLUMN pdf_templates.organization_id IS 'NULL = system template available to all, UUID = org-specific template';
COMMENT ON COLUMN pdf_templates.is_active IS 'Whether this template is available for use';

-- ============================================================================
-- PART 2: Create form_pdf_templates junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS form_pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  pdf_template_id UUID NOT NULL REFERENCES pdf_templates(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Each form-template pair should be unique
  CONSTRAINT form_pdf_templates_unique UNIQUE (form_id, pdf_template_id)
);

-- Comments
COMMENT ON TABLE form_pdf_templates IS 'Links forms to their available PDF templates';
COMMENT ON COLUMN form_pdf_templates.is_default IS 'If true, this template is pre-selected when creating proposals with this form';
COMMENT ON COLUMN form_pdf_templates.display_order IS 'Order in which templates appear in the dropdown';

-- ============================================================================
-- PART 3: Update proposals table to reference pdf_template_id
-- ============================================================================

-- Add pdf_template_id column (keeping template_type temporarily for migration)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS pdf_template_id UUID REFERENCES pdf_templates(id) ON DELETE SET NULL;

COMMENT ON COLUMN proposals.pdf_template_id IS 'Reference to the PDF template used for this proposal';

-- Index for pdf_template_id
CREATE INDEX IF NOT EXISTS idx_proposals_pdf_template
ON proposals(pdf_template_id) WHERE pdf_template_id IS NOT NULL;

-- ============================================================================
-- PART 4: Indexes for pdf_templates and form_pdf_templates
-- ============================================================================

-- Index for finding system templates
CREATE INDEX IF NOT EXISTS idx_pdf_templates_system
ON pdf_templates(is_active) WHERE organization_id IS NULL;

-- Index for finding org-specific templates
CREATE INDEX IF NOT EXISTS idx_pdf_templates_org
ON pdf_templates(organization_id, is_active) WHERE organization_id IS NOT NULL;

-- Index for finding templates by form
CREATE INDEX IF NOT EXISTS idx_form_pdf_templates_form
ON form_pdf_templates(form_id);

-- Index for finding default template per form
CREATE INDEX IF NOT EXISTS idx_form_pdf_templates_default
ON form_pdf_templates(form_id, is_default) WHERE is_default = true;

-- ============================================================================
-- PART 5: Enable RLS
-- ============================================================================

ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_pdf_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: RLS Policies for pdf_templates
-- ============================================================================

-- SELECT: Users can view system templates (org_id IS NULL) OR their org's templates
CREATE POLICY "pdf_templates_select_policy" ON pdf_templates
  FOR SELECT
  USING (
    organization_id IS NULL  -- System templates visible to all
    OR
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- INSERT: Only org members can create org-specific templates (no one creates system templates via API)
CREATE POLICY "pdf_templates_insert_policy" ON pdf_templates
  FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Only org members can update their org's templates
CREATE POLICY "pdf_templates_update_policy" ON pdf_templates
  FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- DELETE: Only org members can delete their org's templates
CREATE POLICY "pdf_templates_delete_policy" ON pdf_templates
  FOR DELETE
  USING (
    organization_id IS NOT NULL
    AND
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 7: RLS Policies for form_pdf_templates
-- ============================================================================

-- SELECT: Users can view template links for forms they have access to
CREATE POLICY "form_pdf_templates_select_policy" ON form_pdf_templates
  FOR SELECT
  USING (
    form_id IN (
      SELECT f.id FROM forms f
      WHERE f.organization_id IS NULL  -- System form templates
      OR f.organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: Only org members can link templates to their forms
CREATE POLICY "form_pdf_templates_insert_policy" ON form_pdf_templates
  FOR INSERT
  WITH CHECK (
    form_id IN (
      SELECT f.id FROM forms f
      WHERE f.organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- UPDATE: Only org members can update links for their forms
CREATE POLICY "form_pdf_templates_update_policy" ON form_pdf_templates
  FOR UPDATE
  USING (
    form_id IN (
      SELECT f.id FROM forms f
      WHERE f.organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- DELETE: Only org members can delete links for their forms
CREATE POLICY "form_pdf_templates_delete_policy" ON form_pdf_templates
  FOR DELETE
  USING (
    form_id IN (
      SELECT f.id FROM forms f
      WHERE f.organization_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PART 8: Seed system PDF templates (no auto-linking)
-- ============================================================================

-- Insert system templates (available for manual linking)
INSERT INTO pdf_templates (id, name, slug, description, organization_id, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Generic Wall Template', 'generic_wall', 'Standard wall quote template', NULL, true),
  ('00000000-0000-0000-0000-000000000002', 'Base Template', 'base', 'Simple base template', NULL, true),
  ('00000000-0000-0000-0000-000000000003', 'Smart Quote Template', 'smart', 'Intelligent template with auto-calculations', NULL, true)
ON CONFLICT (slug, organization_id) DO NOTHING;

-- NOTE: No auto-linking between forms and templates.
-- Forms and templates are independent entities.
-- Use form_pdf_templates junction table to manually link them when needed.
-- When creating a proposal, user can select any available template or none.
