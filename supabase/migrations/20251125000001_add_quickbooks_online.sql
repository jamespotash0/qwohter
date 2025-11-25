/**
 * QuickBooks Online Integration Schema
 *
 * Handles QB Online connections via OAuth 2.0 and REST API
 */

BEGIN;

-- ============================================================================
-- QuickBooks Online Connections
-- ============================================================================

CREATE TABLE quickbooks_online_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- OAuth 2.0 Tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  realm_id TEXT NOT NULL,                     -- QuickBooks Company ID

  -- Connection Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,

  -- QuickBooks Company Info
  company_name TEXT,
  company_country TEXT,
  company_currency TEXT DEFAULT 'USD',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id)
);

-- ============================================================================
-- QuickBooks Online Invoice Sync
-- ============================================================================

CREATE TABLE quickbooks_online_invoice_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- QuickBooks Invoice Info
  qb_invoice_id TEXT NOT NULL,                -- QuickBooks Invoice ID
  qb_invoice_number TEXT,
  qb_sync_token TEXT,                         -- For optimistic locking

  -- Sync Status
  sync_status TEXT DEFAULT 'Synced',          -- Synced, Error
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(quote_id),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('Synced', 'Error'))
);

-- ============================================================================
-- General Integrations Table (for UI management)
-- ============================================================================

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Integration Type
  integration_type TEXT NOT NULL,             -- 'quickbooks_online', 'quickbooks_desktop', etc.
  integration_name TEXT NOT NULL,             -- Display name

  -- Status
  is_connected BOOLEAN DEFAULT false,
  connection_status TEXT DEFAULT 'Disconnected', -- Connected, Disconnected, Error
  last_connection_check_at TIMESTAMPTZ,

  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,         -- Integration-specific settings
  connection_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, integration_type),
  CONSTRAINT valid_integration_type CHECK (integration_type IN ('quickbooks_online', 'quickbooks_desktop'))
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE quickbooks_online_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_online_invoice_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- QuickBooks Online Connections: View own organization
CREATE POLICY "Users can view their org's QB Online connection"
  ON quickbooks_online_connections FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- Only Owner/Admin can manage QB Online connections
CREATE POLICY "Owner/Admin can manage QB Online connections"
  ON quickbooks_online_connections FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ));

CREATE POLICY "Owner/Admin can update QB Online connections"
  ON quickbooks_online_connections FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ));

CREATE POLICY "Owner/Admin can delete QB Online connections"
  ON quickbooks_online_connections FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ));

-- QuickBooks Online Invoice Sync: View own organization's syncs
CREATE POLICY "Users can view their org's QB Online invoice syncs"
  ON quickbooks_online_invoice_sync FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- All active members can create invoice syncs
CREATE POLICY "Users can create QB Online invoice syncs"
  ON quickbooks_online_invoice_sync FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- Integrations: View own organization's integrations
CREATE POLICY "Users can view their org's integrations"
  ON integrations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- Only Owner/Admin can manage integrations
CREATE POLICY "Owner/Admin can manage integrations"
  ON integrations FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ));

-- Service role can manage everything (for backend operations)
CREATE POLICY "Service role can manage QB Online connections"
  ON quickbooks_online_connections FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage QB Online invoice syncs"
  ON quickbooks_online_invoice_sync FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage integrations"
  ON integrations FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to automatically create integration records when QB connections are made
CREATE OR REPLACE FUNCTION sync_integration_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a QB Online connection is created/updated
  IF TG_TABLE_NAME = 'quickbooks_online_connections' THEN
    INSERT INTO integrations (
      organization_id,
      integration_type,
      integration_name,
      is_connected,
      connection_status
    )
    VALUES (
      NEW.organization_id,
      'quickbooks_online',
      'QuickBooks Online',
      NEW.is_active,
      CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END
    )
    ON CONFLICT (organization_id, integration_type)
    DO UPDATE SET
      is_connected = NEW.is_active,
      connection_status = CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END,
      last_connection_check_at = now(),
      updated_at = now();
  END IF;

  -- When a QB Desktop connection is created/updated
  IF TG_TABLE_NAME = 'quickbooks_desktop_connections' THEN
    INSERT INTO integrations (
      organization_id,
      integration_type,
      integration_name,
      is_connected,
      connection_status
    )
    VALUES (
      NEW.organization_id,
      'quickbooks_desktop',
      'QuickBooks Desktop',
      NEW.is_active,
      CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END
    )
    ON CONFLICT (organization_id, integration_type)
    DO UPDATE SET
      is_connected = NEW.is_active,
      connection_status = CASE WHEN NEW.is_active THEN 'Connected' ELSE 'Disconnected' END,
      last_connection_check_at = now(),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync QB Online connections to integrations table
CREATE TRIGGER sync_qb_online_integration
  AFTER INSERT OR UPDATE ON quickbooks_online_connections
  FOR EACH ROW
  EXECUTE FUNCTION sync_integration_status();

-- Trigger to sync QB Desktop connections to integrations table
CREATE TRIGGER sync_qb_desktop_integration
  AFTER INSERT OR UPDATE ON quickbooks_desktop_connections
  FOR EACH ROW
  EXECUTE FUNCTION sync_integration_status();

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 *
 * DROP TRIGGER IF EXISTS sync_qb_online_integration ON quickbooks_online_connections;
 * DROP TRIGGER IF EXISTS sync_qb_desktop_integration ON quickbooks_desktop_connections;
 * DROP FUNCTION IF EXISTS sync_integration_status();
 * DROP TABLE IF EXISTS integrations;
 * DROP TABLE IF EXISTS quickbooks_online_invoice_sync;
 * DROP TABLE IF EXISTS quickbooks_online_connections;
 *
 * COMMIT;
 */
