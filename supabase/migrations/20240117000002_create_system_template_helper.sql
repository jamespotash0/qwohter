-- =====================================================
-- Helper: Create System Templates
-- =====================================================
-- This file provides example SQL for creating system templates.
-- System templates must be created via direct SQL by database administrators.
--
-- Usage:
-- 1. Copy one of the examples below
-- 2. Modify the template data (name, description, form_type, tabs, etc.)
-- 3. Replace 'YOUR_USER_ID' with your actual user ID
-- 4. Run in Supabase SQL Editor
--
-- To get your user ID, run:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';
-- =====================================================

-- =====================================================
-- EXAMPLE 1: Basic Kwik-Wall Template
-- =====================================================
/*
INSERT INTO public.forms (
  id,
  organization_id,          -- MUST be NULL for system templates
  created_by,               -- Your user ID
  name,
  description,
  form_type,                -- This becomes the category in the library
  is_template,              -- MUST be true
  tabs,                     -- JSONB array of tabs and fields
  starting_proposal_number,
  is_archived,
  is_default,
  allow_save_incomplete,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  NULL,                     -- System template (no organization)
  'YOUR_USER_ID',          -- REPLACE with your actual user ID
  'Kwik-Wall Standard Form',
  'Standard Kwik-Wall form with essential fields for typical wall installation projects.',
  'Kwik-Wall',             -- Category
  true,                     -- Is template
  '[
    {
      "id": "tab-1",
      "name": "Job Details",
      "label": "Job Details",
      "order": 0,
      "fields": [
        {
          "id": "field-1",
          "name": "project_name",
          "label": "Project Name",
          "type": "text",
          "required": true,
          "order": 0
        },
        {
          "id": "field-2",
          "name": "contact_name",
          "label": "Contact Name",
          "type": "text",
          "required": true,
          "order": 1
        },
        {
          "id": "field-3",
          "name": "contact_email",
          "label": "Contact Email",
          "type": "email",
          "required": true,
          "order": 2
        },
        {
          "id": "field-4",
          "name": "contact_phone",
          "label": "Contact Phone",
          "type": "tel",
          "required": false,
          "order": 3
        }
      ]
    },
    {
      "id": "tab-2",
      "name": "Wall Specifications",
      "label": "Wall Specifications",
      "order": 1,
      "fields": [
        {
          "id": "field-5",
          "name": "wall_length",
          "label": "Wall Length (ft)",
          "type": "number",
          "required": true,
          "order": 0
        },
        {
          "id": "field-6",
          "name": "wall_height",
          "label": "Wall Height (ft)",
          "type": "number",
          "required": true,
          "order": 1
        },
        {
          "id": "field-7",
          "name": "wall_type",
          "label": "Wall Type",
          "type": "select",
          "required": true,
          "order": 2,
          "options": ["Standard", "Fire-Rated", "Sound-Proof"]
        }
      ]
    }
  ]'::jsonb,
  'KW-1000',               -- Starting proposal number
  false,                    -- Not archived
  false,                    -- Not default
  true,                     -- Allow save incomplete
  NOW(),
  NOW()
);
*/

-- =====================================================
-- EXAMPLE 2: Commercial Form Template
-- =====================================================
/*
INSERT INTO public.forms (
  id,
  organization_id,
  created_by,
  name,
  description,
  form_type,
  is_template,
  tabs,
  starting_proposal_number,
  is_archived,
  is_default,
  allow_save_incomplete,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'YOUR_USER_ID',          -- REPLACE with your actual user ID
  'Commercial Project Form',
  'Comprehensive form for commercial construction projects with budget tracking.',
  'Commercial',
  true,
  '[
    {
      "id": "tab-1",
      "name": "Project Details",
      "label": "Project Details",
      "order": 0,
      "fields": [
        {
          "id": "field-1",
          "name": "project_name",
          "label": "Project Name",
          "type": "text",
          "required": true,
          "order": 0
        },
        {
          "id": "field-2",
          "name": "client_company",
          "label": "Client Company",
          "type": "text",
          "required": true,
          "order": 1
        },
        {
          "id": "field-3",
          "name": "estimated_budget",
          "label": "Estimated Budget",
          "type": "number",
          "required": true,
          "order": 2
        }
      ]
    }
  ]'::jsonb,
  'COM-1000',
  false,
  false,
  true,
  NOW(),
  NOW()
);
*/

-- =====================================================
-- HELPER QUERIES
-- =====================================================

-- Get your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- View all system templates:
-- SELECT id, name, form_type, description, created_at
-- FROM public.forms
-- WHERE is_template = true AND organization_id IS NULL
-- ORDER BY created_at DESC;

-- Delete a system template (be careful!):
-- DELETE FROM public.forms
-- WHERE id = 'TEMPLATE_ID'
--   AND is_template = true
--   AND organization_id IS NULL;

-- Update a system template:
-- UPDATE public.forms
-- SET
--   name = 'Updated Template Name',
--   description = 'Updated description',
--   updated_at = NOW()
-- WHERE id = 'TEMPLATE_ID'
--   AND is_template = true
--   AND organization_id IS NULL;
