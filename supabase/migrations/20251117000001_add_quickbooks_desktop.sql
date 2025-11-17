/**
 * QuickBooks Desktop Integration Schema
 *
 * Handles QB Desktop connections via Web Connector
 */

BEGIN;

-- ============================================================================
-- QuickBooks Desktop Connections
-- ============================================================================

CREATE TABLE quickbooks_desktop_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Web Connector Authentication
  company_file_name TEXT NOT NULL,           -- Name of QB company file
  username TEXT NOT NULL,                     -- QB Web Connector username
  password_hash TEXT NOT NULL,                -- Hashed password for SOAP auth

  -- Connection Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER DEFAULT 15,  -- How often Web Connector polls

  -- Web Connector Info
  web_connector_version TEXT,
  qb_version TEXT,                            -- QuickBooks version
  qb_edition TEXT,                            -- Pro, Premier, Enterprise

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id)
);

-- ============================================================================
-- Pending QBXML Requests Queue
-- ============================================================================

CREATE TABLE quickbooks_request_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Request Details
  request_type TEXT NOT NULL,                 -- 'InvoiceAdd', 'CustomerQuery', etc.
  qbxml_request TEXT NOT NULL,                -- The actual QBXML to send
  priority INTEGER DEFAULT 0,                 -- Higher = processed first

  -- Status Tracking
  queue_status TEXT DEFAULT 'Pending',        -- Pending, Sent, Completed, Failed
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Response Data
  qbxml_response TEXT,
  error_message TEXT,

  -- Metadata
  source_record_type TEXT,                    -- 'quote', 'customer', etc.
  source_record_id UUID,                      -- Reference to source (quote_id, etc.)

  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  CONSTRAINT valid_queue_status CHECK (queue_status IN ('Pending', 'Sent', 'Completed', 'Failed'))
);

CREATE INDEX idx_qb_queue_status ON quickbooks_request_queue(organization_id, queue_status);
CREATE INDEX idx_qb_queue_priority ON quickbooks_request_queue(organization_id, priority DESC, created_at ASC);

-- ============================================================================
-- Invoice Sync Tracking
-- ============================================================================

CREATE TABLE quickbooks_desktop_invoice_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- QuickBooks Invoice Info
  qb_txn_id TEXT,                             -- QuickBooks Transaction ID
  qb_edit_sequence TEXT,                      -- For updates
  qb_invoice_number TEXT,

  -- Sync Status
  sync_status TEXT DEFAULT 'Pending',         -- Pending, Synced, Error
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(quote_id),
  CONSTRAINT valid_sync_status CHECK (sync_status IN ('Pending', 'Synced', 'Error'))
);

-- ============================================================================
-- Customer Sync Mapping
-- ============================================================================

CREATE TABLE quickbooks_desktop_customer_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Local Customer Info (from quotes)
  local_customer_name TEXT NOT NULL,
  local_customer_email TEXT,
  local_customer_phone TEXT,

  -- QuickBooks Customer Info
  qb_list_id TEXT NOT NULL,                   -- QuickBooks Customer ListID
  qb_edit_sequence TEXT,                      -- For updates
  qb_customer_name TEXT NOT NULL,

  -- Sync Status
  last_sync_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, local_customer_name)
);

-- ============================================================================
-- Item/Service Sync Mapping
-- ============================================================================

CREATE TABLE quickbooks_desktop_item_sync (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Local Item Info
  local_item_name TEXT NOT NULL,
  local_item_description TEXT,
  item_type TEXT NOT NULL,                    -- 'material', 'labor', 'service'

  -- QuickBooks Item Info
  qb_list_id TEXT NOT NULL,                   -- QuickBooks Item ListID
  qb_edit_sequence TEXT,
  qb_item_name TEXT NOT NULL,
  qb_item_type TEXT,                          -- 'Service', 'NonInventory', etc.

  -- Sync Status
  last_sync_at TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, local_item_name, item_type)
);

-- ============================================================================
-- Web Connector Session Logs
-- ============================================================================

CREATE TABLE quickbooks_desktop_session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Session Info
  session_ticket TEXT,
  session_started_at TIMESTAMPTZ DEFAULT now(),
  session_ended_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active',               -- active, completed, error
  requests_processed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,

  -- Logs
  log_data JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE quickbooks_desktop_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_request_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_desktop_invoice_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_desktop_customer_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_desktop_item_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_desktop_session_logs ENABLE ROW LEVEL SECURITY;

-- View own organization's QB connection
CREATE POLICY "Users can view their org's QB Desktop connection"
  ON quickbooks_desktop_connections FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- Only Owner/Admin can manage QB Desktop connections
CREATE POLICY "Owner/Admin can manage QB Desktop connections"
  ON quickbooks_desktop_connections FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ));

CREATE POLICY "Owner/Admin can update QB Desktop connections"
  ON quickbooks_desktop_connections FOR UPDATE
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

CREATE POLICY "Owner/Admin can delete QB Desktop connections"
  ON quickbooks_desktop_connections FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()
    AND status = 'Active'
    AND role IN ('Owner', 'Admin')
  ));

-- All active members can create invoice requests
CREATE POLICY "Users can create invoice requests"
  ON quickbooks_request_queue FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- Users can view their org's request queue
CREATE POLICY "Users can view their org's request queue"
  ON quickbooks_request_queue FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- View own organization's sync status
CREATE POLICY "Users can view their org's invoice syncs"
  ON quickbooks_desktop_invoice_sync FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- All active members can create/update invoice syncs
CREATE POLICY "Users can create invoice syncs"
  ON quickbooks_desktop_invoice_sync FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

CREATE POLICY "Users can update invoice syncs"
  ON quickbooks_desktop_invoice_sync FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

CREATE POLICY "Users can view their org's customer syncs"
  ON quickbooks_desktop_customer_sync FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

CREATE POLICY "Users can view their org's item syncs"
  ON quickbooks_desktop_item_sync FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'Active'
  ));

-- Service role can manage everything (for backend operations)
CREATE POLICY "Service role can manage QB connections"
  ON quickbooks_desktop_connections FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage QB queue"
  ON quickbooks_request_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage invoice syncs"
  ON quickbooks_desktop_invoice_sync FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage customer syncs"
  ON quickbooks_desktop_customer_sync FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage item syncs"
  ON quickbooks_desktop_item_sync FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage session logs"
  ON quickbooks_desktop_session_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to clean up old completed requests
CREATE OR REPLACE FUNCTION cleanup_old_qb_requests()
RETURNS void AS $$
BEGIN
  DELETE FROM quickbooks_request_queue
  WHERE queue_status IN ('Completed', 'Failed')
  AND completed_at < NOW() - INTERVAL '30 days';
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
 *
 * DROP FUNCTION IF EXISTS cleanup_old_qb_requests();
 * DROP TABLE IF EXISTS quickbooks_desktop_session_logs;
 * DROP TABLE IF EXISTS quickbooks_desktop_item_sync;
 * DROP TABLE IF EXISTS quickbooks_desktop_customer_sync;
 * DROP TABLE IF EXISTS quickbooks_desktop_invoice_sync;
 * DROP TABLE IF EXISTS quickbooks_request_queue;
 * DROP TABLE IF EXISTS quickbooks_desktop_connections;
 *
 * COMMIT;
 */
