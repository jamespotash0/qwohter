-- QuickBooks Desktop integration tables
--
-- These four tables are read/written by the QB Desktop Web Connector flow
-- (qb-web-connector / qb-desktop-setup edge functions and quickbooksDesktopService.ts)
-- but were never defined in a migration. This adds them idempotently
-- (CREATE TABLE IF NOT EXISTS) so it is safe whether or not they already exist
-- in the remote database.
--
-- RLS conventions match the rest of the schema:
--   is_active_member(auth.uid(), organization_id)  -> any active org member
--   has_org_role(auth.uid(), organization_id, ...) -> Owner/Admin only
-- The edge functions use the service-role key and bypass RLS entirely.

-- ============================================================================
-- quickbooks_desktop_connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quickbooks_desktop_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_file_name text,
  -- Username is the Web Connector login and is matched globally during
  -- authenticate(), so it must be unique across organizations.
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency_minutes integer NOT NULL DEFAULT 30,
  web_connector_version text,
  qb_version text,
  qb_edition text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbd_connections_org
  ON public.quickbooks_desktop_connections (organization_id);

ALTER TABLE public.quickbooks_desktop_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Members can view QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Owner/Admin can insert QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Owner/Admin can insert QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Owner/Admin can update QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Owner/Admin can update QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Owner/Admin can delete QB Desktop connections" ON public.quickbooks_desktop_connections;
CREATE POLICY "Owner/Admin can delete QB Desktop connections"
  ON public.quickbooks_desktop_connections FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_qbd_connections_updated_at ON public.quickbooks_desktop_connections;
CREATE TRIGGER set_qbd_connections_updated_at
  BEFORE UPDATE ON public.quickbooks_desktop_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Keep the integrations dashboard row in sync (function already exists and
-- branches on TG_TABLE_NAME; it was never attached to a trigger).
DROP TRIGGER IF EXISTS sync_qbd_integration_status ON public.quickbooks_desktop_connections;
CREATE TRIGGER sync_qbd_integration_status
  AFTER INSERT OR UPDATE ON public.quickbooks_desktop_connections
  FOR EACH ROW EXECUTE FUNCTION public.sync_integration_status();

-- ============================================================================
-- quickbooks_request_queue  (qbXML requests drained by the Web Connector)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quickbooks_request_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  qbxml_request text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  queue_status text NOT NULL DEFAULT 'Pending'
    CHECK (queue_status IN ('Pending', 'Sent', 'Completed', 'Failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  qbxml_response text,
  error_message text,
  source_record_type text,
  source_record_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

-- Supports the sendRequestXML "next pending request" lookup
-- (org + status, highest priority, oldest first).
CREATE INDEX IF NOT EXISTS idx_qb_queue_dispatch
  ON public.quickbooks_request_queue (organization_id, queue_status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_qb_queue_inflight
  ON public.quickbooks_request_queue (organization_id, queue_status, processed_at DESC);

ALTER TABLE public.quickbooks_request_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only: the queue carries invoice qbXML payloads, so it is gated the same
-- as the invoice sync table. The Web Connector drains it under the service role.
DROP POLICY IF EXISTS "Admin can view QB request queue" ON public.quickbooks_request_queue;
CREATE POLICY "Admin can view QB request queue"
  ON public.quickbooks_request_queue FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can insert QB request queue" ON public.quickbooks_request_queue;
CREATE POLICY "Admin can insert QB request queue"
  ON public.quickbooks_request_queue FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can update QB request queue" ON public.quickbooks_request_queue;
CREATE POLICY "Admin can update QB request queue"
  ON public.quickbooks_request_queue FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

-- ============================================================================
-- quickbooks_desktop_invoice_sync  (one sync row per quote/proposal)
-- ============================================================================
-- quote_id holds a proposals.id. The legacy column name ("quote") is kept to
-- match the code; proposals is the forward model that quotes is migrating to.
CREATE TABLE IF NOT EXISTS public.quickbooks_desktop_invoice_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL UNIQUE REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  qb_txn_id text,
  qb_edit_sequence text,
  qb_invoice_number text,
  sync_status text NOT NULL DEFAULT 'Pending'
    CHECK (sync_status IN ('Pending', 'Synced', 'Error')),
  last_sync_at timestamptz,
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbd_invoice_sync_org
  ON public.quickbooks_desktop_invoice_sync (organization_id);

ALTER TABLE public.quickbooks_desktop_invoice_sync ENABLE ROW LEVEL SECURITY;

-- Admin-only: only Owner/Admin may view, create, or edit invoices.
DROP POLICY IF EXISTS "Admin can view QB invoice sync" ON public.quickbooks_desktop_invoice_sync;
CREATE POLICY "Admin can view QB invoice sync"
  ON public.quickbooks_desktop_invoice_sync FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can insert QB invoice sync" ON public.quickbooks_desktop_invoice_sync;
CREATE POLICY "Admin can insert QB invoice sync"
  ON public.quickbooks_desktop_invoice_sync FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can update QB invoice sync" ON public.quickbooks_desktop_invoice_sync;
CREATE POLICY "Admin can update QB invoice sync"
  ON public.quickbooks_desktop_invoice_sync FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can delete QB invoice sync" ON public.quickbooks_desktop_invoice_sync;
CREATE POLICY "Admin can delete QB invoice sync"
  ON public.quickbooks_desktop_invoice_sync FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_qbd_invoice_sync_updated_at ON public.quickbooks_desktop_invoice_sync;
CREATE TRIGGER set_qbd_invoice_sync_updated_at
  BEFORE UPDATE ON public.quickbooks_desktop_invoice_sync
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- quickbooks_desktop_session_logs  (Web Connector session store)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quickbooks_desktop_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_ticket text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'error')),
  session_ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- getActiveSession() looks up by ticket + active status on every QBWC call.
CREATE INDEX IF NOT EXISTS idx_qbd_session_ticket
  ON public.quickbooks_desktop_session_logs (session_ticket, status);
CREATE INDEX IF NOT EXISTS idx_qbd_session_org
  ON public.quickbooks_desktop_session_logs (organization_id, created_at DESC);

ALTER TABLE public.quickbooks_desktop_session_logs ENABLE ROW LEVEL SECURITY;

-- Members read their org's session history; rows are written by the edge
-- function under the service role (which bypasses RLS).
DROP POLICY IF EXISTS "Members can view QB session logs" ON public.quickbooks_desktop_session_logs;
CREATE POLICY "Members can view QB session logs"
  ON public.quickbooks_desktop_session_logs FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));
