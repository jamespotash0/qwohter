-- ============================================================================
-- PayPal, Zapier, Microsoft Word & Salesforce Integrations (Coming Soon)
-- ============================================================================
-- Adds PayPal, Zapier, Microsoft Word, and Salesforce to available integrations as coming soon

BEGIN;

-- ============================================================================
-- 1. Add PayPal Integration (Coming Soon)
-- ============================================================================

INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  is_beta,
  coming_soon,
  required_plan,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order,
  platform_requirement
) VALUES (
  'paypal',
  'PayPal',
  'Accept payments and invoices directly through PayPal. Send payment links with your proposals.',
  '/images/integrations/paypal.png',
  'payment',
  true,
  false,
  true,  -- Coming soon
  NULL,
  'https://developer.paypal.com/docs/',
  'easy',
  10,
  6,
  NULL
) ON CONFLICT (integration_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coming_soon = EXCLUDED.coming_soon,
  updated_at = NOW();

-- ============================================================================
-- 2. Add Zapier Integration (Coming Soon)
-- ============================================================================

INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  is_beta,
  coming_soon,
  required_plan,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order,
  platform_requirement
) VALUES (
  'zapier',
  'Zapier',
  'Connect WallQu to 5,000+ apps. Automate workflows when proposals are created, approved, or signed.',
  '/images/integrations/zapier.png',
  'automation',
  true,
  false,
  true,  -- Coming soon
  NULL,
  'https://zapier.com/developer/documentation/',
  'easy',
  15,
  7,
  NULL
) ON CONFLICT (integration_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coming_soon = EXCLUDED.coming_soon,
  updated_at = NOW();

-- ============================================================================
-- 3. Add Microsoft Word Integration (Coming Soon)
-- ============================================================================

INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  is_beta,
  coming_soon,
  required_plan,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order,
  platform_requirement
) VALUES (
  'microsoft_word',
  'Microsoft Word',
  'Export proposals directly to Microsoft Word format. Edit and customize documents with familiar tools.',
  '/images/integrations/microsoft-word.png',
  'document',
  true,
  false,
  true,  -- Coming soon
  NULL,
  'https://learn.microsoft.com/en-us/office/dev/add-ins/',
  'easy',
  5,
  8,
  NULL
) ON CONFLICT (integration_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coming_soon = EXCLUDED.coming_soon,
  updated_at = NOW();

-- ============================================================================
-- 4. Add Salesforce Integration (Coming Soon)
-- ============================================================================

INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  is_beta,
  coming_soon,
  required_plan,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order,
  platform_requirement
) VALUES (
  'salesforce',
  'Salesforce',
  'Sync proposals with Salesforce CRM. Create opportunities and track deals from your proposals.',
  '/images/integrations/salesforce.png',
  'crm',
  true,
  false,
  true,  -- Coming soon
  NULL,
  'https://developer.salesforce.com/docs/',
  'moderate',
  20,
  9,
  NULL
) ON CONFLICT (integration_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coming_soon = EXCLUDED.coming_soon,
  updated_at = NOW();

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 * DELETE FROM available_integrations WHERE integration_type IN ('paypal', 'zapier', 'microsoft_word', 'salesforce');
 * COMMIT;
 */
