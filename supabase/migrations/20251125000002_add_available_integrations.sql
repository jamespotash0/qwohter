/**
 * Available Integrations Catalog
 *
 * Stores metadata for all available integrations (enabled or not)
 * Allows easy management without code deploys
 */

BEGIN;

-- ============================================================================
-- Available Integrations Table
-- ============================================================================

CREATE TABLE available_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Integration Identifier
  integration_type TEXT UNIQUE NOT NULL,        -- 'quickbooks_online', 'xero', etc.

  -- Display Information
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  category TEXT DEFAULT 'accounting',           -- 'accounting', 'crm', 'payment', etc.

  -- Availability
  is_enabled BOOLEAN DEFAULT true,              -- Global on/off switch
  is_beta BOOLEAN DEFAULT false,
  coming_soon BOOLEAN DEFAULT false,

  -- Plan Requirements
  required_plan TEXT,                           -- 'Starter', 'Pro', 'Enterprise', null = all plans

  -- Features
  features JSONB DEFAULT '[]'::jsonb,           -- Array of feature strings

  -- Metadata
  documentation_url TEXT,
  setup_difficulty TEXT,                        -- 'easy', 'moderate', 'advanced'
  estimated_setup_time_minutes INTEGER,

  -- Ordering
  display_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE available_integrations ENABLE ROW LEVEL SECURITY;

-- Everyone can view available integrations
CREATE POLICY "Anyone can view available integrations"
  ON available_integrations FOR SELECT
  USING (true);

-- Only service role can manage (for migrations/seeds)
CREATE POLICY "Service role can manage available integrations"
  ON available_integrations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Seed Initial Integrations
-- ============================================================================

INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  required_plan,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order
) VALUES
  (
    'quickbooks_online',
    'QuickBooks Online',
    'Sync your quotes and create invoices with QuickBooks Online integration.',
    '/images/integrations/quickbooks-online.png',
    'accounting',
    true,
    null,
    'https://developer.intuit.com/app/developer/qbo/docs/get-started',
    'moderate',
    15,
    1
  ),
  (
    'quickbooks_desktop',
    'QuickBooks Desktop',
    'Integrate with QuickBooks Desktop to manage invoices and quotes.',
    '/images/integrations/quickbooks-desktop.png',
    'accounting',
    true,
    null,
    'https://developer.intuit.com/app/developer/qbdesktop/docs/get-started',
    'advanced',
    30,
    2
  ),
  (
    'xero',
    'Xero',
    'Connect with Xero accounting software for seamless invoice management.',
    '/images/integrations/xero.png',
    'accounting',
    false,
    null,
    'https://developer.xero.com/documentation/',
    'moderate',
    15,
    3
  ),
  (
    'stripe',
    'Stripe',
    'Accept payments directly from quotes with Stripe integration.',
    '/images/integrations/stripe.png',
    'payment',
    false,
    null,
    'https://stripe.com/docs',
    'easy',
    10,
    4
  ),
  (
    'hubspot',
    'HubSpot CRM',
    'Sync contacts and deals with HubSpot CRM.',
    '/images/integrations/hubspot.png',
    'crm',
    false,
    null,
    'https://developers.hubspot.com/docs/api/overview',
    'moderate',
    20,
    5
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get integrations available for a specific plan
CREATE OR REPLACE FUNCTION get_integrations_for_plan(plan_name TEXT)
RETURNS SETOF available_integrations AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM available_integrations
  WHERE is_enabled = true
    AND (required_plan IS NULL OR required_plan = plan_name OR plan_name = 'Enterprise')
  ORDER BY display_order, name;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 * DROP FUNCTION IF EXISTS get_integrations_for_plan(TEXT);
 * DROP TABLE IF EXISTS available_integrations;
 * COMMIT;
 */
