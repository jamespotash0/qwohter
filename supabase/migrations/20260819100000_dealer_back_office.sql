-- Dealer back office — consolidated schema
--
-- Everything the back-office branch adds, in one file, in the order it was
-- built. This exists because the individual migrations were never applied to
-- any environment beyond a local database, so there is nothing to preserve a
-- step-by-step history for.
--
-- It is a straight concatenation, not a hand-optimised rewrite. A few objects
-- are therefore created and then replaced further down — the observed-discount
-- view is built against quoted cost and then rebuilt against acknowledged cost,
-- for instance. That redundancy is deliberate: reproducing the exact sequence
-- is verifiable against the incremental migrations, and hand-collapsing it
-- would be a rewrite nobody could check.
--
-- Verified by fingerprinting every column, constraint, index, function, policy,
-- view, and trigger in `public` after applying the incremental migrations, then
-- again after applying only this file, and diffing the two.
--
-- Contents, in order:
--    1. 20260819100000_companies.sql
--    2. 20260819100001_attachments.sql
--    3. 20260819100002_consolidate_attachments.sql
--    4. 20260819100003_sales_orders.sql
--    5. 20260819100004_drop_product_catalog.sql
--    6. 20260819100005_vendor_purchase_orders.sql
--    7. 20260819100006_order_line_fulfillment_type.sql
--    8. 20260819100007_work_orders.sql
--    9. 20260820100000_observed_discounts.sql
--   10. 20260821100000_observed_rates_from_acks.sql
--   11. 20260821110000_allocate_document_number.sql
--   12. 20260821110001_order_status_from_events.sql
--   13. 20260824100000_receipts.sql
--   14. 20260824110000_project_hub.sql
--   15. 20260824120000_shipments.sql
--   16. 20260825100000_apply_spec_revision.sql
--   17. 20260825110000_drop_can_view_cost.sql
--   18. 20260825120000_manual_delivery.sql



-- ==========================================================================
-- 20260819100000_companies.sql
-- ==========================================================================

-- Companies
--
-- Back-office foundation. Today `contacts` models people only (full_name,
-- emails, phones), with no account behind them, so there is nowhere to hang a
-- bill-to address, payment terms, or tax status. The account a dealer sells to
-- becomes first-class:
--
--   companies  who you sell to  (bill-to, ship-to, terms, tax status)
--
-- Decisions baked in:
--   * contacts stay people. A contact optionally belongs to a company.
--   * There is deliberately no matching table for who you BUY from. Dealers
--     place orders in each manufacturer's own portal, not from here, so an
--     address book for a letter that never gets sent would be pure setup cost.
--     Manufacturers and series travel as text on the line, exactly as the
--     specification tool spelled them.
--   * Nothing here references a product catalog: specification tools already
--     resolve part numbers, options, and list price, so maintaining catalog
--     hierarchy would be a permanent cost with nothing to show for it.

-- ============================================================================
-- companies  (the customer account you sell to)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- Legal entity name when it differs from the trading name (used on invoices).
  legal_name text,
  company_type text NOT NULL DEFAULT 'Customer'
    CHECK (company_type IN ('Customer', 'Prospect', 'Partner', 'Other')),

  -- Bill-to
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text DEFAULT 'US',

  -- Default ship-to. Individual orders may override; this is the fallback.
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text DEFAULT 'US',

  phone text,
  website text,

  -- Commercial terms
  payment_terms text DEFAULT 'Net 30',
  tax_exempt boolean NOT NULL DEFAULT false,
  tax_exempt_certificate text,
  -- Overrides the state-derived rate when set (some jurisdictions/contracts differ).
  default_tax_rate numeric CHECK (default_tax_rate IS NULL OR default_tax_rate >= 0),

  primary_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  -- Customer id in the accounting system, so invoices post to the right account.
  external_accounting_id text,

  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_org
  ON public.companies (organization_id);
-- Supports the company picker: active companies for an org, alphabetical.
CREATE INDEX IF NOT EXISTS idx_companies_org_active_name
  ON public.companies (organization_id, is_active, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_name_unique
  ON public.companies (organization_id, lower(name));

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view companies" ON public.companies;
CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert companies" ON public.companies;
CREATE POLICY "Members can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update companies" ON public.companies;
CREATE POLICY "Members can update companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Deleting a customer account cascades into order history, so it stays with
-- Owner/Admin. Everyone else deactivates instead.
DROP POLICY IF EXISTS "Admin can delete companies" ON public.companies;
CREATE POLICY "Admin can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- contacts.company_id  (a person belongs to a company)
-- ============================================================================
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_company
  ON public.contacts (company_id) WHERE company_id IS NOT NULL;

COMMENT ON COLUMN public.contacts.company_id IS
  'Optional employer. Contacts remain people; companies are the account. Supersedes the free-text contacts.company_name, which is retained as the pre-migration value and as the fallback label for contacts not yet linked to a company.';


-- ==========================================================================
-- 20260819100001_attachments.sql
-- ==========================================================================

-- Polymorphic attachments
--
-- Back-office paperwork does not belong to a project or a proposal — it belongs
-- to the specific thing it documents. An acknowledgment attaches to the purchase
-- order it acknowledges; a packing slip and damage photos attach to the receipt;
-- a signed delivery ticket attaches to the work order. When a dealer disputes a
-- line with a manufacturer, "which PO was this against" is the whole question.
--
-- Superseded note: this migration originally left project_attachments in place.
-- 20260819100002_consolidate_attachments.sql folds it into this table
-- (entity_type = 'project') and drops it, so `attachments` is the only file
-- table from that point on.
--
-- Decisions baked in:
--   * entity_id carries no foreign key — that is the cost of a polymorphic
--     table. entity_type is constrained so a typo cannot silently orphan a file,
--     and deletes of a parent must clean up here explicitly.
--   * document_type describes what the paper IS, separately from what it hangs
--     off. The same acknowledgment PDF is an 'acknowledgment' whether it lands
--     on a PO or on an order line.
--   * Files live in the existing private 'projects-attachments' bucket and are
--     served through signed URLs, matching projectAttachmentsService.

CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What this file hangs off. No FK: the target table varies by row.
  entity_type text NOT NULL
    CHECK (entity_type IN (
      'project',
      'proposal',
      'company',
      'sales_order',
      'order_line',
      'vendor_po',
      'acknowledgment',
      'receipt',
      'work_order',
      'punch_item'
    )),
  entity_id uuid NOT NULL,

  -- What the file is, independent of what it is attached to.
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN (
      'acknowledgment',
      'packing_slip',
      'bill_of_lading',
      'damage_photo',
      'vendor_invoice',
      'customer_invoice',
      'quote',
      'drawing',
      'specification',
      'spec_file',
      'photo',
      'contract',
      'other'
    )),

  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  description text,

  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The dominant read: everything attached to one thing, newest first.
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_org
  ON public.attachments (organization_id);
-- Supports "every acknowledgment awaiting review" style sweeps.
CREATE INDEX IF NOT EXISTS idx_attachments_org_doctype
  ON public.attachments (organization_id, document_type, created_at DESC);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Warehouse and field staff have to be able to attach a damage photo or a
-- signed delivery ticket, so read and write are open to active members. The
-- documents themselves carry no margin data; discounts and cost live elsewhere.
DROP POLICY IF EXISTS "Members can view attachments" ON public.attachments;
CREATE POLICY "Members can view attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert attachments" ON public.attachments;
CREATE POLICY "Members can insert attachments"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Editing the description of someone else's upload is an admin action; your own
-- upload is yours to correct.
DROP POLICY IF EXISTS "Uploader or admin can update attachments" ON public.attachments;
CREATE POLICY "Uploader or admin can update attachments"
  ON public.attachments FOR UPDATE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  );

-- Deleting evidence in a manufacturer dispute is consequential. Same rule as update.
DROP POLICY IF EXISTS "Uploader or admin can delete attachments" ON public.attachments;
CREATE POLICY "Uploader or admin can delete attachments"
  ON public.attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  );

DROP TRIGGER IF EXISTS set_attachments_updated_at ON public.attachments;
CREATE TRIGGER set_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.attachments IS
  'Polymorphic file attachments for back-office entities. entity_id has no foreign key; parent deletes must clean up here explicitly.';
COMMENT ON COLUMN public.attachments.entity_id IS
  'Id of the row named by entity_type. Deliberately unconstrained — validate in application code.';
COMMENT ON COLUMN public.attachments.file_path IS
  'Path within the private projects-attachments storage bucket. Served via signed URLs.';


-- ==========================================================================
-- 20260819100002_consolidate_attachments.sql
-- ==========================================================================

-- Consolidate project_attachments into attachments
--
-- Two tables were storing the same concept — a file in the projects-attachments
-- bucket with name/size/type/uploader metadata — differing only in how the owner
-- was expressed: a hard project_id FK versus a polymorphic entity_type/entity_id
-- pair. `attachments` is a strict superset ('project' is already a valid
-- entity_type), so this is a data migration rather than a redesign.
--
-- No files move. file_path is stored per row, so backfilled rows keep their
-- original {org}/{project_id}/{ts}_{name} paths. The storage RLS policy only
-- checks the first path segment against org membership, so both the old and new
-- path conventions pass unchanged.
--
-- Backfill and drop run in one transaction: if the copy fails, nothing is lost.
--
-- Two behavior changes, both deliberate:
--   * DELETE tightens from "any active member" to "uploader or Owner/Admin".
--     Deleting evidence in a manufacturer dispute should not be casual.
--   * public_url is not carried over. It has stored '' on every row since the
--     bucket went private; the app overwrites it with a signed URL at read time.

-- ============================================================================
-- 1. document_type gains 'proposal'
-- ============================================================================
-- project_attachments.category includes 'proposal', which has no equivalent in
-- the back-office document types. Add it rather than flattening those rows.

ALTER TABLE public.attachments
  DROP CONSTRAINT IF EXISTS attachments_document_type_check;

ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_document_type_check
  CHECK (document_type IN (
    'acknowledgment',
    'packing_slip',
    'bill_of_lading',
    'damage_photo',
    'vendor_invoice',
    'customer_invoice',
    'quote',
    'proposal',
    'drawing',
    'specification',
    'spec_file',
    'photo',
    'contract',
    'other'
  ));

-- ============================================================================
-- 2. Backfill
-- ============================================================================
-- created_at/updated_at are carried across so file history is preserved rather
-- than every legacy file appearing to have been uploaded at migration time.

INSERT INTO public.attachments (
  id,
  organization_id,
  entity_type,
  entity_id,
  document_type,
  file_name,
  file_path,
  file_size,
  file_type,
  description,
  uploaded_by,
  created_at,
  updated_at
)
SELECT
  pa.id,
  pa.organization_id,
  'project',
  pa.project_id,
  CASE pa.category
    WHEN 'drawing'       THEN 'drawing'
    WHEN 'invoice'       THEN 'customer_invoice'
    WHEN 'photo'         THEN 'photo'
    WHEN 'contract'      THEN 'contract'
    WHEN 'proposal'      THEN 'proposal'
    WHEN 'specification' THEN 'specification'
    ELSE 'other'
  END,
  pa.file_name,
  pa.file_path,
  pa.file_size,
  pa.file_type,
  pa.description,
  -- project_attachments.uploaded_by is NOT NULL, but the user may since have
  -- been deleted; attachments.uploaded_by is ON DELETE SET NULL, so guard it.
  CASE WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = pa.uploaded_by)
       THEN pa.uploaded_by
       ELSE NULL
  END,
  pa.created_at,
  pa.updated_at
FROM public.project_attachments pa
-- Idempotent: re-running the migration must not duplicate rows.
WHERE NOT EXISTS (
  SELECT 1 FROM public.attachments a WHERE a.id = pa.id
);

-- ============================================================================
-- 3. Drop the old table
-- ============================================================================

DROP TABLE IF EXISTS public.project_attachments;

-- The trigger function existed only to stamp updated_at on that table;
-- attachments uses the shared handle_updated_at().
DROP FUNCTION IF EXISTS public.update_project_attachments_updated_at();

COMMENT ON TABLE public.attachments IS
  'Polymorphic file attachments. Supersedes project_attachments, which was folded in on 2026-08-19. entity_id has no foreign key; parent deletes must clean up here explicitly.';


-- ==========================================================================
-- 20260819100003_sales_orders.sql
-- ==========================================================================

-- Sales orders and order lines
--
-- The missing middle. A proposal is a document; an order line is a thing that
-- gets bought, acknowledged, shipped, received, installed, and invoiced --
-- independently, in partial quantities, over months. A JSONB blob inside
-- proposals.form_data cannot carry an identity through that, so winning a
-- proposal materializes its priced line items into real rows.
--
--   project -> sales_order -> order_lines -> (POs, receipts, work orders)
--
-- Decisions baked in:
--
--   * A project may have several sales orders. Change orders and added scope
--     get their own, mirroring how payment_jobs already works.
--
--   * Ship-to is SNAPSHOTTED onto the order, not read through to companies. A
--     customer moving office must not silently rewrite where last year's order
--     was delivered.
--
--   * Fulfillment is event-sourced. order_line_events is append-only and the
--     quantities are derived from it -- see the order_line_fulfillment view.
--     There is deliberately no mutable qty_received counter: partial shipments,
--     damage replacements, and returns corrupt those within the first real job.
--
--   * Pricing columns mirror src/lib/types/pricing.ts exactly, so a line means
--     the same thing on a quote and on a purchase order. Cost is derived in
--     list_down mode; unit_cost is the stamped cache, restamped on write.
--
--   * contract_vehicle lives on the order because it is a property of the
--     sale, and it is what contract pricing keys off.

-- ============================================================================
-- sales_orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- The proposal this was materialized from. Kept for traceability; a manually
  -- created order has none.
  proposal_id uuid REFERENCES public.proposals(id) ON DELETE SET NULL,

  order_number text,
  -- The customer's own PO number, which they will expect on the invoice.
  customer_po_number text,

  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,

  -- Snapshot, not a lookup. See header.
  ship_to_name text,
  ship_to_address_line1 text,
  ship_to_address_line2 text,
  ship_to_city text,
  ship_to_state text,
  ship_to_postal_code text,
  ship_to_country text DEFAULT 'US',

  -- Drives contract pricing, and is carried onto every order placed.
  contract_vehicle text,

  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN (
      'Draft',              -- being assembled, nothing ordered
      'Released',           -- approved to order, no POs issued yet
      'Partially Ordered',  -- some lines on a PO
      'Ordered',            -- every line on a PO
      'Receiving',          -- product arriving
      'Installing',
      'Complete',
      'Cancelled'
    )),

  requested_delivery_date date,
  notes text,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_project
  ON public.sales_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_org_status
  ON public.sales_orders (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_proposal
  ON public.sales_orders (proposal_id) WHERE proposal_id IS NOT NULL;
-- Order numbers are optional while a draft is being assembled, so uniqueness is
-- enforced only once one is assigned.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_number_unique
  ON public.sales_orders (organization_id, order_number)
  WHERE order_number IS NOT NULL;

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view sales orders" ON public.sales_orders;
CREATE POLICY "Members can view sales orders"
  ON public.sales_orders FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert sales orders" ON public.sales_orders;
CREATE POLICY "Members can insert sales orders"
  ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update sales orders" ON public.sales_orders;
CREATE POLICY "Members can update sales orders"
  ON public.sales_orders FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Deleting an order destroys its lines and their fulfillment history.
DROP POLICY IF EXISTS "Admin can delete sales orders" ON public.sales_orders;
CREATE POLICY "Admin can delete sales orders"
  ON public.sales_orders FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER set_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- order_lines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,

  line_number integer NOT NULL,

  -- Grouping as the specification expressed it. Furniture orders are read by
  -- room, and phased orders ship by tag.
  area text,
  spec_phase text,

  -- Manufacturer and series are TEXT, carried verbatim from the specification
  -- export. There is no product catalog to reference: the spec tool already
  -- resolved the part number, options, and list price before the line arrived.
  manufacturer_name text,
  series_name text,

  model_number text,
  description text NOT NULL,
  -- Raw option/configuration code string from the spec tool, reproduced
  -- verbatim on the purchase order.
  option_string text,

  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Buy side -------------------------------------------------------------
  pricing_mode text NOT NULL DEFAULT 'cost_up'
    CHECK (pricing_mode IN ('cost_up', 'list_down')),
  list_price numeric CHECK (list_price IS NULL OR list_price >= 0),
  dealer_discount_percent numeric
    CHECK (dealer_discount_percent IS NULL
           OR (dealer_discount_percent >= 0 AND dealer_discount_percent <= 100)),
  -- Derived in list_down mode; the authority is list_price and the discount.
  unit_cost numeric NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),

  -- Sell side ------------------------------------------------------------
  sell_rule text,
  markup_type text NOT NULL DEFAULT 'percent'
    CHECK (markup_type IN ('percent', 'dollar')),
  markup_value numeric NOT NULL DEFAULT 0,
  discount_type text CHECK (discount_type IS NULL OR discount_type IN ('percent', 'dollar')),
  discount_value numeric CHECK (discount_value IS NULL OR discount_value >= 0),
  sell_price numeric NOT NULL DEFAULT 0,
  is_taxable boolean NOT NULL DEFAULT false,

  -- Provenance -----------------------------------------------------------
  -- Line number in the originating spec file, for reconciling against it.
  source_line_number integer,
  -- The id of the proposal pricing line this was materialized from, so a line
  -- can be traced back to the quote the customer accepted.
  source_proposal_line_id text,

  status text NOT NULL DEFAULT 'Open'
    CHECK (status IN ('Open', 'Ordered', 'Cancelled', 'Closed')),

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The dominant read: every line on an order, in specification order.
CREATE INDEX IF NOT EXISTS idx_order_lines_order
  ON public.order_lines (sales_order_id, line_number);
CREATE INDEX IF NOT EXISTS idx_order_lines_org
  ON public.order_lines (organization_id);
-- Supports the fan-out: group an order's open lines by who supplies them.
CREATE INDEX IF NOT EXISTS idx_order_lines_manufacturer
  ON public.order_lines (manufacturer_name, status)
  WHERE manufacturer_name IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_lines_number_unique
  ON public.order_lines (sales_order_id, line_number);

ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

-- Cost columns live on this table and are readable by any active member.
--
-- That is deliberate, not an omission. At a dealer the AE quotes the job, the
-- designer sees list and discount in the specification tool, and the PM
-- reconciles acknowledgments against cost -- which is the entire variance
-- queue. Everyone in the office needs it.
--
-- The one group that should not see cost is field crews, and they have no
-- login here. If a client portal ever lands, a customer is not an org member at
-- all, so it will need a sell-side-only view rather than a membership check.
DROP POLICY IF EXISTS "Members can view order lines" ON public.order_lines;
CREATE POLICY "Members can view order lines"
  ON public.order_lines FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert order lines" ON public.order_lines;
CREATE POLICY "Members can insert order lines"
  ON public.order_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update order lines" ON public.order_lines;
CREATE POLICY "Members can update order lines"
  ON public.order_lines FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can delete order lines" ON public.order_lines;
CREATE POLICY "Members can delete order lines"
  ON public.order_lines FOR DELETE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP TRIGGER IF EXISTS set_order_lines_updated_at ON public.order_lines;
CREATE TRIGGER set_order_lines_updated_at
  BEFORE UPDATE ON public.order_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- order_line_events  (append-only fulfillment history)
-- ============================================================================
-- Every quantity question about a line -- how many are ordered, acknowledged,
-- received, installed, invoiced -- is answered by summing this table, never by
-- reading a counter someone remembered to update.
--
-- quantity is signed: a return or a cancellation is a negative 'received' or
-- 'ordered' event rather than a separate event type, so the sums stay simple.

CREATE TABLE IF NOT EXISTS public.order_line_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE CASCADE,

  event_type text NOT NULL
    CHECK (event_type IN (
      'ordered',
      'acknowledged',
      'shipped',
      'received',
      'installed',
      'invoiced'
    )),

  -- Signed. Negative reverses a prior event (return, cancellation, correction).
  quantity numeric NOT NULL CHECK (quantity <> 0),

  occurred_at timestamptz NOT NULL DEFAULT now(),

  -- What caused this, without a foreign key per possible source.
  reference_type text
    CHECK (reference_type IS NULL OR reference_type IN (
      'vendor_po', 'acknowledgment', 'receipt', 'work_order', 'invoice', 'manual'
    )),
  reference_id uuid,

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_line_events_line
  ON public.order_line_events (order_line_id, event_type);
CREATE INDEX IF NOT EXISTS idx_order_line_events_org
  ON public.order_line_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_line_events_reference
  ON public.order_line_events (reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

ALTER TABLE public.order_line_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view order line events" ON public.order_line_events;
CREATE POLICY "Members can view order line events"
  ON public.order_line_events FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert order line events" ON public.order_line_events;
CREATE POLICY "Members can insert order line events"
  ON public.order_line_events FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Append-only by design: no UPDATE policy. A mistake is corrected by recording
-- a compensating negative event, which keeps the audit trail honest.

DROP POLICY IF EXISTS "Admin can delete order line events" ON public.order_line_events;
CREATE POLICY "Admin can delete order line events"
  ON public.order_line_events FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

-- ============================================================================
-- order_line_fulfillment  (derived quantities)
-- ============================================================================
-- security_invoker so the caller's RLS applies rather than the view owner's.

CREATE OR REPLACE VIEW public.order_line_fulfillment
WITH (security_invoker = true) AS
SELECT
  ol.id                AS order_line_id,
  ol.organization_id,
  ol.sales_order_id,
  ol.quantity          AS quantity_ordered_total,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'ordered'), 0)      AS qty_ordered,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'acknowledged'), 0) AS qty_acknowledged,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'shipped'), 0)      AS qty_shipped,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'received'), 0)     AS qty_received,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'installed'), 0)    AS qty_installed,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'invoiced'), 0)     AS qty_invoiced,
  -- What still needs to be put on a purchase order.
  ol.quantity - COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'ordered'), 0)
                                                                            AS qty_to_order
FROM public.order_lines ol
LEFT JOIN public.order_line_events e ON e.order_line_id = ol.id
GROUP BY ol.id, ol.organization_id, ol.sales_order_id, ol.quantity;

COMMENT ON VIEW public.order_line_fulfillment IS
  'Derived fulfillment quantities per order line, summed from order_line_events. There is no stored counter; this view is the only correct source.';

GRANT SELECT ON public.order_line_fulfillment TO authenticated;
GRANT SELECT ON public.order_line_fulfillment TO service_role;

-- ============================================================================
-- create_sales_order_with_lines
-- ============================================================================
-- supabase-js has no transaction, and a real furniture order is hundreds to
-- thousands of lines. A partial insert would leave an order that looks complete
-- and silently under-orders, so creation goes through one function call.
--
-- SECURITY INVOKER (the default): RLS applies, so a caller cannot write into an
-- organization they are not an active member of. organization_id is taken from
-- the arguments and checked by the WITH CHECK policies on both tables.
--
-- Pricing is computed in TypeScript (src/lib/pricing) and passed in already
-- resolved. Duplicating that arithmetic here would create a second source of
-- truth that could disagree with the quote the customer accepted.

CREATE OR REPLACE FUNCTION public.create_sales_order_with_lines(
  p_order jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_org_id uuid := (p_order->>'organization_id')::uuid;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'p_lines must be a JSON array';
  END IF;

  INSERT INTO public.sales_orders (
    organization_id, project_id, proposal_id, order_number, customer_po_number,
    company_id, ship_to_name, ship_to_address_line1, ship_to_address_line2,
    ship_to_city, ship_to_state, ship_to_postal_code, ship_to_country,
    contract_vehicle, status, requested_delivery_date, notes, created_by
  )
  VALUES (
    v_org_id,
    (p_order->>'project_id')::uuid,
    NULLIF(p_order->>'proposal_id', '')::uuid,
    NULLIF(p_order->>'order_number', ''),
    NULLIF(p_order->>'customer_po_number', ''),
    NULLIF(p_order->>'company_id', '')::uuid,
    NULLIF(p_order->>'ship_to_name', ''),
    NULLIF(p_order->>'ship_to_address_line1', ''),
    NULLIF(p_order->>'ship_to_address_line2', ''),
    NULLIF(p_order->>'ship_to_city', ''),
    NULLIF(p_order->>'ship_to_state', ''),
    NULLIF(p_order->>'ship_to_postal_code', ''),
    COALESCE(NULLIF(p_order->>'ship_to_country', ''), 'US'),
    NULLIF(p_order->>'contract_vehicle', ''),
    COALESCE(NULLIF(p_order->>'status', ''), 'Draft'),
    NULLIF(p_order->>'requested_delivery_date', '')::date,
    NULLIF(p_order->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_lines (
    organization_id, sales_order_id, line_number, area, spec_phase,
    manufacturer_name, series_name,
    model_number, description, option_string, quantity,
    pricing_mode, list_price, dealer_discount_percent, unit_cost,
    sell_rule, markup_type, markup_value, discount_type, discount_value,
    sell_price, is_taxable, source_line_number, source_proposal_line_id, notes
  )
  SELECT
    v_org_id,
    v_order_id,
    -- Caller-supplied line numbers are honoured; otherwise they are assigned in
    -- array order so specification sequence is preserved.
    COALESCE((l->>'line_number')::integer, (ordinality)::integer),
    NULLIF(l->>'area', ''),
    NULLIF(l->>'spec_phase', ''),
    NULLIF(l->>'manufacturer_name', ''),
    NULLIF(l->>'series_name', ''),
    NULLIF(l->>'model_number', ''),
    COALESCE(NULLIF(l->>'description', ''), 'Unnamed line'),
    NULLIF(l->>'option_string', ''),
    COALESCE((l->>'quantity')::numeric, 1),
    COALESCE(NULLIF(l->>'pricing_mode', ''), 'cost_up'),
    NULLIF(l->>'list_price', '')::numeric,
    NULLIF(l->>'dealer_discount_percent', '')::numeric,
    COALESCE((l->>'unit_cost')::numeric, 0),
    NULLIF(l->>'sell_rule', ''),
    COALESCE(NULLIF(l->>'markup_type', ''), 'percent'),
    COALESCE((l->>'markup_value')::numeric, 0),
    NULLIF(l->>'discount_type', ''),
    NULLIF(l->>'discount_value', '')::numeric,
    COALESCE((l->>'sell_price')::numeric, 0),
    COALESCE((l->>'is_taxable')::boolean, false),
    NULLIF(l->>'source_line_number', '')::integer,
    NULLIF(l->>'source_proposal_line_id', ''),
    NULLIF(l->>'notes', '')
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ordinality);

  RETURN v_order_id;
END;
$$;

ALTER FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) OWNER TO postgres;
COMMENT ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) IS
  'Atomically create a sales order and all of its lines. SECURITY INVOKER, so RLS applies. Pricing is resolved by the caller (src/lib/pricing) and passed in.';

REVOKE ALL ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) TO service_role;


-- ==========================================================================
-- 20260819100004_drop_product_catalog.sql
-- ==========================================================================

-- Drop the product catalog hierarchy
--
-- The app carried a full product catalog: domains, categories, manufacturers,
-- product lines, series, models, and per-model configuration schemas with
-- option value sets and business rules.
--
-- For a contract furniture dealer that is the wrong thing to own. CET, Giza,
-- 2020, and ProjectMatrix already resolve the part number, validate the option
-- combination, and apply list price before a specification ever reaches this
-- app. Reproducing that means licensing manufacturer catalog data and tracking
-- quarterly price book updates across dozens of manufacturers — a permanent
-- cost with nothing to show for it, and not something a dealer can maintain by
-- hand.
--
-- What remains is `products`: a flat, org-scoped list a dealer curates for the
-- things no spec tool provides — labor, freight, delivery, install, and
-- ancillary items. It already stored manufacturer, series, and model as plain
-- text and never referenced this hierarchy, so it is untouched.
--
-- Safe to drop outright: there are no customers, so there is no catalog data to
-- preserve. Dropped in dependency order, with CASCADE as a backstop for the
-- foreign keys and policies that hang off these tables.

-- Reporting views over the hierarchy. CASCADE below would take them anyway;
-- dropping them explicitly keeps the intent readable.
DROP VIEW IF EXISTS public.v_models_by_manufacturer;
DROP VIEW IF EXISTS public.v_manufacturers_by_domain;

DROP TABLE IF EXISTS public.config_option_group_metadata CASCADE;
DROP TABLE IF EXISTS public.config_value_sets CASCADE;
DROP TABLE IF EXISTS public.product_models CASCADE;
DROP TABLE IF EXISTS public.product_series CASCADE;
DROP TABLE IF EXISTS public.product_line CASCADE;
DROP TABLE IF EXISTS public.manufacturer_product_domains CASCADE;
DROP TABLE IF EXISTS public.product_manufacturers CASCADE;
DROP TABLE IF EXISTS public.product_category CASCADE;
DROP TABLE IF EXISTS public.product_domain CASCADE;

-- ============================================================================
-- Functions
-- ============================================================================
-- DROP TABLE ... CASCADE removes the triggers attached to these tables but not
-- the functions themselves, so anything specific to the catalog is dropped by
-- hand. Note that the updated_at triggers all called the SHARED
-- handle_updated_at(), which many surviving tables still use -- it stays.

-- Validated the configuration schema JSONB on product_models. The CHECK
-- constraint that called it went with the table.
DROP FUNCTION IF EXISTS public.is_valid_config_schema(jsonb);

-- Resolved a model's merged configuration (schema + option values + rules) for
-- the cascading product selector, which has been replaced by a flat picker over
-- `products`.
DROP FUNCTION IF EXISTS public.get_model_configuration(uuid);

-- Read option value sets for the configuration UI. Both were only ever called
-- through that UI, which is gone.
DROP FUNCTION IF EXISTS public.get_value_set(character varying);
DROP FUNCTION IF EXISTS public.get_value_sets_by_slugs(character varying[]);

COMMENT ON TABLE public.products IS
  'The dealer''s own product list — labor, freight, install, and ancillary items. Manufacturer, series, and model are plain text; there is deliberately no catalog hierarchy behind them, because specification tools resolve furniture part numbers and list price upstream.';


-- ==========================================================================
-- 20260819100005_vendor_purchase_orders.sql
-- ==========================================================================

-- Manufacturer orders
--
-- The fan-out. One customer order splits into N manufacturer orders, because
-- that is how the money and the paperwork actually move: a 1,200-line job might
-- be six orders to six factories, each acknowledged, shipped, and invoiced on
-- its own schedule.
--
--   sales_order -> order_lines
--                     |
--                     +--> vendor_po (per manufacturer) -> po_lines -> order_line
--
-- Decisions baked in:
--
--   * This application does NOT compose or transmit purchase orders. Dealers
--     place them in each manufacturer's own portal, the same way specification
--     lives in Giza or CET rather than here. What a row records is an order
--     placed elsewhere: who it went to, the number their portal assigned, and
--     what came back on the acknowledgment.
--
--   * The manufacturer is TEXT, carried from the specification. There is no
--     vendor account to look up, because nothing here needs an address to send
--     to.
--
--   * po_lines reference order_lines rather than duplicating them. The order
--     line is the thing that was sold; a po_line is a claim on some of its
--     quantity. Partial ordering is normal -- a line can be split across two
--     orders when a customer releases a job in phases.
--
--   * Quantities ordered are NOT stored on order_lines. Recording an order
--     writes an 'ordered' event and order_line_fulfillment sums it, same as
--     every other fulfillment quantity.
--
--   * Every line carries BOTH the price it was quoted at and the price the
--     manufacturer acknowledged. The gap between them is where dealer margin
--     quietly disappears, and surfacing it is the point of the whole system.
--     Acknowledged columns stay NULL until an acknowledgment arrives, which is
--     what distinguishes "not yet acknowledged" from "acknowledged at the same
--     price".

-- ============================================================================
-- vendor_pos
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendor_pos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  -- Who the order went to, as the specification names them. Text: there is no
  -- vendor account, because nothing here composes a document to address.
  manufacturer_name text NOT NULL,

  -- The number the manufacturer's portal assigned. Not generated here.
  po_number text,

  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN (
      'Draft',        -- recorded here, not yet placed with the manufacturer
      'Placed',       -- placed in the portal
      'Acknowledged', -- manufacturer confirmed, possibly with changes
      'Partially Received',
      'Received',
      'Cancelled',
      'Closed'
    )),

  -- Terms this order was placed under. Snapshotted, because standing terms
  -- change and what this order ran under must not.
  payment_terms text,
  freight_terms text,

  -- When it was placed with the manufacturer. Null means recorded but not yet
  -- placed.
  placed_at timestamptz,

  -- The vendor's own reference for this order, from the acknowledgment.
  vendor_ack_number text,
  acknowledged_at timestamptz,

  requested_ship_date date,
  -- The date the vendor committed to, which is frequently not the one asked for.
  acknowledged_ship_date date,

  ship_to_name text,
  ship_to_address_line1 text,
  ship_to_address_line2 text,
  ship_to_city text,
  ship_to_state text,
  ship_to_postal_code text,
  ship_to_country text DEFAULT 'US',

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_pos_order
  ON public.vendor_pos (sales_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_pos_manufacturer
  ON public.vendor_pos (organization_id, manufacturer_name);
CREATE INDEX IF NOT EXISTS idx_vendor_pos_org_status
  ON public.vendor_pos (organization_id, status);
-- Order numbers arrive from the portal, so uniqueness applies only once set.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_pos_number_unique
  ON public.vendor_pos (organization_id, po_number)
  WHERE po_number IS NOT NULL;

ALTER TABLE public.vendor_pos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view vendor pos" ON public.vendor_pos;
CREATE POLICY "Members can view vendor pos"
  ON public.vendor_pos FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert vendor pos" ON public.vendor_pos;
CREATE POLICY "Members can insert vendor pos"
  ON public.vendor_pos FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update vendor pos" ON public.vendor_pos;
CREATE POLICY "Members can update vendor pos"
  ON public.vendor_pos FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- A sent PO is a commitment to a manufacturer. Deleting one is an admin act.
DROP POLICY IF EXISTS "Admin can delete vendor pos" ON public.vendor_pos;
CREATE POLICY "Admin can delete vendor pos"
  ON public.vendor_pos FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_vendor_pos_updated_at ON public.vendor_pos;
CREATE TRIGGER set_vendor_pos_updated_at
  BEFORE UPDATE ON public.vendor_pos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- po_lines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.po_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_po_id uuid NOT NULL REFERENCES public.vendor_pos(id) ON DELETE CASCADE,
  -- RESTRICT, not CASCADE: an order line that has been ordered from a
  -- manufacturer must not be deletable out from under that order.
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE RESTRICT,

  line_number integer NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),

  -- Ordered at ---------------------------------------------------------
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  list_price numeric,
  dealer_discount_percent numeric,

  -- Acknowledged at ----------------------------------------------------
  -- NULL until an acknowledgment lands. NULL means "not yet acknowledged",
  -- which is a different state from "acknowledged at the price we ordered".
  acked_quantity numeric CHECK (acked_quantity IS NULL OR acked_quantity >= 0),
  acked_unit_cost numeric CHECK (acked_unit_cost IS NULL OR acked_unit_cost >= 0),
  acked_ship_date date,
  acknowledged_at timestamptz,

  -- Extended cost variance, positive when the vendor charges more than ordered.
  -- Generated so it can never drift from its inputs, and so the variance queue
  -- can filter and sum on it directly.
  cost_variance numeric GENERATED ALWAYS AS (
    CASE
      WHEN acked_unit_cost IS NULL THEN NULL
      ELSE (COALESCE(acked_quantity, quantity) * acked_unit_cost) - (quantity * unit_cost)
    END
  ) STORED,

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po
  ON public.po_lines (vendor_po_id, line_number);
CREATE INDEX IF NOT EXISTS idx_po_lines_order_line
  ON public.po_lines (order_line_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_po_lines_number_unique
  ON public.po_lines (vendor_po_id, line_number);
-- The variance queue: acknowledged lines whose price or date moved.
CREATE INDEX IF NOT EXISTS idx_po_lines_variance
  ON public.po_lines (organization_id, acknowledged_at)
  WHERE cost_variance IS NOT NULL AND cost_variance <> 0;

ALTER TABLE public.po_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view po lines" ON public.po_lines;
CREATE POLICY "Members can view po lines"
  ON public.po_lines FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert po lines" ON public.po_lines;
CREATE POLICY "Members can insert po lines"
  ON public.po_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update po lines" ON public.po_lines;
CREATE POLICY "Members can update po lines"
  ON public.po_lines FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can delete po lines" ON public.po_lines;
CREATE POLICY "Members can delete po lines"
  ON public.po_lines FOR DELETE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP TRIGGER IF EXISTS set_po_lines_updated_at ON public.po_lines;
CREATE TRIGGER set_po_lines_updated_at
  BEFORE UPDATE ON public.po_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- create_vendor_po_with_lines
-- ============================================================================
-- Issuing a PO writes the header, its lines, and one 'ordered' fulfillment
-- event per line. Those must succeed or fail together: a PO whose lines exist
-- but whose events do not would show its quantities as still needing to be
-- ordered, and a second PO would be raised for the same product.
--
-- SECURITY INVOKER, so RLS applies. p_lines carries order_line_id and quantity;
-- pricing is read from the order line here rather than trusted from the client,
-- because what the dealer is committing to buy at is not the caller's to assert.

CREATE OR REPLACE FUNCTION public.create_vendor_po_with_lines(
  p_po jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_po_id uuid;
  v_org_id uuid := (p_po->>'organization_id')::uuid;
  v_manufacturer text := NULLIF(p_po->>'manufacturer_name', '');
  v_line_count integer;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF v_manufacturer IS NULL THEN
    RAISE EXCEPTION 'manufacturer_name is required';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'An order needs at least one line';
  END IF;

  INSERT INTO public.vendor_pos (
    organization_id, sales_order_id, manufacturer_name, po_number, status,
    payment_terms, freight_terms, requested_ship_date,
    ship_to_name, ship_to_address_line1, ship_to_address_line2,
    ship_to_city, ship_to_state, ship_to_postal_code, ship_to_country,
    notes, created_by
  )
  VALUES (
    v_org_id,
    (p_po->>'sales_order_id')::uuid,
    v_manufacturer,
    NULLIF(p_po->>'po_number', ''),
    COALESCE(NULLIF(p_po->>'status', ''), 'Draft'),
    NULLIF(p_po->>'payment_terms', ''),
    NULLIF(p_po->>'freight_terms', ''),
    NULLIF(p_po->>'requested_ship_date', '')::date,
    NULLIF(p_po->>'ship_to_name', ''),
    NULLIF(p_po->>'ship_to_address_line1', ''),
    NULLIF(p_po->>'ship_to_address_line2', ''),
    NULLIF(p_po->>'ship_to_city', ''),
    NULLIF(p_po->>'ship_to_state', ''),
    NULLIF(p_po->>'ship_to_postal_code', ''),
    COALESCE(NULLIF(p_po->>'ship_to_country', ''), 'US'),
    NULLIF(p_po->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_po_id;

  -- Pricing comes from the order line, not from the caller.
  INSERT INTO public.po_lines (
    organization_id, vendor_po_id, order_line_id, line_number, quantity,
    unit_cost, list_price, dealer_discount_percent
  )
  SELECT
    v_org_id,
    v_po_id,
    ol.id,
    (t.ordinality)::integer,
    (t.l->>'quantity')::numeric,
    ol.unit_cost,
    ol.list_price,
    ol.dealer_discount_percent
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ordinality)
  JOIN public.order_lines ol ON ol.id = (t.l->>'order_line_id')::uuid;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'One or more order lines could not be found';
  END IF;

  -- Record what was ordered. order_line_fulfillment sums these; nothing is
  -- stored on order_lines itself.
  INSERT INTO public.order_line_events (
    organization_id, order_line_id, event_type, quantity,
    reference_type, reference_id, created_by
  )
  SELECT
    v_org_id, pl.order_line_id, 'ordered', pl.quantity,
    'vendor_po', v_po_id, auth.uid()
  FROM public.po_lines pl
  WHERE pl.vendor_po_id = v_po_id;

  -- A line is only 'Ordered' once its FULL quantity is on an order.
  -- Releasing 12 of 20 leaves it Open, because 8 still have to be bought --
  -- flagging it Ordered would hide them from the next fan-out.
  UPDATE public.order_lines ol
     SET status = 'Ordered'
   WHERE ol.status = 'Open'
     AND ol.id IN (SELECT order_line_id FROM public.po_lines WHERE vendor_po_id = v_po_id)
     AND (
       SELECT COALESCE(SUM(e.quantity), 0)
         FROM public.order_line_events e
        WHERE e.order_line_id = ol.id AND e.event_type = 'ordered'
     ) >= ol.quantity;

  RETURN v_po_id;
END;
$$;

ALTER FUNCTION public.create_vendor_po_with_lines(jsonb, jsonb) OWNER TO postgres;
COMMENT ON FUNCTION public.create_vendor_po_with_lines(jsonb, jsonb) IS
  'Atomically record a manufacturer order, its lines, and the ordered fulfillment events. SECURITY INVOKER, so RLS applies. Pricing is read from order_lines, not trusted from the caller.';

REVOKE ALL ON FUNCTION public.create_vendor_po_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vendor_po_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_vendor_po_with_lines(jsonb, jsonb) TO service_role;

-- ============================================================================
-- po_line_variance  (the variance queue)
-- ============================================================================
-- What a manufacturer came back with, against the cost the QUOTE was built on.
-- This is the screen a PM opens in the morning: acknowledgments where the price
-- or the ship date moved. security_invoker so the caller's RLS applies.
--
-- The comparison that matters is deliberately against the quoted cost, not
-- against whatever was recorded as placed. Orders go out through the
-- manufacturer's portal, so "did the factory honour our paperwork" is not a
-- question this application is entitled to ask -- but "did the cost I quoted
-- survive contact with the real order" is, and it is the one that costs a
-- dealer money. Both are exposed:
--
--   cost_variance         acknowledged vs what was recorded as placed. A data
--                         entry check.
--   quoted_cost_variance  acknowledged vs the cost the quote was built on.
--                         The margin number, and what the queue sorts by.

CREATE OR REPLACE VIEW public.po_line_variance
WITH (security_invoker = true) AS
SELECT
  pl.id                AS po_line_id,
  pl.organization_id,
  pl.vendor_po_id,
  vp.po_number,
  vp.manufacturer_name,
  vp.sales_order_id,
  pl.order_line_id,
  ol.description,
  ol.model_number,
  pl.quantity          AS ordered_quantity,
  pl.unit_cost         AS ordered_unit_cost,
  -- What the customer's price was built on.
  ol.unit_cost         AS quoted_unit_cost,
  pl.acked_quantity,
  pl.acked_unit_cost,
  pl.cost_variance,
  -- Null until the manufacturer answers, which is what distinguishes "no reply
  -- yet" from "confirmed at the quoted cost".
  CASE
    WHEN pl.acked_unit_cost IS NULL THEN NULL
    ELSE (COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
         - (pl.quantity * ol.unit_cost)
  END                  AS quoted_cost_variance,
  vp.requested_ship_date,
  pl.acked_ship_date,
  CASE
    WHEN pl.acked_ship_date IS NULL OR vp.requested_ship_date IS NULL THEN NULL
    ELSE pl.acked_ship_date - vp.requested_ship_date
  END                  AS ship_date_slip_days,
  pl.acknowledged_at,
  -- What kind of attention this line needs.
  CASE
    WHEN pl.acknowledged_at IS NULL THEN 'awaiting_ack'
    WHEN COALESCE(
           CASE WHEN pl.acked_unit_cost IS NULL THEN NULL
                ELSE (COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
                     - (pl.quantity * ol.unit_cost) END, 0) <> 0
     AND pl.acked_ship_date IS DISTINCT FROM vp.requested_ship_date THEN 'price_and_date'
    WHEN COALESCE(
           CASE WHEN pl.acked_unit_cost IS NULL THEN NULL
                ELSE (COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
                     - (pl.quantity * ol.unit_cost) END, 0) <> 0 THEN 'price'
    WHEN pl.acked_ship_date IS DISTINCT FROM vp.requested_ship_date THEN 'date'
    ELSE 'match'
  END                  AS variance_status
FROM public.po_lines pl
JOIN public.vendor_pos vp ON vp.id = pl.vendor_po_id
JOIN public.order_lines ol ON ol.id = pl.order_line_id;

COMMENT ON VIEW public.po_line_variance IS
  'Acknowledged order lines against the cost the quote was built on. quoted_cost_variance is the margin number; variance_status is awaiting_ack | price | date | price_and_date | match.';

GRANT SELECT ON public.po_line_variance TO authenticated;
GRANT SELECT ON public.po_line_variance TO service_role;


-- ==========================================================================
-- 20260819100006_order_line_fulfillment_type.sql
-- ==========================================================================

-- How an order line gets delivered
--
-- A dealer sells product and service on the same quote. Chairs are bought from
-- Steelcase; installation is performed by the dealer's own crew; a tariff is
-- re-billed at cost. Only some of those are things you buy.
--
-- Without this, the fan-out grouped lines by manufacturer and reported
-- everything without one as "name a supplier before you can order" -- which meant
-- a job with delivery and installation on it told the dealer their own crew's
-- labor was blocking the order. Nonsense, and it would have trained people to
-- ignore the warning that actually matters: real product naming no supplier.
--
--   purchase      bought from a manufacturer      -> purchase order
--   subcontract   work someone else performs      -> purchase order
--   self_perform  the dealer's own crew or truck  -> work order, never a PO
--   pass_through  a cost re-billed, not procured  -> neither
--
-- Nullable on purpose. NULL means the form never said, which is a real state
-- worth surfacing rather than guessing at: guessing wrong either raises a
-- purchase order for the dealer's own labor or silently drops product that
-- needed buying.

ALTER TABLE public.order_lines
  ADD COLUMN IF NOT EXISTS fulfillment_type text
    CHECK (fulfillment_type IS NULL OR fulfillment_type IN (
      'purchase', 'subcontract', 'self_perform', 'pass_through'
    ));

COMMENT ON COLUMN public.order_lines.fulfillment_type IS
  'How this line is delivered: purchase | subcontract | self_perform | pass_through. NULL means unrouted -- the form did not say, so neither ordering nor scheduling can claim it.';

-- Supports the fan-out (purchasable lines) and the work order queue
-- (self-performed lines) without scanning an order's full line set.
CREATE INDEX IF NOT EXISTS idx_order_lines_fulfillment
  ON public.order_lines (sales_order_id, fulfillment_type, status);

-- ============================================================================
-- Backfill
-- ============================================================================
-- Existing lines predate the column. Route what can be inferred from the
-- manufacturer evidence already on the row, and leave the rest NULL for
-- a human rather than inventing an answer.

UPDATE public.order_lines
   SET fulfillment_type = 'purchase'
 WHERE fulfillment_type IS NULL
   AND manufacturer_name IS NOT NULL;

-- ============================================================================
-- create_sales_order_with_lines: carry fulfillment_type through
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_sales_order_with_lines(
  p_order jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_org_id uuid := (p_order->>'organization_id')::uuid;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'p_lines must be a JSON array';
  END IF;

  INSERT INTO public.sales_orders (
    organization_id, project_id, proposal_id, order_number, customer_po_number,
    company_id, ship_to_name, ship_to_address_line1, ship_to_address_line2,
    ship_to_city, ship_to_state, ship_to_postal_code, ship_to_country,
    contract_vehicle, status, requested_delivery_date, notes, created_by
  )
  VALUES (
    v_org_id,
    (p_order->>'project_id')::uuid,
    NULLIF(p_order->>'proposal_id', '')::uuid,
    NULLIF(p_order->>'order_number', ''),
    NULLIF(p_order->>'customer_po_number', ''),
    NULLIF(p_order->>'company_id', '')::uuid,
    NULLIF(p_order->>'ship_to_name', ''),
    NULLIF(p_order->>'ship_to_address_line1', ''),
    NULLIF(p_order->>'ship_to_address_line2', ''),
    NULLIF(p_order->>'ship_to_city', ''),
    NULLIF(p_order->>'ship_to_state', ''),
    NULLIF(p_order->>'ship_to_postal_code', ''),
    COALESCE(NULLIF(p_order->>'ship_to_country', ''), 'US'),
    NULLIF(p_order->>'contract_vehicle', ''),
    COALESCE(NULLIF(p_order->>'status', ''), 'Draft'),
    NULLIF(p_order->>'requested_delivery_date', '')::date,
    NULLIF(p_order->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_lines (
    organization_id, sales_order_id, line_number, area, spec_phase,
    manufacturer_name, series_name,
    model_number, description, option_string, quantity,
    pricing_mode, fulfillment_type, list_price, dealer_discount_percent, unit_cost,
    sell_rule, markup_type, markup_value, discount_type, discount_value,
    sell_price, is_taxable, source_line_number, source_proposal_line_id, notes
  )
  SELECT
    v_org_id,
    v_order_id,
    COALESCE((l->>'line_number')::integer, (ordinality)::integer),
    NULLIF(l->>'area', ''),
    NULLIF(l->>'spec_phase', ''),
    NULLIF(l->>'manufacturer_name', ''),
    NULLIF(l->>'series_name', ''),
    NULLIF(l->>'model_number', ''),
    COALESCE(NULLIF(l->>'description', ''), 'Unnamed line'),
    NULLIF(l->>'option_string', ''),
    COALESCE((l->>'quantity')::numeric, 1),
    COALESCE(NULLIF(l->>'pricing_mode', ''), 'cost_up'),
    NULLIF(l->>'fulfillment_type', ''),
    NULLIF(l->>'list_price', '')::numeric,
    NULLIF(l->>'dealer_discount_percent', '')::numeric,
    COALESCE((l->>'unit_cost')::numeric, 0),
    NULLIF(l->>'sell_rule', ''),
    COALESCE(NULLIF(l->>'markup_type', ''), 'percent'),
    COALESCE((l->>'markup_value')::numeric, 0),
    NULLIF(l->>'discount_type', ''),
    NULLIF(l->>'discount_value', '')::numeric,
    COALESCE((l->>'sell_price')::numeric, 0),
    COALESCE((l->>'is_taxable')::boolean, false),
    NULLIF(l->>'source_line_number', '')::integer,
    NULLIF(l->>'source_proposal_line_id', ''),
    NULLIF(l->>'notes', '')
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ordinality);

  RETURN v_order_id;
END;
$$;

ALTER FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sales_order_with_lines(jsonb, jsonb) TO service_role;


-- ==========================================================================
-- 20260819100007_work_orders.sql
-- ==========================================================================

-- Work orders: crews, scheduling, and site work
--
-- The other half of a dealer's job. Product gets bought through purchase
-- orders; delivery and installation get scheduled. A furniture job is not done
-- when the truck arrives -- it is done when the crew has set, levelled, and
-- cleaned, and the customer has signed.
--
--   sales_order -> order_lines (self_perform | subcontract)
--                      |
--                      +--> work_order_lines -> work_order -> crew OR subcontractor
--                                                   |
--                                                   +--> order_line_events ('installed')
--
-- Decisions baked in:
--
--   * A work order is performed EITHER by one of the dealer's crews or by a
--     subcontractor, never both, and a scheduled one must name whoever is doing
--     it. Enforced by a CHECK rather than left to the application.
--
--   * A crew cannot be in two places at once. That is a database exclusion
--     constraint over the scheduled time range, not a query the UI remembers to
--     run -- double-booking a crew is the single most expensive scheduling
--     mistake a dealer makes, and it must be impossible rather than discouraged.
--
--   * Site access is a first-class field. Dock hours, elevator reservations, and
--     certificate-of-insurance requirements are what actually sink an install
--     day, and they belong on the work order the crew reads that morning.
--
--   * Completing a work order writes 'installed' events. Quantities are still
--     never stored on order lines.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- crews
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,

  crew_type text NOT NULL DEFAULT 'Install'
    CHECK (crew_type IN ('Install', 'Delivery', 'Service', 'Mixed')),

  -- How many people. Drives how much work a day can absorb.
  size integer NOT NULL DEFAULT 2 CHECK (size > 0),

  -- Burdened cost per crew-hour. This is the cost side of every self-performed
  -- line -- product cost comes from a manufacturer invoice, labor cost comes
  -- from here, and job costing needs both.
  hourly_cost numeric CHECK (hourly_cost IS NULL OR hourly_cost >= 0),

  -- Contact for the lead, so a PM can reach the site.
  lead_name text,
  lead_phone text,

  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crews_org_active
  ON public.crews (organization_id, is_active, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crews_org_name_unique
  ON public.crews (organization_id, lower(name));

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

-- Everyone can see who the crews are; only admins change the roster, because
-- hourly_cost is cost data.
DROP POLICY IF EXISTS "Members can view crews" ON public.crews;
CREATE POLICY "Members can view crews"
  ON public.crews FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Admin can insert crews" ON public.crews;
CREATE POLICY "Admin can insert crews"
  ON public.crews FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can update crews" ON public.crews;
CREATE POLICY "Admin can update crews"
  ON public.crews FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can delete crews" ON public.crews;
CREATE POLICY "Admin can delete crews"
  ON public.crews FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_crews_updated_at ON public.crews;
CREATE TRIGGER set_crews_updated_at
  BEFORE UPDATE ON public.crews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- work_orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Nullable: a warranty visit or a service call has no sales order behind it.
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,

  work_order_number text,

  work_type text NOT NULL DEFAULT 'Installation'
    CHECK (work_type IN (
      'Delivery',
      'Installation',
      'Delivery and Installation',
      'Punch',
      'Service',
      'Pickup'
    )),

  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Scheduled', 'In Progress', 'Complete', 'Cancelled')),

  -- Exactly one of these performs the work.
  crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL,
  -- Text, not a reference. There is no vendor account to maintain: a
  -- subcontractor is a name on the work order the crew lead reads.
  subcontractor_name text,

  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,

  -- Site, snapshotted. A job site is not always the customer's billing address,
  -- and it must not change under a completed work order.
  site_name text,
  site_address_line1 text,
  site_address_line2 text,
  site_city text,
  site_state text,
  site_postal_code text,
  site_contact_name text,
  site_contact_phone text,

  -- What sinks an install day: dock hours, elevator reservation, COI on file,
  -- union requirements, after-hours access.
  access_notes text,

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT work_orders_end_after_start
    CHECK (scheduled_end IS NULL OR scheduled_start IS NULL OR scheduled_end > scheduled_start),

  -- Own crew or a subcontractor, never both.
  CONSTRAINT work_orders_one_performer
    CHECK (crew_id IS NULL OR subcontractor_name IS NULL),

  -- A scheduled work order has a time and someone to do it. Draft is where an
  -- incomplete one lives.
  CONSTRAINT work_orders_scheduled_is_complete
    CHECK (
      status <> 'Scheduled'
      OR (scheduled_start IS NOT NULL
          AND scheduled_end IS NOT NULL
          AND (crew_id IS NOT NULL OR subcontractor_name IS NOT NULL))
    )
);

CREATE INDEX IF NOT EXISTS idx_work_orders_project
  ON public.work_orders (project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_order
  ON public.work_orders (sales_order_id) WHERE sales_order_id IS NOT NULL;
-- The scheduling board: everything in a date window for an organization.
CREATE INDEX IF NOT EXISTS idx_work_orders_schedule
  ON public.work_orders (organization_id, scheduled_start)
  WHERE scheduled_start IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_crew
  ON public.work_orders (crew_id, scheduled_start) WHERE crew_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_orders_number_unique
  ON public.work_orders (organization_id, work_order_number)
  WHERE work_order_number IS NOT NULL;

-- A crew cannot be in two places at once.
--
-- Enforced here rather than in the application because double-booking is the
-- most expensive scheduling mistake a dealer makes -- a crew shows up to a site
-- that is not ready while another job goes uninstalled -- and a check the UI has
-- to remember to run is a check that eventually does not run. Cancelled work
-- orders are excluded so a cancelled booking releases its slot.
ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS work_orders_no_crew_double_booking;
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_no_crew_double_booking
  EXCLUDE USING gist (
    crew_id WITH =,
    tstzrange(scheduled_start, scheduled_end) WITH &&
  )
  WHERE (
    crew_id IS NOT NULL
    AND scheduled_start IS NOT NULL
    AND scheduled_end IS NOT NULL
    AND status <> 'Cancelled'
  );

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Field staff need to read and update their own work orders, so this is
-- membership-wide. Cost lives on crews and order lines, not here.
DROP POLICY IF EXISTS "Members can view work orders" ON public.work_orders;
CREATE POLICY "Members can view work orders"
  ON public.work_orders FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert work orders" ON public.work_orders;
CREATE POLICY "Members can insert work orders"
  ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update work orders" ON public.work_orders;
CREATE POLICY "Members can update work orders"
  ON public.work_orders FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Admin can delete work orders" ON public.work_orders;
CREATE POLICY "Admin can delete work orders"
  ON public.work_orders FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_work_orders_updated_at ON public.work_orders;
CREATE TRIGGER set_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- work_order_lines
-- ============================================================================
-- Which order lines this visit covers, and how many. A 400-chair install runs
-- over three days, so a line is split across work orders the same way it is
-- split across purchase orders.

CREATE TABLE IF NOT EXISTS public.work_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  -- RESTRICT: a line scheduled for install must not vanish from under the crew.
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE RESTRICT,

  quantity numeric NOT NULL CHECK (quantity > 0),
  -- Set when the crew reports back, which may be less than planned.
  completed_quantity numeric CHECK (completed_quantity IS NULL OR completed_quantity >= 0),

  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_order_lines_unique
  ON public.work_order_lines (work_order_id, order_line_id);
CREATE INDEX IF NOT EXISTS idx_work_order_lines_order_line
  ON public.work_order_lines (order_line_id);

ALTER TABLE public.work_order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view work order lines" ON public.work_order_lines;
CREATE POLICY "Members can view work order lines"
  ON public.work_order_lines FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert work order lines" ON public.work_order_lines;
CREATE POLICY "Members can insert work order lines"
  ON public.work_order_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update work order lines" ON public.work_order_lines;
CREATE POLICY "Members can update work order lines"
  ON public.work_order_lines FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can delete work order lines" ON public.work_order_lines;
CREATE POLICY "Members can delete work order lines"
  ON public.work_order_lines FOR DELETE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP TRIGGER IF EXISTS set_work_order_lines_updated_at ON public.work_order_lines;
CREATE TRIGGER set_work_order_lines_updated_at
  BEFORE UPDATE ON public.work_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- create_work_order_with_lines
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_work_order_with_lines(
  p_work_order jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_wo_id uuid;
  v_org_id uuid := (p_work_order->>'organization_id')::uuid;
  v_line_count integer;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'p_lines must be a JSON array';
  END IF;

  INSERT INTO public.work_orders (
    organization_id, project_id, sales_order_id, work_order_number, work_type,
    status, crew_id, subcontractor_name, scheduled_start, scheduled_end,
    site_name, site_address_line1, site_address_line2, site_city, site_state,
    site_postal_code, site_contact_name, site_contact_phone, access_notes,
    notes, created_by
  )
  VALUES (
    v_org_id,
    (p_work_order->>'project_id')::uuid,
    NULLIF(p_work_order->>'sales_order_id', '')::uuid,
    NULLIF(p_work_order->>'work_order_number', ''),
    COALESCE(NULLIF(p_work_order->>'work_type', ''), 'Installation'),
    COALESCE(NULLIF(p_work_order->>'status', ''), 'Draft'),
    NULLIF(p_work_order->>'crew_id', '')::uuid,
    NULLIF(p_work_order->>'subcontractor_name', ''),
    NULLIF(p_work_order->>'scheduled_start', '')::timestamptz,
    NULLIF(p_work_order->>'scheduled_end', '')::timestamptz,
    NULLIF(p_work_order->>'site_name', ''),
    NULLIF(p_work_order->>'site_address_line1', ''),
    NULLIF(p_work_order->>'site_address_line2', ''),
    NULLIF(p_work_order->>'site_city', ''),
    NULLIF(p_work_order->>'site_state', ''),
    NULLIF(p_work_order->>'site_postal_code', ''),
    NULLIF(p_work_order->>'site_contact_name', ''),
    NULLIF(p_work_order->>'site_contact_phone', ''),
    NULLIF(p_work_order->>'access_notes', ''),
    NULLIF(p_work_order->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_wo_id;

  INSERT INTO public.work_order_lines (
    organization_id, work_order_id, order_line_id, quantity, notes
  )
  SELECT
    v_org_id,
    v_wo_id,
    ol.id,
    (t.l->>'quantity')::numeric,
    NULLIF(t.l->>'notes', '')
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ordinality)
  JOIN public.order_lines ol ON ol.id = (t.l->>'order_line_id')::uuid;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'One or more order lines could not be found';
  END IF;

  RETURN v_wo_id;
END;
$$;

ALTER FUNCTION public.create_work_order_with_lines(jsonb, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_work_order_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_work_order_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_work_order_with_lines(jsonb, jsonb) TO service_role;

-- ============================================================================
-- complete_work_order
-- ============================================================================
-- Closing out a work order records what the crew actually installed. Status,
-- completed quantities, and the fulfillment events must land together: a work
-- order marked Complete whose events did not write would leave the product
-- looking uninstalled and get it scheduled again.
--
-- p_completions is optional. Omit it and every line completes at its planned
-- quantity, which is the common case.

CREATE OR REPLACE FUNCTION public.complete_work_order(
  p_work_order_id uuid,
  p_completions jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.work_orders WHERE id = p_work_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Work order not found';
  END IF;

  -- Apply per-line completions where given; otherwise complete as planned.
  IF p_completions IS NOT NULL AND jsonb_typeof(p_completions) = 'array' THEN
    UPDATE public.work_order_lines wol
       SET completed_quantity = (c->>'completed_quantity')::numeric
      FROM jsonb_array_elements(p_completions) AS c
     WHERE wol.work_order_id = p_work_order_id
       AND wol.id = (c->>'work_order_line_id')::uuid;
  END IF;

  UPDATE public.work_order_lines
     SET completed_quantity = quantity
   WHERE work_order_id = p_work_order_id
     AND completed_quantity IS NULL;

  -- Record what was installed. Zero-quantity lines are skipped because
  -- order_line_events rejects a zero movement by design.
  INSERT INTO public.order_line_events (
    organization_id, order_line_id, event_type, quantity,
    reference_type, reference_id, created_by
  )
  SELECT
    v_org_id, wol.order_line_id, 'installed', wol.completed_quantity,
    'work_order', p_work_order_id, auth.uid()
  FROM public.work_order_lines wol
  WHERE wol.work_order_id = p_work_order_id
    AND COALESCE(wol.completed_quantity, 0) > 0;

  UPDATE public.work_orders
     SET status = 'Complete',
         actual_end = COALESCE(actual_end, now())
   WHERE id = p_work_order_id;
END;
$$;

ALTER FUNCTION public.complete_work_order(uuid, jsonb) OWNER TO postgres;
COMMENT ON FUNCTION public.complete_work_order(uuid, jsonb) IS
  'Close a work order: apply completed quantities, write installed fulfillment events, and mark it Complete. SECURITY INVOKER, so RLS applies.';

REVOKE ALL ON FUNCTION public.complete_work_order(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_work_order(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_work_order(uuid, jsonb) TO service_role;

-- ============================================================================
-- work_order_schedule  (the scheduling board)
-- ============================================================================

CREATE OR REPLACE VIEW public.work_order_schedule
WITH (security_invoker = true) AS
SELECT
  wo.id AS work_order_id,
  wo.organization_id,
  wo.project_id,
  wo.sales_order_id,
  wo.work_order_number,
  wo.work_type,
  wo.status,
  wo.scheduled_start,
  wo.scheduled_end,
  EXTRACT(epoch FROM (wo.scheduled_end - wo.scheduled_start)) / 3600 AS scheduled_hours,
  wo.crew_id,
  c.name AS crew_name,
  c.size AS crew_size,
  wo.subcontractor_name,
  wo.site_name,
  wo.site_city,
  wo.site_state,
  wo.access_notes,
  (SELECT count(*) FROM public.work_order_lines wol WHERE wol.work_order_id = wo.id) AS line_count,
  -- Crew-hours, the input to labor cost on this visit.
  CASE
    WHEN wo.scheduled_start IS NULL OR wo.scheduled_end IS NULL OR c.id IS NULL THEN NULL
    ELSE (EXTRACT(epoch FROM (wo.scheduled_end - wo.scheduled_start)) / 3600) * c.size
  END AS crew_hours
FROM public.work_orders wo
LEFT JOIN public.crews c ON c.id = wo.crew_id
;

COMMENT ON VIEW public.work_order_schedule IS
  'Work orders with their performer and duration resolved, for the scheduling board.';

GRANT SELECT ON public.work_order_schedule TO authenticated;
GRANT SELECT ON public.work_order_schedule TO service_role;


-- ==========================================================================
-- 20260820100000_observed_discounts.sql
-- ==========================================================================

-- Observed discount rates
--
-- Inverts how discount data gets into the system. Asking a dealer to key in a
-- standing discount schedule per manufacturer per series was a setup wall in
-- front of the door, and the table it produced was wrong within a quarter:
-- project pricing is negotiated per job with the rep, promos move, and program
-- tiers change. A stale schedule is worse than none, because it silently
-- disagrees with the quote the customer signed.
--
-- The specification tool already resolved the real number. Every imported line
-- carries list_price and unit_cost, so the discount is sitting in data that is
-- already here -- it just has to be read rather than asked for.
--
-- What that buys beyond zero data entry: the quote-stage version of the
-- acknowledgment check. "Every Steelcase Series 1 line for two years landed
-- between 54% and 56% off, this one came in at 48%" catches a bad export or a
-- rep quoting off the wrong schedule BEFORE it becomes a signed quote.
--
-- Interpretation lives in src/lib/pricing/observed.ts. This view only
-- aggregates.

CREATE OR REPLACE VIEW public.observed_vendor_discounts
WITH (security_invoker = true) AS
SELECT
  ol.organization_id,
  ol.manufacturer_name,
  ol.series_name,
  so.contract_vehicle,

  count(*)::integer AS line_count,

  -- The blended rate actually achieved, weighted by extended list value. An
  -- unweighted average would let one $40 accessory count as much as a $12,000
  -- casegoods run.
  round(
    100.0 * (
      1 - sum(ol.unit_cost * ol.quantity)
          / NULLIF(sum(ol.list_price * ol.quantity), 0)
    ),
    2
  ) AS discount_percent,

  -- The envelope of what has been seen. A line is suspicious when it falls
  -- outside everything ever observed, not merely when it differs from average:
  -- real pricing varies across a series, and flagging every line that differs
  -- from the mean would flag most of them.
  round(min(100.0 * (1 - ol.unit_cost / ol.list_price)), 2) AS min_discount_percent,
  round(max(100.0 * (1 - ol.unit_cost / ol.list_price)), 2) AS max_discount_percent,

  max(so.created_at) AS last_seen_at

FROM public.order_lines ol
JOIN public.sales_orders so ON so.id = ol.sales_order_id
-- A list price is what makes a discount inferable at all. This also excludes
-- labor and pass-through lines for free: they never carry one.
WHERE ol.list_price IS NOT NULL
  AND ol.list_price > 0
  AND ol.status <> 'Cancelled'
  AND ol.manufacturer_name IS NOT NULL
GROUP BY
  ol.organization_id,
  ol.manufacturer_name,
  ol.series_name,
  so.contract_vehicle;

COMMENT ON VIEW public.observed_vendor_discounts IS
  'Dealer discount rates inferred from list_price and unit_cost on order lines already imported. Requires no data entry and cannot go stale.';

GRANT SELECT ON public.observed_vendor_discounts TO authenticated;
GRANT SELECT ON public.observed_vendor_discounts TO service_role;

CREATE INDEX IF NOT EXISTS idx_order_lines_observed_rates
  ON public.order_lines (organization_id, manufacturer_name, series_name)
  WHERE list_price IS NOT NULL AND list_price > 0;

-- ============================================================================
-- Cleanup for databases that already built the vendor address book
-- ============================================================================
-- The migrations that created public.vendors and public.vendor_discounts were
-- rewritten in place rather than reversed, because in every environment that
-- matters those tables were never created at all -- reversing something that
-- never existed is archaeology, and a hard DROP would fail outright.
--
-- Any database that DID get them needs them gone, so this is guarded end to end
-- and is a no-op where they were never present. Such a database also ran the
-- OLD text of the earlier migrations, so it is missing the replacement columns
-- those files now create; they are added here before anything reads them.

DO $$
BEGIN
  IF to_regclass('public.vendors') IS NULL THEN
    RETURN;
  END IF;

  -- Present only in the rewritten migration text, which this database ran the
  -- old version of.
  ALTER TABLE public.vendor_pos ADD COLUMN IF NOT EXISTS manufacturer_name text;
  ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS subcontractor_name text;

  -- Dependents of the columns about to be dropped. Recreated unconditionally
  -- below, so dropping them here is safe.
  DROP VIEW IF EXISTS public.work_order_schedule;
  DROP VIEW IF EXISTS public.po_line_variance;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_lines'
      AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE public.order_lines DROP COLUMN vendor_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_orders'
      AND column_name = 'subcontractor_vendor_id'
  ) THEN
    UPDATE public.work_orders wo
       SET subcontractor_name = v.name
      FROM public.vendors v
     WHERE v.id = wo.subcontractor_vendor_id
       AND wo.subcontractor_name IS NULL;

    ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_one_performer;
    ALTER TABLE public.work_orders
      DROP CONSTRAINT IF EXISTS work_orders_scheduled_is_complete;
    ALTER TABLE public.work_orders DROP COLUMN subcontractor_vendor_id;

    ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_one_performer
      CHECK (crew_id IS NULL OR subcontractor_name IS NULL);
    ALTER TABLE public.work_orders ADD CONSTRAINT work_orders_scheduled_is_complete
      CHECK (
        status <> 'Scheduled'
        OR (scheduled_start IS NOT NULL
            AND scheduled_end IS NOT NULL
            AND (crew_id IS NOT NULL OR subcontractor_name IS NOT NULL))
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vendor_pos'
      AND column_name = 'vendor_id'
  ) THEN
    UPDATE public.vendor_pos po
       SET manufacturer_name = v.name
      FROM public.vendors v
     WHERE v.id = po.vendor_id
       AND (po.manufacturer_name IS NULL OR po.manufacturer_name = '');

    -- Anything still unnamed would have been orphaned by the FK anyway.
    UPDATE public.vendor_pos
       SET manufacturer_name = 'Unknown'
     WHERE manufacturer_name IS NULL OR manufacturer_name = '';

    ALTER TABLE public.vendor_pos ALTER COLUMN manufacturer_name SET NOT NULL;
    ALTER TABLE public.vendor_pos DROP COLUMN vendor_id;

    -- 'Sent' is no longer a state this application can produce.
    ALTER TABLE public.vendor_pos DROP CONSTRAINT IF EXISTS vendor_pos_status_check;
    UPDATE public.vendor_pos SET status = 'Placed' WHERE status = 'Sent';
    ALTER TABLE public.vendor_pos ADD CONSTRAINT vendor_pos_status_check
      CHECK (status IN ('Draft', 'Placed', 'Acknowledged', 'Partially Received',
                        'Received', 'Cancelled', 'Closed'));

    ALTER TABLE public.vendor_pos
      DROP COLUMN IF EXISTS sent_to_email,
      DROP COLUMN IF EXISTS sent_by;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vendor_pos'
        AND column_name = 'sent_at'
    ) THEN
      ALTER TABLE public.vendor_pos RENAME COLUMN sent_at TO placed_at;
    END IF;
  END IF;

  DELETE FROM public.attachments WHERE entity_type = 'vendor';
  ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_entity_type_check;
  ALTER TABLE public.attachments ADD CONSTRAINT attachments_entity_type_check
    CHECK (entity_type IN (
      'project', 'proposal', 'company', 'sales_order', 'order_line',
      'vendor_po', 'acknowledgment', 'receipt', 'work_order', 'punch_item'
    ));

  DROP TABLE IF EXISTS public.vendor_discounts;
  DROP TABLE IF EXISTS public.vendors;

  RAISE NOTICE 'Removed the vendor address book and its dependents.';
END
$$;

-- ============================================================================
-- The two dependent views, restated
-- ============================================================================
-- Unconditional, and dropped first rather than replaced, because their column
-- lists differ from the pre-rewrite versions and CREATE OR REPLACE cannot
-- change a view's columns. On a fresh database this simply rebuilds what the
-- earlier migrations just created; on a legacy one it is what puts them back.

DROP VIEW IF EXISTS public.po_line_variance;

CREATE VIEW public.po_line_variance
WITH (security_invoker = true) AS
SELECT
  pl.id                AS po_line_id,
  pl.organization_id,
  pl.vendor_po_id,
  vp.po_number,
  vp.manufacturer_name,
  vp.sales_order_id,
  pl.order_line_id,
  ol.description,
  ol.model_number,
  pl.quantity          AS ordered_quantity,
  pl.unit_cost         AS ordered_unit_cost,
  ol.unit_cost         AS quoted_unit_cost,
  pl.acked_quantity,
  pl.acked_unit_cost,
  pl.cost_variance,
  CASE
    WHEN pl.acked_unit_cost IS NULL THEN NULL
    ELSE (COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
         - (pl.quantity * ol.unit_cost)
  END                  AS quoted_cost_variance,
  vp.requested_ship_date,
  pl.acked_ship_date,
  CASE
    WHEN pl.acked_ship_date IS NULL OR vp.requested_ship_date IS NULL THEN NULL
    ELSE pl.acked_ship_date - vp.requested_ship_date
  END                  AS ship_date_slip_days,
  pl.acknowledged_at,
  CASE
    WHEN pl.acknowledged_at IS NULL THEN 'awaiting_ack'
    WHEN COALESCE(
           CASE WHEN pl.acked_unit_cost IS NULL THEN NULL
                ELSE (COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
                     - (pl.quantity * ol.unit_cost) END, 0) <> 0
     AND pl.acked_ship_date IS DISTINCT FROM vp.requested_ship_date THEN 'price_and_date'
    WHEN COALESCE(
           CASE WHEN pl.acked_unit_cost IS NULL THEN NULL
                ELSE (COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
                     - (pl.quantity * ol.unit_cost) END, 0) <> 0 THEN 'price'
    WHEN pl.acked_ship_date IS DISTINCT FROM vp.requested_ship_date THEN 'date'
    ELSE 'match'
  END                  AS variance_status
FROM public.po_lines pl
JOIN public.vendor_pos vp ON vp.id = pl.vendor_po_id
JOIN public.order_lines ol ON ol.id = pl.order_line_id;

COMMENT ON VIEW public.po_line_variance IS
  'Acknowledged order lines against the cost the quote was built on. quoted_cost_variance is the margin number; variance_status is awaiting_ack | price | date | price_and_date | match.';

GRANT SELECT ON public.po_line_variance TO authenticated;
GRANT SELECT ON public.po_line_variance TO service_role;

DROP VIEW IF EXISTS public.work_order_schedule;

CREATE VIEW public.work_order_schedule
WITH (security_invoker = true) AS
SELECT
  wo.id AS work_order_id,
  wo.organization_id,
  wo.project_id,
  wo.sales_order_id,
  wo.work_order_number,
  wo.work_type,
  wo.status,
  wo.scheduled_start,
  wo.scheduled_end,
  EXTRACT(epoch FROM (wo.scheduled_end - wo.scheduled_start)) / 3600 AS scheduled_hours,
  wo.crew_id,
  c.name AS crew_name,
  c.size AS crew_size,
  wo.subcontractor_name,
  wo.site_name,
  wo.site_city,
  wo.site_state,
  wo.access_notes,
  (SELECT count(*) FROM public.work_order_lines wol WHERE wol.work_order_id = wo.id) AS line_count,
  CASE
    WHEN wo.scheduled_start IS NULL OR wo.scheduled_end IS NULL OR c.id IS NULL THEN NULL
    ELSE (EXTRACT(epoch FROM (wo.scheduled_end - wo.scheduled_start)) / 3600) * c.size
  END AS crew_hours
FROM public.work_orders wo
LEFT JOIN public.crews c ON c.id = wo.crew_id;

GRANT SELECT ON public.work_order_schedule TO authenticated;
GRANT SELECT ON public.work_order_schedule TO service_role;


-- ==========================================================================
-- 20260821100000_observed_rates_from_acks.sql
-- ==========================================================================

-- Observe discount rates from acknowledgments, not from quotes
--
-- The previous version of this view inferred the dealer's discount from
-- order_lines.unit_cost divided by list_price. That was circular. unit_cost is
-- materialized from the proposal, the proposal was priced from the
-- specification, and the specification tool computed it by applying the
-- dealer's OWN configured multiplier to list. So the view read back the
-- dealer's assumption and reported it as an observation -- with false
-- authority, and most confidently in exactly the case where the assumption was
-- stale.
--
-- There are three cost numbers in a furniture job, and only the last two are
-- evidence:
--
--   1. ASSUMED   list x the multiplier configured in Giza / CET / 2020.
--                A guess, only as fresh as whoever last maintained that table.
--   2. ACTUAL    what the manufacturer's portal priced it at on placement.
--   3. FINAL     what the acknowledgment, then the invoice, says.
--
-- The quote is built on (1). Margin is decided by (3). This view now reads (3).
--
-- What that turns the feature into: the per-line curiosity becomes a standing,
-- systemic finding.
--
--   "Your specification tool assumes 55% off Steelcase Series 1. The last 14
--    acknowledged lines came in at 48%. Every quote you write is 7 points
--    optimistic."
--
-- That is drift in the dealer's own discount configuration, which silently
-- costs margin on every job until somebody notices. Both numbers are exposed on
-- the same row so the gap is one subtraction rather than a join.
--
-- Lines with no acknowledgment contribute nothing. A dealer who has recorded no
-- acks gets an empty view, which correctly reads as "no evidence" rather than
-- "no drift".

DROP VIEW IF EXISTS public.observed_vendor_discounts;

CREATE VIEW public.observed_vendor_discounts
WITH (security_invoker = true) AS
SELECT
  pl.organization_id,
  vp.manufacturer_name,
  ol.series_name,
  so.contract_vehicle,

  count(*)::integer AS line_count,

  -- Reality. Weighted by extended list value, so one $40 accessory does not
  -- count as much as a $12,000 casegoods run.
  round(
    100.0 * (
      1 - sum(COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
          / NULLIF(sum(COALESCE(pl.acked_quantity, pl.quantity) * pl.list_price), 0)
    ),
    2
  ) AS discount_percent,

  -- The assumption the quote was built on, over the same lines, so the two are
  -- directly comparable.
  round(
    100.0 * (
      1 - sum(pl.quantity * ol.unit_cost)
          / NULLIF(sum(pl.quantity * pl.list_price), 0)
    ),
    2
  ) AS assumed_discount_percent,

  -- Positive means the specification tool is OPTIMISTIC: it assumed a bigger
  -- discount than the manufacturer actually gave, so quoted cost runs under
  -- real cost and margin is being quoted away.
  round(
    100.0 * (
      (1 - sum(pl.quantity * ol.unit_cost)
           / NULLIF(sum(pl.quantity * pl.list_price), 0))
      - (1 - sum(COALESCE(pl.acked_quantity, pl.quantity) * pl.acked_unit_cost)
             / NULLIF(sum(COALESCE(pl.acked_quantity, pl.quantity) * pl.list_price), 0))
    ),
    2
  ) AS drift_percent,

  -- The envelope of acknowledged rates. Anomaly detection compares against this
  -- rather than the mean: real pricing varies across a series, and flagging
  -- every line that differs from average would flag most of them.
  round(min(100.0 * (1 - pl.acked_unit_cost / pl.list_price)), 2) AS min_discount_percent,
  round(max(100.0 * (1 - pl.acked_unit_cost / pl.list_price)), 2) AS max_discount_percent,

  max(pl.acknowledged_at) AS last_seen_at

FROM public.po_lines pl
JOIN public.vendor_pos vp   ON vp.id = pl.vendor_po_id
JOIN public.order_lines ol  ON ol.id = pl.order_line_id
JOIN public.sales_orders so ON so.id = vp.sales_order_id
-- An acknowledgment is what makes the rate evidence rather than assumption.
WHERE pl.acked_unit_cost IS NOT NULL
  AND pl.list_price IS NOT NULL
  AND pl.list_price > 0
GROUP BY
  pl.organization_id,
  vp.manufacturer_name,
  ol.series_name,
  so.contract_vehicle;

COMMENT ON VIEW public.observed_vendor_discounts IS
  'Dealer discount rates as ACKNOWLEDGED by manufacturers, beside the rate the quote assumed, per manufacturer/series/contract. drift_percent > 0 means the specification tool quotes a bigger discount than is actually being given.';

GRANT SELECT ON public.observed_vendor_discounts TO authenticated;
GRANT SELECT ON public.observed_vendor_discounts TO service_role;

-- Supports the grouped scan. The old index was over order_lines, which this
-- view no longer reads for rate inference.
DROP INDEX IF EXISTS public.idx_order_lines_observed_rates;

CREATE INDEX IF NOT EXISTS idx_po_lines_acked_rates
  ON public.po_lines (organization_id, order_line_id)
  WHERE acked_unit_cost IS NOT NULL AND list_price IS NOT NULL;


-- ==========================================================================
-- 20260821110000_allocate_document_number.sql
-- ==========================================================================

-- Atomic document number allocation
--
-- Numbers are currently assigned by reading every existing document, taking the
-- maximum, and adding one. That races: two people creating an order in the same
-- second both read the same maximum and both get the same number. Proposals
-- have lived with it; orders must not, because an order number travels onto
-- purchase orders, invoices, and the customer's own paperwork, and a duplicate
-- is discovered weeks later by an accounts department.
--
-- This allocates from a counter instead. The UPDATE takes a row lock on the
-- organization, so concurrent callers serialize and each gets a distinct value.
--
-- It returns the NUMBER, not the formatted string. Formatting lives in
-- src/services/numberingConfigService.ts and stays there -- reimplementing
-- prefixes, separators, and padding in SQL would create a second source of
-- truth that could disagree with what the settings screen previews.
--
-- SECURITY DEFINER on purpose: bumping the counter means updating
-- public.organizations, which RLS restricts to Owner and Admin. Any active
-- member may create an order, so the function does the write on their behalf
-- after checking membership explicitly. That check is the whole security
-- boundary and must not be removed.

CREATE OR REPLACE FUNCTION public.allocate_document_number(
  p_organization_id uuid,
  p_document_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next integer;
BEGIN
  IF p_organization_id IS NULL OR NULLIF(btrim(p_document_type), '') IS NULL THEN
    RAISE EXCEPTION 'organization and document type are both required';
  END IF;

  -- The security boundary. SECURITY DEFINER bypasses RLS, so membership is
  -- checked here rather than inherited.
  IF NOT public.is_active_member(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Merge rather than jsonb_set: jsonb_set will not create the intermediate
  -- object for a document type that has never been configured, and merging
  -- preserves any prefix and separators an admin has already set.
  UPDATE public.organizations o
     SET numbering_config =
           COALESCE(o.numbering_config, '{}'::jsonb)
           || jsonb_build_object(
                p_document_type,
                COALESCE(o.numbering_config -> p_document_type, '{}'::jsonb)
                || jsonb_build_object(
                     'lastNumber',
                     COALESCE(
                       (o.numbering_config -> p_document_type ->> 'lastNumber')::integer,
                       1000
                     ) + 1
                   )
              )
   WHERE o.id = p_organization_id
  RETURNING (numbering_config -> p_document_type ->> 'lastNumber')::integer
  INTO v_next;

  IF v_next IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION public.allocate_document_number(uuid, text) IS
  'Atomically allocate the next document number for an organization and document type. Returns the number; formatting belongs to the application. SECURITY DEFINER because bumping the counter writes to organizations, which RLS restricts to Owner/Admin -- membership is checked inside.';

REVOKE ALL ON FUNCTION public.allocate_document_number(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(uuid, text) TO service_role;


-- ==========================================================================
-- 20260821110001_order_status_from_events.sql
-- ==========================================================================

-- Sales order status, derived from what has actually happened
--
-- sales_orders.status is currently set by hand and immediately starts lying. A
-- job that is half received still reads 'Released' because nobody went back to
-- change it, and the board a PM scans every morning quietly stops meaning
-- anything.
--
-- Every fact needed to answer the question is already in order_line_events. So
-- status becomes derived, in the same spirit as the fulfillment quantities:
-- computed from events, never remembered.
--
-- It is exposed as a VIEW rather than maintained on the row by trigger,
-- deliberately. A trigger would have to fire on order_line_events, walk every
-- sibling line, and write back to sales_orders -- which turns an append-only
-- insert into a multi-table write, and makes bulk event insertion (the fan-out
-- writes one event per line) quadratic. Reading is cheap; writing on every
-- event is not.
--
-- Two statuses stay MANUAL and are never derived:
--
--   Draft      the order is still being assembled. Nothing has happened yet,
--              so events cannot distinguish it from Released.
--   Cancelled  a decision, not an observation. No amount of event history
--              implies it, and deriving over it would silently resurrect a
--              cancelled job.

CREATE OR REPLACE VIEW public.sales_order_progress
WITH (security_invoker = true) AS
WITH line_totals AS (
  SELECT
    ol.sales_order_id,
    ol.organization_id,
    count(*)                                     AS line_count,
    sum(ol.quantity)                             AS qty_total,
    -- Only purchasable lines can be ordered or received. The dealer's own
    -- labor is never bought, so counting it as "not yet ordered" would hold an
    -- order at 'Partially Ordered' forever.
    sum(ol.quantity) FILTER (
      WHERE ol.fulfillment_type IN ('purchase', 'subcontract')
    )                                            AS qty_purchasable,
    sum(COALESCE(f.qty_ordered, 0))              AS qty_ordered,
    sum(COALESCE(f.qty_received, 0))             AS qty_received,
    sum(COALESCE(f.qty_installed, 0))            AS qty_installed
  FROM public.order_lines ol
  LEFT JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
  WHERE ol.status <> 'Cancelled'
  GROUP BY ol.sales_order_id, ol.organization_id
)
SELECT
  so.id AS sales_order_id,
  so.organization_id,
  so.status AS stored_status,
  COALESCE(t.line_count, 0)      AS line_count,
  COALESCE(t.qty_total, 0)       AS qty_total,
  COALESCE(t.qty_purchasable, 0) AS qty_purchasable,
  COALESCE(t.qty_ordered, 0)     AS qty_ordered,
  COALESCE(t.qty_received, 0)    AS qty_received,
  COALESCE(t.qty_installed, 0)   AS qty_installed,

  CASE
    -- Decisions, not observations. These win over anything derived.
    WHEN so.status IN ('Draft', 'Cancelled') THEN so.status

    -- Nothing on the order yet.
    WHEN COALESCE(t.line_count, 0) = 0 THEN 'Released'

    -- Everything bought has been installed. Checked before the earlier stages
    -- so a finished job does not read as 'Receiving'.
    WHEN COALESCE(t.qty_installed, 0) >= COALESCE(t.qty_total, 0)
     AND COALESCE(t.qty_total, 0) > 0                          THEN 'Complete'

    WHEN COALESCE(t.qty_installed, 0) > 0                      THEN 'Installing'
    WHEN COALESCE(t.qty_received, 0) > 0                       THEN 'Receiving'

    WHEN COALESCE(t.qty_purchasable, 0) > 0
     AND COALESCE(t.qty_ordered, 0) >= COALESCE(t.qty_purchasable, 0)
                                                               THEN 'Ordered'
    WHEN COALESCE(t.qty_ordered, 0) > 0                        THEN 'Partially Ordered'
    ELSE 'Released'
  END AS derived_status

FROM public.sales_orders so
LEFT JOIN line_totals t ON t.sales_order_id = so.id;

COMMENT ON VIEW public.sales_order_progress IS
  'Sales order status derived from order_line_events, beside the stored value. Draft and Cancelled are decisions and pass through untouched; everything else is observed. Read this rather than sales_orders.status.';

GRANT SELECT ON public.sales_order_progress TO authenticated;
GRANT SELECT ON public.sales_order_progress TO service_role;


-- ==========================================================================
-- 20260824100000_receipts.sql
-- ==========================================================================

-- Receiving
--
-- A truck arrives. Some of what is on it is what was ordered, some of it is
-- damaged, and almost never is it the whole order -- a 1,200-line job arrives
-- across a dozen deliveries over three months.
--
--   vendor_po -> receipt -> receipt_lines -> order_line_events ('received')
--
-- Decisions baked in:
--
--   * A receipt is a real event in the world -- a truck, on a date, with a bill
--     of lading -- so it gets a header rather than being a loose pile of
--     events. That header is what a freight claim is filed against and what the
--     packing slip attaches to.
--
--   * quantity_received means USABLE product. Damage is recorded beside it and
--     does NOT count as received, because damaged product cannot be installed
--     and the line still needs that quantity delivered. Recording 10 received
--     with 2 damaged would report the line complete while a crew stands in
--     front of two broken chairs.
--
--   * There is deliberately no 'damaged' event type. Quantities in the event
--     log answer "how much good product exists"; damage is a property of the
--     delivery that produced it. Damage discovered LATER, after a clean
--     receipt, is recorded the way every other correction is -- a negative
--     'received' event -- which the append-only design already supports.
--
--   * Over-receiving is allowed. Manufacturers ship overages, and a receiving
--     clerk must be able to record what is physically on the dock rather than
--     what the paperwork expected.

-- ============================================================================
-- receipts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  -- Which manufacturer order this delivery satisfies. Nullable: product
  -- occasionally arrives that nobody can immediately tie to an order.
  vendor_po_id uuid REFERENCES public.vendor_pos(id) ON DELETE SET NULL,

  received_date date NOT NULL DEFAULT CURRENT_DATE,

  -- Freight identity. What a claim is filed with.
  carrier text,
  tracking_number text,
  bill_of_lading text,

  notes text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_order
  ON public.receipts (sales_order_id, received_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_po
  ON public.receipts (vendor_po_id) WHERE vendor_po_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_receipts_org
  ON public.receipts (organization_id, received_date DESC);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view receipts" ON public.receipts;
CREATE POLICY "Members can view receipts"
  ON public.receipts FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert receipts" ON public.receipts;
CREATE POLICY "Members can insert receipts"
  ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update receipts" ON public.receipts;
CREATE POLICY "Members can update receipts"
  ON public.receipts FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Deleting a receipt destroys evidence in a freight claim.
DROP POLICY IF EXISTS "Admin can delete receipts" ON public.receipts;
CREATE POLICY "Admin can delete receipts"
  ON public.receipts FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_receipts_updated_at ON public.receipts;
CREATE TRIGGER set_receipts_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- receipt_lines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  -- RESTRICT: a line that has been received must not be deletable out from
  -- under the delivery that recorded it.
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE RESTRICT,

  -- Usable product. This is what becomes a 'received' event.
  quantity_received numeric NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  -- Arrived broken. Recorded, photographed, claimed -- but never counted as
  -- received, because the line still needs that quantity delivered.
  quantity_damaged numeric NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),

  damage_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A line that records nothing is a mistake, not a delivery.
  CONSTRAINT receipt_lines_something_happened
    CHECK (quantity_received > 0 OR quantity_damaged > 0)
);

CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt
  ON public.receipt_lines (receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_order_line
  ON public.receipt_lines (order_line_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_damaged
  ON public.receipt_lines (organization_id) WHERE quantity_damaged > 0;

ALTER TABLE public.receipt_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view receipt lines" ON public.receipt_lines;
CREATE POLICY "Members can view receipt lines"
  ON public.receipt_lines FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert receipt lines" ON public.receipt_lines;
CREATE POLICY "Members can insert receipt lines"
  ON public.receipt_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update receipt lines" ON public.receipt_lines;
CREATE POLICY "Members can update receipt lines"
  ON public.receipt_lines FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Admin can delete receipt lines" ON public.receipt_lines;
CREATE POLICY "Admin can delete receipt lines"
  ON public.receipt_lines FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_receipt_lines_updated_at ON public.receipt_lines;
CREATE TRIGGER set_receipt_lines_updated_at
  BEFORE UPDATE ON public.receipt_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- order_line_fulfillment: what is still outstanding to receive
-- ============================================================================
-- CREATE OR REPLACE appends the new column; existing columns keep their names
-- and types, so dependent views are unaffected.
--
-- Outstanding is measured against what was ORDERED, not against the line
-- quantity. A line released in phases has only bought part of itself so far,
-- and the warehouse cannot receive product nobody has ordered yet.

CREATE OR REPLACE VIEW public.order_line_fulfillment
WITH (security_invoker = true) AS
SELECT
  ol.id                AS order_line_id,
  ol.organization_id,
  ol.sales_order_id,
  ol.quantity          AS quantity_ordered_total,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'ordered'), 0)      AS qty_ordered,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'acknowledged'), 0) AS qty_acknowledged,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'shipped'), 0)      AS qty_shipped,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'received'), 0)     AS qty_received,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'installed'), 0)    AS qty_installed,
  COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'invoiced'), 0)     AS qty_invoiced,
  ol.quantity - COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'ordered'), 0)
                                                                            AS qty_to_order,
  -- Never negative: an overage is recorded honestly but does not create
  -- negative outstanding work.
  GREATEST(
    COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'ordered'), 0)
    - COALESCE(SUM(e.quantity) FILTER (WHERE e.event_type = 'received'), 0),
    0
  )                                                                         AS qty_to_receive
FROM public.order_lines ol
LEFT JOIN public.order_line_events e ON e.order_line_id = ol.id
GROUP BY ol.id, ol.organization_id, ol.sales_order_id, ol.quantity;

-- ============================================================================
-- create_receipt_with_lines
-- ============================================================================
-- One call, because a receipt whose lines exist but whose events do not would
-- leave that product looking undelivered and the next delivery would receive it
-- twice. SECURITY INVOKER, so RLS applies.

CREATE OR REPLACE FUNCTION public.create_receipt_with_lines(
  p_receipt jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_receipt_id uuid;
  v_org_id uuid := (p_receipt->>'organization_id')::uuid;
  v_line_count integer;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'A receipt needs at least one line';
  END IF;

  INSERT INTO public.receipts (
    organization_id, sales_order_id, vendor_po_id, received_date,
    carrier, tracking_number, bill_of_lading, notes, received_by
  )
  VALUES (
    v_org_id,
    (p_receipt->>'sales_order_id')::uuid,
    NULLIF(p_receipt->>'vendor_po_id', '')::uuid,
    COALESCE(NULLIF(p_receipt->>'received_date', '')::date, CURRENT_DATE),
    NULLIF(p_receipt->>'carrier', ''),
    NULLIF(p_receipt->>'tracking_number', ''),
    NULLIF(p_receipt->>'bill_of_lading', ''),
    NULLIF(p_receipt->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_receipt_id;

  INSERT INTO public.receipt_lines (
    organization_id, receipt_id, order_line_id,
    quantity_received, quantity_damaged, damage_notes, notes
  )
  SELECT
    v_org_id,
    v_receipt_id,
    ol.id,
    COALESCE((t.l->>'quantity_received')::numeric, 0),
    COALESCE((t.l->>'quantity_damaged')::numeric, 0),
    NULLIF(t.l->>'damage_notes', ''),
    NULLIF(t.l->>'notes', '')
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ordinality)
  JOIN public.order_lines ol ON ol.id = (t.l->>'order_line_id')::uuid;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'One or more order lines could not be found';
  END IF;

  -- Only USABLE product becomes a received event. Damaged quantity is recorded
  -- on the receipt line and leaves the order line still owing that quantity.
  INSERT INTO public.order_line_events (
    organization_id, order_line_id, event_type, quantity,
    reference_type, reference_id, notes, created_by
  )
  SELECT
    v_org_id, rl.order_line_id, 'received', rl.quantity_received,
    'receipt', v_receipt_id, rl.notes, auth.uid()
  FROM public.receipt_lines rl
  WHERE rl.receipt_id = v_receipt_id
    AND rl.quantity_received > 0;

  RETURN v_receipt_id;
END;
$$;

COMMENT ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) IS
  'Atomically record a delivery, its lines, and the received events. Only usable quantity becomes an event; damaged quantity is recorded but leaves the line still owing.';

REVOKE ALL ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) TO service_role;

-- ============================================================================
-- vendor_po_progress  (derived receiving status)
-- ============================================================================
-- Same reasoning as sales_order_progress: a stored status is set once and then
-- lies.
--
-- One rule does NOT transfer from that view, though, and copying it was a bug
-- caught in testing. A sales order is genuinely a draft until someone releases
-- it, and no event distinguishes 'Draft' from 'Released', so 'Draft' passes
-- through there as a decision. A manufacturer order is different: the fan-out
-- creates every one of them as 'Draft' and no screen ever moves them on. Passing
-- it through meant an order placed in the portal, given a number, acknowledged
-- and fully received still read 'Draft' -- the exact failure derived status
-- exists to prevent.
--
-- So Draft here means what it says: no number from the portal, and nothing
-- recorded. Evidence outranks it everywhere else. Only 'Cancelled' is an
-- absolute pass-through, because no evidence implies a decision to stop.

CREATE OR REPLACE VIEW public.vendor_po_progress
WITH (security_invoker = true) AS
WITH po_totals AS (
  SELECT
    pl.vendor_po_id,
    sum(pl.quantity)                   AS qty_ordered,
    sum(COALESCE(r.received_on_po, 0)) AS qty_received,
    count(*)                           AS line_count,
    count(*) FILTER (WHERE pl.acknowledged_at IS NOT NULL) AS lines_acknowledged
  FROM public.po_lines pl
  LEFT JOIN LATERAL (
    SELECT COALESCE(sum(rl.quantity_received), 0) AS received_on_po
    FROM public.receipt_lines rl
    JOIN public.receipts rec ON rec.id = rl.receipt_id
    WHERE rl.order_line_id = pl.order_line_id
      AND rec.vendor_po_id = pl.vendor_po_id
  ) r ON true
  GROUP BY pl.vendor_po_id
)
SELECT
  vp.id AS vendor_po_id,
  vp.organization_id,
  vp.sales_order_id,
  vp.status AS stored_status,
  COALESCE(t.line_count, 0)         AS line_count,
  COALESCE(t.lines_acknowledged, 0) AS lines_acknowledged,
  COALESCE(t.qty_ordered, 0)        AS qty_ordered,
  COALESCE(t.qty_received, 0)       AS qty_received,
  CASE
    -- A decision. Nothing observed can overturn it.
    WHEN vp.status = 'Cancelled' THEN 'Cancelled'

    WHEN COALESCE(t.qty_ordered, 0) > 0
     AND COALESCE(t.qty_received, 0) >= COALESCE(t.qty_ordered, 0) THEN 'Received'
    WHEN COALESCE(t.qty_received, 0) > 0                           THEN 'Partially Received'
    WHEN COALESCE(t.lines_acknowledged, 0) > 0                     THEN 'Acknowledged'

    -- The portal assigned a number, so it has been placed with the factory.
    WHEN NULLIF(btrim(COALESCE(vp.po_number, '')), '') IS NOT NULL THEN 'Placed'

    ELSE 'Draft'
  END AS derived_status
FROM public.vendor_pos vp
LEFT JOIN po_totals t ON t.vendor_po_id = vp.id;

COMMENT ON VIEW public.vendor_po_progress IS
  'Manufacturer order status derived from its portal number, acknowledgments, and receipts. Only Cancelled passes through as a decision; Draft means no number and nothing recorded.';

GRANT SELECT ON public.vendor_po_progress TO authenticated;
GRANT SELECT ON public.vendor_po_progress TO service_role;


-- ==========================================================================
-- 20260824110000_project_hub.sql
-- ==========================================================================

-- The project as the hub
--
-- Everything a dealer does after a quote is won already points at the project:
-- proposals, sales orders, manufacturer orders, receipts, work orders, tasks,
-- attachments, and payment jobs all carry a project_id. What has been missing
-- is anywhere to SEE that, and two concepts the job cannot be run without.
--
--   project_notes    what someone wants the next person to know
--   change_orders    the customer asked for something different after signing
--   project_activity notes and system events on one timeline
--   project_progress where the job actually is, from evidence
--
-- The last one matters because projects.workflow_status is the name of an
-- org-configurable Kanban column. That records where somebody DRAGGED the card,
-- which is a useful intention and a poor fact. Progress is derived alongside it
-- rather than replacing it: one is where the job was put, the other is where it
-- is.

-- ============================================================================
-- project_notes
-- ============================================================================
-- Deliberately not comments-on-a-task. A project note is addressed to whoever
-- picks the job up next -- "customer moved the install to the 14th", "dock is
-- shared with the tenant above" -- and losing it inside a task nobody reopens
-- is how that gets forgotten.

CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  body text NOT NULL CHECK (btrim(body) <> ''),
  -- Pinned notes lead the feed regardless of age. Site access and access codes
  -- stay relevant for months; a status update does not.
  is_pinned boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project
  ON public.project_notes (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_notes_pinned
  ON public.project_notes (project_id) WHERE is_pinned;

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view project notes" ON public.project_notes;
CREATE POLICY "Members can view project notes"
  ON public.project_notes FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert project notes" ON public.project_notes;
CREATE POLICY "Members can insert project notes"
  ON public.project_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Editing someone else's note rewrites the record of what they said. Pinning is
-- the exception a team needs, so admins may update any note.
DROP POLICY IF EXISTS "Authors and admins can update project notes" ON public.project_notes;
CREATE POLICY "Authors and admins can update project notes"
  ON public.project_notes FOR UPDATE TO authenticated
  USING (
    public.is_active_member((SELECT auth.uid()), organization_id)
    AND (created_by = (SELECT auth.uid())
         OR public.has_org_role((SELECT auth.uid()), organization_id,
                                ARRAY['Owner'::text, 'Admin'::text]))
  )
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Authors and admins can delete project notes" ON public.project_notes;
CREATE POLICY "Authors and admins can delete project notes"
  ON public.project_notes FOR DELETE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id,
                           ARRAY['Owner'::text, 'Admin'::text])
  );

DROP TRIGGER IF EXISTS set_project_notes_updated_at ON public.project_notes;
CREATE TRIGGER set_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- change_orders
-- ============================================================================
-- The customer wants something different after signing. Today that is an email
-- thread and a revised quote, and the reason it belongs in the system is that
-- the gap between "requested" and "priced" is where a dealer does unpaid work.
--
-- An approved change order becomes its own sales order rather than editing the
-- original -- which is what sales_orders was built for ("a project may have
-- several sales orders; change orders and added scope get their own"). Editing
-- the signed order in place would destroy the record of what the customer
-- actually agreed to.

CREATE TABLE IF NOT EXISTS public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  change_order_number text,
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text,

  status text NOT NULL DEFAULT 'Requested'
    CHECK (status IN (
      'Requested',  -- customer asked; nobody has priced it
      'Pricing',    -- being costed
      'Submitted',  -- priced and sent to the customer
      'Approved',   -- customer accepted; becomes scope
      'Rejected',   -- customer declined
      'Withdrawn'   -- never went anywhere
    )),

  -- Impact. Null until priced, which is a different state from zero: "we have
  -- not costed this" must not read as "this is free".
  sell_delta numeric,
  cost_delta numeric,

  requested_by_name text,
  requested_at date NOT NULL DEFAULT CURRENT_DATE,
  responded_at date,

  -- The scope this became once approved.
  resulting_sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- An answered change order must say when it was answered.
  CONSTRAINT change_orders_answered_has_date
    CHECK (status NOT IN ('Approved', 'Rejected') OR responded_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_change_orders_project
  ON public.change_orders (project_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_orders_open
  ON public.change_orders (organization_id)
  WHERE status IN ('Requested', 'Pricing', 'Submitted');
CREATE UNIQUE INDEX IF NOT EXISTS idx_change_orders_number_unique
  ON public.change_orders (organization_id, change_order_number)
  WHERE change_order_number IS NOT NULL;

ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view change orders" ON public.change_orders;
CREATE POLICY "Members can view change orders"
  ON public.change_orders FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert change orders" ON public.change_orders;
CREATE POLICY "Members can insert change orders"
  ON public.change_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update change orders" ON public.change_orders;
CREATE POLICY "Members can update change orders"
  ON public.change_orders FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Admin can delete change orders" ON public.change_orders;
CREATE POLICY "Admin can delete change orders"
  ON public.change_orders FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id,
                             ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_change_orders_updated_at ON public.change_orders;
CREATE TRIGGER set_change_orders_updated_at
  BEFORE UPDATE ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- project_activity
-- ============================================================================
-- One timeline: what people wrote, and what the system observed.
--
-- System entries are DERIVED rather than written. A parallel activity table
-- would be a second copy of facts that already exist in sales_orders, po_lines,
-- receipts, and work_orders -- and the copy is the one that goes stale, drifts,
-- or silently stops being written when a code path changes. Deriving costs a
-- little on read and cannot lie.
--
-- Every row carries reference_type/reference_id so the UI can link straight to
-- the thing that happened.

CREATE OR REPLACE VIEW public.project_activity
WITH (security_invoker = true) AS

-- What people wrote.
SELECT
  n.project_id, n.organization_id,
  n.created_at                                   AS occurred_at,
  'note'::text                                   AS kind,
  CASE WHEN n.is_pinned THEN 'Pinned note' ELSE 'Note' END AS title,
  n.body                                         AS detail,
  n.created_by                                   AS actor_id,
  'project_note'::text                           AS reference_type,
  n.id                                           AS reference_id,
  n.is_pinned                                    AS is_pinned
FROM public.project_notes n

UNION ALL

-- Scope became an order.
SELECT
  so.project_id, so.organization_id,
  so.created_at, 'order_created',
  'Sales order created',
  COALESCE(so.order_number, 'Draft order')
    || COALESCE(' · ' || so.contract_vehicle, ''),
  so.created_by, 'sales_order', so.id, false
FROM public.sales_orders so

UNION ALL

-- Placed with a manufacturer, in their portal.
SELECT
  so.project_id, vp.organization_id,
  COALESCE(vp.placed_at, vp.created_at), 'order_placed',
  'Order placed with ' || vp.manufacturer_name,
  COALESCE('Their number ' || vp.po_number, 'No order number recorded'),
  vp.created_by, 'vendor_po', vp.id, false
FROM public.vendor_pos vp
JOIN public.sales_orders so ON so.id = vp.sales_order_id

UNION ALL

-- A manufacturer answered. The cost delta is the part worth reading.
SELECT
  so.project_id, vp.organization_id,
  vp.acknowledged_at, 'acknowledgment',
  'Acknowledged by ' || vp.manufacturer_name,
  CASE
    WHEN v.total_variance IS NULL OR v.total_variance = 0
      THEN 'At the cost quoted'
    WHEN v.total_variance > 0
      THEN 'Costs ' || to_char(v.total_variance, 'FM999,999,990.00') || ' more than quoted'
    ELSE 'Costs ' || to_char(abs(v.total_variance), 'FM999,999,990.00') || ' less than quoted'
  END,
  NULL::uuid, 'vendor_po', vp.id, false
FROM public.vendor_pos vp
JOIN public.sales_orders so ON so.id = vp.sales_order_id
LEFT JOIN LATERAL (
  SELECT sum(plv.quoted_cost_variance) AS total_variance
  FROM public.po_line_variance plv
  WHERE plv.vendor_po_id = vp.id
) v ON true
WHERE vp.acknowledged_at IS NOT NULL

UNION ALL

-- A truck arrived.
SELECT
  so.project_id, r.organization_id,
  r.created_at, 'delivery',
  'Delivery received'
    || COALESCE(' from ' || r.carrier, ''),
  (SELECT
     sum(rl.quantity_received)::text || ' received'
     || CASE WHEN sum(rl.quantity_damaged) > 0
             THEN ', ' || sum(rl.quantity_damaged)::text || ' damaged'
             ELSE '' END
   FROM public.receipt_lines rl WHERE rl.receipt_id = r.id),
  r.received_by, 'receipt', r.id, false
FROM public.receipts r
JOIN public.sales_orders so ON so.id = r.sales_order_id

UNION ALL

-- The customer asked for something different.
SELECT
  co.project_id, co.organization_id,
  co.created_at, 'change_order',
  'Change order ' || lower(co.status) || COALESCE(' · ' || co.change_order_number, ''),
  co.title
    || CASE WHEN co.sell_delta IS NULL THEN ' · not yet priced'
            ELSE ' · ' || to_char(co.sell_delta, 'FM999,999,990.00') END,
  co.created_by, 'change_order', co.id, false
FROM public.change_orders co

UNION ALL

-- Work happened on site.
SELECT
  wo.project_id, wo.organization_id,
  COALESCE(wo.actual_end, wo.updated_at), 'work_order',
  'Work order ' || lower(wo.status),
  COALESCE(wo.work_order_number, wo.work_type)
    || COALESCE(' · ' || wo.site_name, ''),
  NULL::uuid, 'work_order', wo.id, false
FROM public.work_orders wo
WHERE wo.status IN ('Complete', 'Cancelled');

COMMENT ON VIEW public.project_activity IS
  'Notes and derived system events on one timeline per project. System entries are derived from the tables that already hold those facts, never copied, so the feed cannot drift from reality.';

GRANT SELECT ON public.project_activity TO authenticated;
GRANT SELECT ON public.project_activity TO service_role;

-- ============================================================================
-- project_progress
-- ============================================================================
-- Where the job actually is, rolled up across every sales order on it, beside
-- the Kanban column somebody dragged it to. Both are useful and they are not
-- the same claim: workflow_status is an intention, this is a fact.
--
-- Stages are ordered by what has happened LATEST, not by what is incomplete --
-- a job with product arriving and a crew on site reads 'Installing', because
-- that is what a PM needs to know, not that one accessory is still outstanding.

CREATE OR REPLACE VIEW public.project_progress
WITH (security_invoker = true) AS
WITH order_rollup AS (
  SELECT
    so.project_id,
    count(DISTINCT so.id)                    AS order_count,
    sum(p.qty_total)                         AS qty_total,
    sum(p.qty_purchasable)                   AS qty_purchasable,
    sum(p.qty_ordered)                       AS qty_ordered,
    sum(p.qty_received)                      AS qty_received,
    sum(p.qty_installed)                     AS qty_installed
  FROM public.sales_orders so
  JOIN public.sales_order_progress p ON p.sales_order_id = so.id
  WHERE so.status <> 'Cancelled'
  GROUP BY so.project_id
),
money AS (
  SELECT
    so.project_id,
    sum(ol.sell_price)                       AS sell_total,
    sum(ol.quantity * ol.unit_cost)          AS quoted_cost_total
  FROM public.sales_orders so
  JOIN public.order_lines ol ON ol.sales_order_id = so.id
  WHERE ol.status <> 'Cancelled'
  GROUP BY so.project_id
),
exposure AS (
  -- Acknowledged cost against the cost the quote was built on, across the job.
  SELECT so.project_id, sum(plv.quoted_cost_variance) AS cost_variance
  FROM public.sales_orders so
  JOIN public.po_line_variance plv ON plv.sales_order_id = so.id
  GROUP BY so.project_id
),
damage AS (
  SELECT so.project_id, sum(rl.quantity_damaged) AS qty_damaged
  FROM public.sales_orders so
  JOIN public.receipts r ON r.sales_order_id = so.id
  JOIN public.receipt_lines rl ON rl.receipt_id = r.id
  GROUP BY so.project_id
),
changes AS (
  SELECT
    project_id,
    count(*) FILTER (WHERE status IN ('Requested', 'Pricing', 'Submitted')) AS open_change_orders,
    sum(sell_delta) FILTER (WHERE status = 'Approved')                      AS approved_change_value
  FROM public.change_orders
  GROUP BY project_id
),
tasks AS (
  SELECT project_id, count(*) FILTER (WHERE status <> 'Done') AS open_tasks
  FROM public.project_tasks
  GROUP BY project_id
),
acks AS (
  SELECT so.project_id,
         count(*) FILTER (WHERE plv.variance_status = 'awaiting_ack') AS lines_awaiting_ack
  FROM public.sales_orders so
  JOIN public.po_line_variance plv ON plv.sales_order_id = so.id
  GROUP BY so.project_id
)
SELECT
  pr.id AS project_id,
  pr.organization_id,
  pr.workflow_status,

  COALESCE(o.order_count, 0)          AS order_count,
  COALESCE(o.qty_total, 0)            AS qty_total,
  COALESCE(o.qty_ordered, 0)          AS qty_ordered,
  COALESCE(o.qty_received, 0)         AS qty_received,
  COALESCE(o.qty_installed, 0)        AS qty_installed,

  COALESCE(m.sell_total, 0)           AS sell_total,
  COALESCE(m.quoted_cost_total, 0)    AS quoted_cost_total,
  e.cost_variance                     AS acknowledged_cost_variance,

  COALESCE(d.qty_damaged, 0)          AS qty_damaged,
  COALESCE(c.open_change_orders, 0)   AS open_change_orders,
  c.approved_change_value,
  COALESCE(t.open_tasks, 0)           AS open_tasks,
  COALESCE(a.lines_awaiting_ack, 0)   AS lines_awaiting_ack,

  CASE
    WHEN COALESCE(o.order_count, 0) = 0 THEN 'Quoted'
    WHEN COALESCE(o.qty_installed, 0) >= COALESCE(o.qty_total, 0)
     AND COALESCE(o.qty_total, 0) > 0                          THEN 'Ready to bill'
    WHEN COALESCE(o.qty_installed, 0) > 0                      THEN 'Installing'
    WHEN COALESCE(o.qty_received, 0) > 0                       THEN 'Receiving'
    WHEN COALESCE(o.qty_purchasable, 0) > 0
     AND COALESCE(o.qty_ordered, 0) >= COALESCE(o.qty_purchasable, 0)
                                                               THEN 'Awaiting delivery'
    WHEN COALESCE(o.qty_ordered, 0) > 0                        THEN 'Ordering'
    ELSE 'Released'
  END AS stage

FROM public.projects pr
LEFT JOIN order_rollup o ON o.project_id = pr.id
LEFT JOIN money       m ON m.project_id = pr.id
LEFT JOIN exposure    e ON e.project_id = pr.id
LEFT JOIN damage      d ON d.project_id = pr.id
LEFT JOIN changes     c ON c.project_id = pr.id
LEFT JOIN tasks       t ON t.project_id = pr.id
LEFT JOIN acks        a ON a.project_id = pr.id;

COMMENT ON VIEW public.project_progress IS
  'Where a project actually is, rolled up from its sales orders, beside the Kanban column it was dragged to. Also carries the counts a project header needs: open change orders, damaged product, lines awaiting acknowledgment, and acknowledged cost variance.';

GRANT SELECT ON public.project_progress TO authenticated;
GRANT SELECT ON public.project_progress TO service_role;


-- ==========================================================================
-- 20260824120000_shipments.sql
-- ==========================================================================

-- Shipments and carrier tracking
--
-- Between "the factory acknowledged it" and "it is on our dock" there is a
-- three-to-six week hole that nobody in this business can currently see into.
-- A dealer chases it by phone: call the factory, get a PRO number, call the
-- freight line, read a website, write the date on a sticky note. That hole is
-- what this migration closes.
--
--   vendor_po -> shipment -> shipment_lines -> order_line_events ('shipped')
--                     |
--                     +-> shipment_tracking_events   (carrier scans, observed)
--                     +-> receipt.shipment_id        (what actually arrived)
--
-- Decisions baked in:
--
--   * A shipment is NOT a receipt. The carrier saying "Delivered" means the
--     truck stopped at the address; it does not mean anyone counted what came
--     off it, and it certainly does not mean the product is usable. So a
--     'delivered' tracking status deliberately writes NO 'received' events. It
--     raises a flag on the receiving screen and waits for a human. This is the
--     same rule receiving already applies to damage, for the same reason: a job
--     that reads complete while broken product sits in the warehouse is worse
--     than a job that reads incomplete.
--
--   * Tracking status is OBSERVED, never typed. Every field the carrier owns --
--     status, ETA, scans -- is written only by the tracking provider, and the
--     row records when it was last checked so a stale number looks stale rather
--     than looking current. Anything a human knows and the carrier does not
--     (which order this covers, what is on it) is a separate, editable column.
--
--   * Freight identity is two numbers, not one. Parcel has a tracking number;
--     LTL has a PRO number and a bill of lading, and the PRO is what the
--     freight line's API actually answers to. Storing one text field and hoping
--     was the first version of this and it could not track a single pallet.
--
--   * Carriers that have no API still get a row. A manufacturer's own truck, a
--     local delivery agent, a white-glove installer -- `carrier_code` is
--     'own-truck' and `tracking_provider` is 'manual', and the status is moved
--     by hand. The alternative is that exactly the deliveries a dealer most
--     needs to see live outside the system entirely.
--
--   * The provider is pluggable and its identifiers are stored per shipment
--     (`tracking_provider`, `provider_tracking_id`). Tracking vendors get
--     acquired, reprice, and drop carriers; a schema that hardcodes one of them
--     is a schema that has to be migrated when that happens.

-- ============================================================================
-- shipments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  -- Which manufacturer order shipped. Nullable for the same reason receipts
  -- allow it: product moves that nobody can immediately tie to an order.
  vendor_po_id uuid REFERENCES public.vendor_pos(id) ON DELETE SET NULL,

  -- ------------------------------------------------------------------
  -- Freight identity
  -- ------------------------------------------------------------------
  -- Normalized slug ('fedex', 'ups', 'usps', 'dhl', 'estes', 'odfl',
  -- 'own-truck', ...). What the provider is asked about. Kept separate from
  -- the display name because a vendor writes "Old Dominion", "ODFL", and "O.D."
  -- on three consecutive acknowledgments and all three mean one API slug.
  carrier_code text,
  -- What the paperwork called them. Shown to humans, never sent to an API.
  carrier_name text,

  -- Parcel identity.
  tracking_number text,
  -- LTL identity. The number the freight line's system actually answers to.
  pro_number text,
  bill_of_lading text,
  service_level text,

  -- ------------------------------------------------------------------
  -- Observed from the carrier. Written by the tracking provider only.
  -- ------------------------------------------------------------------
  tracking_status text NOT NULL DEFAULT 'pending'
    CHECK (tracking_status IN (
      'pending',            -- registered, carrier has not acknowledged it yet
      'info_received',      -- label/BOL created, freight not yet picked up
      'in_transit',
      'out_for_delivery',
      'available_for_pickup',
      'attempt_failed',
      'delivered',          -- the truck stopped. NOT the same as received.
      'exception',          -- damaged, refused, held, lost
      'expired',            -- carrier stopped reporting; number went cold
      'unknown'
    )),
  -- The carrier's own words for the current status. Kept verbatim: "Delayed
  -- due to weather in Memphis" is what the customer actually needs to hear,
  -- and no normalized enum will ever carry it.
  tracking_status_detail text,
  tracking_location text,

  ship_date date,
  -- The carrier's estimate, which moves. The vendor's promise lives on the
  -- purchase order as acknowledged_ship_date and does not.
  estimated_delivery_date date,
  delivered_at timestamptz,

  piece_count integer CHECK (piece_count IS NULL OR piece_count > 0),
  weight_lbs numeric CHECK (weight_lbs IS NULL OR weight_lbs > 0),

  -- ------------------------------------------------------------------
  -- Provider bookkeeping
  -- ------------------------------------------------------------------
  tracking_provider text NOT NULL DEFAULT 'manual'
    CHECK (tracking_provider IN ('aftership', 'easypost', 'manual')),
  -- The provider's handle for this shipment, so a refresh is one lookup rather
  -- than a search.
  provider_tracking_id text,
  -- When the provider last answered. A status with an old timestamp is a stale
  -- status, and the UI must be able to say so instead of presenting three-week
  -- -old news as current.
  last_checked_at timestamptz,
  -- Why the last attempt failed: bad number, unsupported carrier, quota
  -- exhausted. Surfaced, because a silently unpolled shipment reads as "no
  -- news" when it is really "we never asked".
  tracking_error text,
  -- Stops the poller. Set when the shipment is fully received, or when a number
  -- has gone cold and there is nothing left to learn.
  tracking_active boolean NOT NULL DEFAULT true,

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A shipment nobody can identify cannot be tracked or claimed against. The
  -- own-truck case is exempt: there is no number to give, and forcing someone
  -- to invent one is how "N/A" ends up in a tracking field.
  CONSTRAINT shipments_identifiable CHECK (
    tracking_provider = 'manual'
    OR COALESCE(NULLIF(btrim(tracking_number), ''), NULLIF(btrim(pro_number), '')) IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_shipments_order
  ON public.shipments (sales_order_id, ship_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_shipments_po
  ON public.shipments (vendor_po_id) WHERE vendor_po_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_org_status
  ON public.shipments (organization_id, tracking_status);
-- The poller's index: what is still worth asking about, oldest check first.
CREATE INDEX IF NOT EXISTS idx_shipments_poll_queue
  ON public.shipments (last_checked_at NULLS FIRST)
  WHERE tracking_active AND tracking_provider <> 'manual';
-- One row per tracking number per org. Re-registering the same number would
-- double-count its 'shipped' quantities.
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_tracking_unique
  ON public.shipments (organization_id, carrier_code, tracking_number)
  WHERE tracking_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_pro_unique
  ON public.shipments (organization_id, carrier_code, pro_number)
  WHERE pro_number IS NOT NULL;

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view shipments" ON public.shipments;
CREATE POLICY "Members can view shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert shipments" ON public.shipments;
CREATE POLICY "Members can insert shipments"
  ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update shipments" ON public.shipments;
CREATE POLICY "Members can update shipments"
  ON public.shipments FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Same reasoning as receipts: a shipment record is evidence in a freight claim.
DROP POLICY IF EXISTS "Admin can delete shipments" ON public.shipments;
CREATE POLICY "Admin can delete shipments"
  ON public.shipments FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_shipments_updated_at ON public.shipments;
CREATE TRIGGER set_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- shipment_lines
-- ============================================================================
-- What the vendor says is on the truck. A claim, not an observation -- it comes
-- off an ASN or a packing list and is wrong often enough that receiving counts
-- everything again anyway. Recorded because a partial shipment against a
-- 400-line order is unreadable without it.
CREATE TABLE IF NOT EXISTS public.shipment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  order_line_id uuid NOT NULL REFERENCES public.order_lines(id) ON DELETE RESTRICT,

  quantity_shipped numeric NOT NULL CHECK (quantity_shipped > 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shipment_lines_one_per_line UNIQUE (shipment_id, order_line_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_lines_shipment
  ON public.shipment_lines (shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_order_line
  ON public.shipment_lines (order_line_id);

ALTER TABLE public.shipment_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view shipment lines" ON public.shipment_lines;
CREATE POLICY "Members can view shipment lines"
  ON public.shipment_lines FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert shipment lines" ON public.shipment_lines;
CREATE POLICY "Members can insert shipment lines"
  ON public.shipment_lines FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update shipment lines" ON public.shipment_lines;
CREATE POLICY "Members can update shipment lines"
  ON public.shipment_lines FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Admin can delete shipment lines" ON public.shipment_lines;
CREATE POLICY "Admin can delete shipment lines"
  ON public.shipment_lines FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_shipment_lines_updated_at ON public.shipment_lines;
CREATE TRIGGER set_shipment_lines_updated_at
  BEFORE UPDATE ON public.shipment_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- shipment_tracking_events  (carrier scans)
-- ============================================================================
-- The scan history, exactly as the carrier reported it. Append-only and never
-- edited: this is the record a freight claim is argued from, and the moment
-- someone can tidy it up it stops being evidence.
--
-- `checkpoint_key` exists because providers re-send the whole scan history on
-- every poll. Without a dedup key a shipment polled hourly for three weeks
-- accumulates five hundred copies of the same pickup scan.
CREATE TABLE IF NOT EXISTS public.shipment_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL,
  status text,
  message text,
  location text,

  -- Stable identity for one scan: status + timestamp + location, hashed by the
  -- caller. Uniqueness is what makes a re-poll idempotent.
  checkpoint_key text NOT NULL,

  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT shipment_tracking_events_unique UNIQUE (shipment_id, checkpoint_key)
);

CREATE INDEX IF NOT EXISTS idx_shipment_tracking_events_shipment
  ON public.shipment_tracking_events (shipment_id, occurred_at DESC);

ALTER TABLE public.shipment_tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view tracking events" ON public.shipment_tracking_events;
CREATE POLICY "Members can view tracking events"
  ON public.shipment_tracking_events FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

-- Carrier scans are written by the tracking functions under the service role.
-- No INSERT, UPDATE, or DELETE policy for authenticated users: a scan history
-- a dealer can edit is worth nothing in a claim.

-- ============================================================================
-- receipts.shipment_id
-- ============================================================================
-- Closes the loop. A delivery recorded against the shipment that carried it is
-- what lets "the carrier says delivered" and "we counted it" be compared --
-- which is the whole point of tracking a shipment rather than just watching it.
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS shipment_id uuid REFERENCES public.shipments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_receipts_shipment
  ON public.receipts (shipment_id) WHERE shipment_id IS NOT NULL;

-- ============================================================================
-- create_shipment_with_lines
-- ============================================================================
-- One call, for the same reason receiving uses one: a shipment whose lines
-- exist but whose 'shipped' events do not leaves that product looking as though
-- it never left the factory, and the next status report tells the customer to
-- keep waiting for something already on a truck.
--
-- SECURITY INVOKER, so RLS applies.
CREATE OR REPLACE FUNCTION public.create_shipment_with_lines(
  p_shipment jsonb,
  p_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_shipment_id uuid;
  v_org_id uuid := (p_shipment->>'organization_id')::uuid;
  v_line_count integer;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  INSERT INTO public.shipments (
    organization_id, sales_order_id, vendor_po_id,
    carrier_code, carrier_name, tracking_number, pro_number, bill_of_lading,
    service_level, ship_date, estimated_delivery_date,
    piece_count, weight_lbs, tracking_provider, notes, created_by
  )
  VALUES (
    v_org_id,
    (p_shipment->>'sales_order_id')::uuid,
    NULLIF(p_shipment->>'vendor_po_id', '')::uuid,
    NULLIF(btrim(COALESCE(p_shipment->>'carrier_code', '')), ''),
    NULLIF(btrim(COALESCE(p_shipment->>'carrier_name', '')), ''),
    NULLIF(btrim(COALESCE(p_shipment->>'tracking_number', '')), ''),
    NULLIF(btrim(COALESCE(p_shipment->>'pro_number', '')), ''),
    NULLIF(btrim(COALESCE(p_shipment->>'bill_of_lading', '')), ''),
    NULLIF(btrim(COALESCE(p_shipment->>'service_level', '')), ''),
    NULLIF(p_shipment->>'ship_date', '')::date,
    NULLIF(p_shipment->>'estimated_delivery_date', '')::date,
    NULLIF(p_shipment->>'piece_count', '')::integer,
    NULLIF(p_shipment->>'weight_lbs', '')::numeric,
    COALESCE(NULLIF(p_shipment->>'tracking_provider', ''), 'manual'),
    NULLIF(p_shipment->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_shipment_id;

  IF jsonb_typeof(p_lines) = 'array' AND jsonb_array_length(p_lines) > 0 THEN
    INSERT INTO public.shipment_lines (
      organization_id, shipment_id, order_line_id, quantity_shipped, notes
    )
    SELECT
      v_org_id,
      v_shipment_id,
      ol.id,
      (t.l->>'quantity_shipped')::numeric,
      NULLIF(t.l->>'notes', '')
    FROM jsonb_array_elements(p_lines) AS t(l)
    JOIN public.order_lines ol ON ol.id = (t.l->>'order_line_id')::uuid
    WHERE COALESCE((t.l->>'quantity_shipped')::numeric, 0) > 0;

    GET DIAGNOSTICS v_line_count = ROW_COUNT;
    IF v_line_count <> jsonb_array_length(p_lines) THEN
      RAISE EXCEPTION 'One or more order lines could not be found';
    END IF;

    INSERT INTO public.order_line_events (
      organization_id, order_line_id, event_type, quantity,
      reference_type, reference_id, notes, created_by
    )
    SELECT
      v_org_id, sl.order_line_id, 'shipped', sl.quantity_shipped,
      'manual', v_shipment_id, sl.notes, auth.uid()
    FROM public.shipment_lines sl
    WHERE sl.shipment_id = v_shipment_id;
  END IF;

  RETURN v_shipment_id;
END;
$$;

COMMENT ON FUNCTION public.create_shipment_with_lines(jsonb, jsonb) IS
  'Atomically record a shipment, what the vendor says is on it, and the shipped events. Lines are optional: a tracking number with no manifest is still worth watching.';

REVOKE ALL ON FUNCTION public.create_shipment_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_shipment_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_shipment_with_lines(jsonb, jsonb) TO service_role;

-- ============================================================================
-- apply_tracking_update
-- ============================================================================
-- The only writer of observed carrier state. Called by the tracking edge
-- functions under the service role, from a poll or a provider webhook.
--
-- SECURITY DEFINER and service-role-only on purpose. Carrier status is the one
-- thing on a shipment that must not be typeable: the instant a person can set
-- 'Delivered' by hand, "delivered" stops meaning "the carrier scanned it" and
-- the whole record becomes unusable in a claim.
--
-- Idempotent. Webhooks retry, polls overlap, and providers replay their full
-- checkpoint history every time; running this twice with the same payload must
-- change nothing.
CREATE OR REPLACE FUNCTION public.apply_tracking_update(
  p_shipment_id uuid,
  p_update jsonb,
  p_checkpoints jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_previous_status text;
  v_new_status text;
  v_inserted integer := 0;
BEGIN
  SELECT organization_id, tracking_status
    INTO v_org_id, v_previous_status
  FROM public.shipments
  WHERE id = p_shipment_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Shipment % not found', p_shipment_id;
  END IF;

  -- An error report leaves the observed status alone. A failed lookup means we
  -- do not know where the freight is -- not that it stopped moving.
  IF p_update ? 'error' AND NULLIF(p_update->>'error', '') IS NOT NULL THEN
    UPDATE public.shipments
    SET tracking_error  = p_update->>'error',
        last_checked_at = now()
    WHERE id = p_shipment_id;

    RETURN jsonb_build_object(
      'shipment_id', p_shipment_id,
      'status', v_previous_status,
      'status_changed', false,
      'checkpoints_added', 0,
      'error', p_update->>'error'
    );
  END IF;

  v_new_status := COALESCE(NULLIF(p_update->>'tracking_status', ''), v_previous_status);

  UPDATE public.shipments
  SET tracking_status         = v_new_status,
      tracking_status_detail  = COALESCE(NULLIF(p_update->>'tracking_status_detail', ''), tracking_status_detail),
      tracking_location       = COALESCE(NULLIF(p_update->>'tracking_location', ''), tracking_location),
      estimated_delivery_date = COALESCE(NULLIF(p_update->>'estimated_delivery_date', '')::date, estimated_delivery_date),
      ship_date               = COALESCE(ship_date, NULLIF(p_update->>'ship_date', '')::date),
      delivered_at            = COALESCE(NULLIF(p_update->>'delivered_at', '')::timestamptz, delivered_at),
      carrier_code            = COALESCE(carrier_code, NULLIF(p_update->>'carrier_code', '')),
      provider_tracking_id    = COALESCE(NULLIF(p_update->>'provider_tracking_id', ''), provider_tracking_id),
      tracking_provider       = COALESCE(NULLIF(p_update->>'tracking_provider', ''), tracking_provider),
      -- A successful read clears whatever the last failure was.
      tracking_error          = NULL,
      last_checked_at         = now(),
      -- Stop polling numbers that have nothing left to say. Delivered
      -- deliberately does NOT stop it: an exception can still land afterwards,
      -- and that is exactly the one worth hearing about.
      tracking_active         = CASE WHEN v_new_status = 'expired' THEN false ELSE tracking_active END
  WHERE id = p_shipment_id;

  IF jsonb_typeof(p_checkpoints) = 'array' AND jsonb_array_length(p_checkpoints) > 0 THEN
    INSERT INTO public.shipment_tracking_events (
      organization_id, shipment_id, occurred_at, status, message, location, checkpoint_key, raw
    )
    SELECT
      v_org_id,
      p_shipment_id,
      (c->>'occurred_at')::timestamptz,
      NULLIF(c->>'status', ''),
      NULLIF(c->>'message', ''),
      NULLIF(c->>'location', ''),
      c->>'checkpoint_key',
      c->'raw'
    FROM jsonb_array_elements(p_checkpoints) AS t(c)
    WHERE c->>'checkpoint_key' IS NOT NULL
      AND NULLIF(c->>'occurred_at', '') IS NOT NULL
    ON CONFLICT (shipment_id, checkpoint_key) DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'shipment_id', p_shipment_id,
    'status', v_new_status,
    'status_changed', v_new_status IS DISTINCT FROM v_previous_status,
    'previous_status', v_previous_status,
    'checkpoints_added', v_inserted
  );
END;
$$;

COMMENT ON FUNCTION public.apply_tracking_update(uuid, jsonb, jsonb) IS
  'Writes observed carrier state and scan history for one shipment. Service role only -- carrier status must never be typeable. Idempotent: safe to replay a webhook or overlap a poll.';

REVOKE ALL ON FUNCTION public.apply_tracking_update(uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_tracking_update(uuid, jsonb, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_tracking_update(uuid, jsonb, jsonb) TO service_role;

-- ============================================================================
-- shipment_progress
-- ============================================================================
-- What one shipment claims to carry, against what has actually been counted off
-- it. The gap between those two numbers is the question receiving exists to
-- answer, and the reason a carrier's 'Delivered' is not allowed to close a line.
CREATE OR REPLACE VIEW public.shipment_progress
WITH (security_invoker = true) AS
SELECT
  s.id AS shipment_id,
  s.organization_id,
  s.sales_order_id,
  s.vendor_po_id,
  s.tracking_status,
  s.estimated_delivery_date,
  s.delivered_at,
  COALESCE(sl.line_count, 0)   AS line_count,
  COALESCE(sl.qty_shipped, 0)  AS qty_shipped,
  COALESCE(rc.qty_received, 0) AS qty_received,
  COALESCE(rc.qty_damaged, 0)  AS qty_damaged,
  COALESCE(rc.receipt_count, 0) AS receipt_count,
  -- Never negative: a delivery that turns up heavier than the manifest is a
  -- real and common event, not a debt owed in the other direction.
  GREATEST(COALESCE(sl.qty_shipped, 0) - COALESCE(rc.qty_received, 0), 0) AS qty_uncounted,
  -- The flag the receiving screen is built around: the carrier says it landed
  -- and nobody has counted it. Freight claim windows are measured in days.
  (s.tracking_status = 'delivered' AND COALESCE(rc.receipt_count, 0) = 0) AS awaiting_receipt
FROM public.shipments s
LEFT JOIN LATERAL (
  SELECT count(*) AS line_count, sum(quantity_shipped) AS qty_shipped
  FROM public.shipment_lines
  WHERE shipment_id = s.id
) sl ON true
LEFT JOIN LATERAL (
  SELECT
    count(DISTINCT r.id)          AS receipt_count,
    sum(rl.quantity_received)     AS qty_received,
    sum(rl.quantity_damaged)      AS qty_damaged
  FROM public.receipts r
  JOIN public.receipt_lines rl ON rl.receipt_id = r.id
  WHERE r.shipment_id = s.id
) rc ON true;

COMMENT ON VIEW public.shipment_progress IS
  'One shipment: what the manifest claims, what has been counted off it, and whether it landed without anyone counting.';

GRANT SELECT ON public.shipment_progress TO authenticated;
GRANT SELECT ON public.shipment_progress TO service_role;

-- ============================================================================
-- shipments_due_for_tracking
-- ============================================================================
-- Which numbers are worth asking about right now.
--
-- Cadence varies by status because the information does. A shipment sitting at
-- the factory dock will say the same thing for a week; one that is out for
-- delivery changes within the hour and is the one a warehouse needs a person
-- standing by for. Polling everything hourly burns a per-lookup quota on
-- freight nobody is waiting for.
--
-- Delivered shipments keep getting checked for a fortnight, then stop: damage
-- exceptions and re-deliveries land after the delivery scan, and that late
-- exception is the single most expensive thing a dealer can miss.
CREATE OR REPLACE FUNCTION public.shipments_due_for_tracking(p_limit integer DEFAULT 100)
RETURNS TABLE (
  shipment_id uuid,
  organization_id uuid,
  tracking_provider text,
  provider_tracking_id text,
  carrier_code text,
  tracking_number text,
  pro_number text,
  tracking_status text,
  last_checked_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id, s.organization_id, s.tracking_provider, s.provider_tracking_id,
    s.carrier_code, s.tracking_number, s.pro_number, s.tracking_status,
    s.last_checked_at
  FROM public.shipments s
  WHERE s.tracking_active
    AND s.tracking_provider <> 'manual'
    -- Nothing left to learn once the freight has been counted onto the dock.
    AND NOT EXISTS (
      SELECT 1 FROM public.shipment_progress sp
      WHERE sp.shipment_id = s.id
        AND sp.qty_shipped > 0
        AND sp.qty_uncounted = 0
    )
    AND (s.delivered_at IS NULL OR s.delivered_at > now() - interval '14 days')
    AND (
      s.last_checked_at IS NULL
      OR s.last_checked_at < now() - CASE s.tracking_status
           WHEN 'out_for_delivery'     THEN interval '1 hour'
           WHEN 'attempt_failed'       THEN interval '2 hours'
           WHEN 'available_for_pickup' THEN interval '4 hours'
           WHEN 'in_transit'           THEN interval '4 hours'
           WHEN 'exception'            THEN interval '6 hours'
           WHEN 'info_received'        THEN interval '12 hours'
           WHEN 'pending'              THEN interval '12 hours'
           WHEN 'delivered'            THEN interval '24 hours'
           ELSE interval '12 hours'
         END
    )
  ORDER BY s.last_checked_at NULLS FIRST
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
$$;

COMMENT ON FUNCTION public.shipments_due_for_tracking(integer) IS
  'The tracking poller work queue, with a per-status cadence. Service role only.';

REVOKE ALL ON FUNCTION public.shipments_due_for_tracking(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shipments_due_for_tracking(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.shipments_due_for_tracking(integer) TO service_role;

-- ============================================================================
-- create_receipt_with_lines: accept the shipment being counted
-- ============================================================================
-- Same signature, so the existing call site and its grants are untouched. The
-- only change is that a delivery can now name the shipment it came off, which
-- is what lets "the carrier said delivered" and "we counted it" be compared.
CREATE OR REPLACE FUNCTION public.create_receipt_with_lines(
  p_receipt jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_receipt_id uuid;
  v_org_id uuid := (p_receipt->>'organization_id')::uuid;
  v_line_count integer;
BEGIN
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id is required';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'A receipt needs at least one line';
  END IF;

  INSERT INTO public.receipts (
    organization_id, sales_order_id, vendor_po_id, shipment_id, received_date,
    carrier, tracking_number, bill_of_lading, notes, received_by
  )
  VALUES (
    v_org_id,
    (p_receipt->>'sales_order_id')::uuid,
    NULLIF(p_receipt->>'vendor_po_id', '')::uuid,
    NULLIF(p_receipt->>'shipment_id', '')::uuid,
    COALESCE(NULLIF(p_receipt->>'received_date', '')::date, CURRENT_DATE),
    NULLIF(p_receipt->>'carrier', ''),
    NULLIF(p_receipt->>'tracking_number', ''),
    NULLIF(p_receipt->>'bill_of_lading', ''),
    NULLIF(p_receipt->>'notes', ''),
    auth.uid()
  )
  RETURNING id INTO v_receipt_id;

  INSERT INTO public.receipt_lines (
    organization_id, receipt_id, order_line_id,
    quantity_received, quantity_damaged, damage_notes, notes
  )
  SELECT
    v_org_id,
    v_receipt_id,
    ol.id,
    COALESCE((t.l->>'quantity_received')::numeric, 0),
    COALESCE((t.l->>'quantity_damaged')::numeric, 0),
    NULLIF(t.l->>'damage_notes', ''),
    NULLIF(t.l->>'notes', '')
  FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(l, ordinality)
  JOIN public.order_lines ol ON ol.id = (t.l->>'order_line_id')::uuid;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'One or more order lines could not be found';
  END IF;

  INSERT INTO public.order_line_events (
    organization_id, order_line_id, event_type, quantity,
    reference_type, reference_id, notes, created_by
  )
  SELECT
    v_org_id, rl.order_line_id, 'received', rl.quantity_received,
    'receipt', v_receipt_id, rl.notes, auth.uid()
  FROM public.receipt_lines rl
  WHERE rl.receipt_id = v_receipt_id
    AND rl.quantity_received > 0;

  RETURN v_receipt_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_receipt_with_lines(jsonb, jsonb) TO service_role;

-- ============================================================================
-- Scheduled polling
-- ============================================================================
CREATE OR REPLACE FUNCTION public.invoke_refresh_shipment_tracking()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  edge_function_url text;
  service_key text;
  request_id bigint;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  SELECT decrypted_secret INTO edge_function_url
  FROM vault.decrypted_secrets
  WHERE name = 'edge_functions_base_url'
  LIMIT 1;

  IF edge_function_url IS NULL THEN
    RAISE WARNING 'No edge_functions_base_url in vault; tracking refresh not scheduled';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := edge_function_url || '/refresh-shipment-tracking',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body := '{"source": "pg_cron"}'::jsonb
  ) INTO request_id;

  RAISE NOTICE 'Invoked refresh-shipment-tracking, request_id: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to invoke refresh-shipment-tracking: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.invoke_refresh_shipment_tracking() IS
  'Invokes the refresh-shipment-tracking Edge Function. Called hourly by pg_cron; the per-status cadence in shipments_due_for_tracking decides what each run actually asks about.';

-- Hourly, on the hour. The queue function, not this schedule, is what keeps the
-- provider quota from being spent on freight nobody is waiting for.
SELECT cron.unschedule('refresh-shipment-tracking')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-shipment-tracking');

SELECT cron.schedule(
  'refresh-shipment-tracking',
  '5 * * * *',
  $$SELECT public.invoke_refresh_shipment_tracking()$$
);


-- ==========================================================================
-- 20260825100000_apply_spec_revision.sql
-- ==========================================================================

-- Apply a specification revision
--
-- The designer revised the spec after the quote was signed. This applies the
-- differences a human has reviewed, in one call.
--
-- One call because a half-applied revision is worse than none: an order where
-- twelve lines moved and eight did not looks complete, reconciles against
-- neither version of the specification, and nobody can tell which is which.
--
-- Decisions baked in:
--
--   * Lines already on a manufacturer order are NEVER touched here. The caller
--     is expected to have excluded them, and this refuses them again as a
--     backstop -- editing a line the factory has already been told to build
--     destroys the record of what was ordered, and the honest routes are a
--     change order or a cancellation.
--
--   * Removals CANCEL rather than delete. A removed line may already carry
--     fulfillment events, attachments, or a place in someone's memory of the
--     job; erasing the row loses all of it. 'Cancelled' is excluded from every
--     rollup already.
--
--   * Line numbers are NOT resequenced. They are what a factory and a
--     warehouse quote back, and renumbering a live order to close a gap is how
--     two people end up talking about different line 47s.

CREATE OR REPLACE FUNCTION public.apply_spec_revision(
  p_sales_order_id uuid,
  p_updates jsonb DEFAULT '[]'::jsonb,
  p_additions jsonb DEFAULT '[]'::jsonb,
  p_removals jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_next_line integer;
  v_updated integer := 0;
  v_added integer := 0;
  v_removed integer := 0;
  v_refused integer := 0;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.sales_orders WHERE id = p_sales_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  -- Backstop. Anything already ordered is refused regardless of what the
  -- caller asked for.
  WITH ordered AS (
    SELECT ol.id
    FROM public.order_lines ol
    JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
    WHERE ol.sales_order_id = p_sales_order_id
      AND f.qty_ordered > 0
  )
  SELECT count(*) INTO v_refused
  FROM (
    SELECT (u->>'id')::uuid AS id FROM jsonb_array_elements(p_updates) u
    UNION ALL
    SELECT (r->>'id')::uuid FROM jsonb_array_elements(p_removals) r
  ) touched
  WHERE touched.id IN (SELECT id FROM ordered);

  -- Updates: quantity, cost, options, description.
  WITH ordered AS (
    SELECT ol.id
    FROM public.order_lines ol
    JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
    WHERE ol.sales_order_id = p_sales_order_id
      AND f.qty_ordered > 0
  )
  UPDATE public.order_lines ol
     SET quantity = COALESCE((u->>'quantity')::numeric, ol.quantity),
         unit_cost = COALESCE((u->>'unit_cost')::numeric, ol.unit_cost),
         list_price = COALESCE((u->>'list_price')::numeric, ol.list_price),
         dealer_discount_percent =
           COALESCE((u->>'dealer_discount_percent')::numeric, ol.dealer_discount_percent),
         option_string = COALESCE(NULLIF(u->>'option_string', ''), ol.option_string),
         description = COALESCE(NULLIF(u->>'description', ''), ol.description)
    FROM jsonb_array_elements(p_updates) u
   WHERE ol.id = (u->>'id')::uuid
     AND ol.sales_order_id = p_sales_order_id
     AND ol.id NOT IN (SELECT id FROM ordered);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Removals cancel rather than delete.
  WITH ordered AS (
    SELECT ol.id
    FROM public.order_lines ol
    JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
    WHERE ol.sales_order_id = p_sales_order_id
      AND f.qty_ordered > 0
  )
  UPDATE public.order_lines ol
     SET status = 'Cancelled'
    FROM jsonb_array_elements(p_removals) r
   WHERE ol.id = (r->>'id')::uuid
     AND ol.sales_order_id = p_sales_order_id
     AND ol.id NOT IN (SELECT id FROM ordered);
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  -- Additions continue the existing numbering rather than resequencing.
  SELECT COALESCE(max(line_number), 0) INTO v_next_line
    FROM public.order_lines WHERE sales_order_id = p_sales_order_id;

  INSERT INTO public.order_lines (
    organization_id, sales_order_id, line_number, area, spec_phase,
    manufacturer_name, series_name, model_number, description, option_string,
    quantity, fulfillment_type, pricing_mode, list_price,
    dealer_discount_percent, unit_cost, sell_price, source_line_number
  )
  SELECT
    v_org_id,
    p_sales_order_id,
    v_next_line + (t.ordinality)::integer,
    NULLIF(t.a->>'area', ''),
    NULLIF(t.a->>'spec_phase', ''),
    NULLIF(t.a->>'manufacturer_name', ''),
    NULLIF(t.a->>'series_name', ''),
    NULLIF(t.a->>'model_number', ''),
    COALESCE(NULLIF(t.a->>'description', ''), 'Unnamed line'),
    NULLIF(t.a->>'option_string', ''),
    COALESCE((t.a->>'quantity')::numeric, 1),
    COALESCE(NULLIF(t.a->>'fulfillment_type', ''), 'purchase'),
    COALESCE(NULLIF(t.a->>'pricing_mode', ''), 'cost_up'),
    NULLIF(t.a->>'list_price', '')::numeric,
    NULLIF(t.a->>'dealer_discount_percent', '')::numeric,
    COALESCE((t.a->>'unit_cost')::numeric, 0),
    COALESCE((t.a->>'sell_price')::numeric, 0),
    NULLIF(t.a->>'source_line_number', '')::integer
  FROM jsonb_array_elements(p_additions) WITH ORDINALITY AS t(a, ordinality);
  GET DIAGNOSTICS v_added = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'added', v_added,
    'removed', v_removed,
    'refused', v_refused
  );
END;
$$;

COMMENT ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) IS
  'Apply a reviewed specification revision in one call. Lines already on a manufacturer order are refused; removals cancel rather than delete; line numbers are never resequenced.';

REVOKE ALL ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) TO service_role;


-- ==========================================================================
-- 20260825110000_drop_can_view_cost.sql
-- ==========================================================================

-- Drop can_view_cost
--
-- It was written as the gate on buy-side numbers, in anticipation of a role
-- vocabulary (PM, warehouse, installer, AP) and a field app that would give
-- installers logins. Neither is being built: this is an office system, and the
-- install app was cut.
--
-- Nothing ever called it. No RLS policy, no other function, no application
-- code. What made it worth removing rather than leaving dormant is its own
-- COMMENT -- "single source of truth for buy-side visibility" -- which read as
-- an assurance that cost was protected when nothing enforced it. A security
-- boundary that exists only in documentation is worse than none, because it
-- stops anyone looking for the real one.
--
-- If a client portal lands later it will need a different mechanism anyway: a
-- customer is not an organization member, so a membership check cannot serve
-- them. The right shape there is a view exposing sell-side fields only.

DROP FUNCTION IF EXISTS public.can_view_cost(uuid, uuid);


-- ==========================================================================
-- 20260825120000_manual_delivery.sql
-- ==========================================================================

-- Manual delivery, and making "delivered means the carrier said so" real
--
-- Two things, because they are the same thing from opposite sides.
--
-- 1. A shipment on the dealer's own truck or a manufacturer's white-glove agent
--    has nobody to ask. It was recorded, and then it sat at 'pending' forever:
--    'uncounted' -- the alarm this whole spine exists to raise -- keys off
--    tracking_status = 'delivered', so the deliveries a dealer controls most
--    directly were the only ones that could never raise it. Worse, a manual
--    shipment given an ETA went 'late' the day after and stayed late, because
--    nothing could ever move it out.
--
-- 2. apply_tracking_update is service-role-only precisely so that 'delivered'
--    keeps meaning "the carrier scanned it". But the UPDATE policy on shipments
--    is column-blind, so any member could always have written tracking_status
--    straight through PostgREST. The invariant was enforced by a TypeScript
--    type omitting the field -- a convention, not a rule.
--
-- So: close the hole properly, then open exactly one door through it. A person
-- may assert delivery on a carrier that has no API, and nowhere else. Who
-- asserted it is recorded, so a status that came from a human is still
-- distinguishable from one that came from a scan -- which is what makes the
-- record survive a freight claim.

-- ============================================================================
-- Provenance
-- ============================================================================
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS delivery_recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shipments.delivery_recorded_by IS
  'Who asserted delivery by hand. NULL means the status came from the carrier. Structural rather than a note in tracking_status_detail, because "is this a scan or a claim" is a question a claim adjuster asks.';

-- ============================================================================
-- Guard: observed carrier state is not typeable
-- ============================================================================
-- Raised only for the roles a browser actually arrives as. SECURITY DEFINER
-- functions run as the owner and are therefore exempt by construction, which is
-- the point: apply_tracking_update and mark_manual_delivery are the two ways
-- through, and both validate for themselves.
CREATE OR REPLACE FUNCTION public.guard_observed_tracking_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.tracking_status IS DISTINCT FROM OLD.tracking_status
     OR NEW.tracking_status_detail IS DISTINCT FROM OLD.tracking_status_detail
     OR NEW.tracking_location IS DISTINCT FROM OLD.tracking_location
     OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     OR NEW.delivery_recorded_by IS DISTINCT FROM OLD.delivery_recorded_by
     OR NEW.last_checked_at IS DISTINCT FROM OLD.last_checked_at
     OR NEW.tracking_error IS DISTINCT FROM OLD.tracking_error
     OR NEW.provider_tracking_id IS DISTINCT FROM OLD.provider_tracking_id
     OR NEW.tracking_provider IS DISTINCT FROM OLD.tracking_provider
  THEN
    RAISE EXCEPTION
      'Carrier-observed tracking state cannot be edited directly. Use mark_manual_delivery() for a carrier with no tracking service.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_observed_tracking ON public.shipments;
CREATE TRIGGER guard_observed_tracking
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.guard_observed_tracking_columns();

-- ============================================================================
-- mark_manual_delivery
-- ============================================================================
-- The one door. Manual carriers only, membership checked, idempotent, and
-- reversible -- a NULL timestamp undoes a mis-click rather than leaving someone
-- with a delivered shipment that never arrived and no way back.
--
-- Deliberately NOT a general status setter. 'in_transit' and 'out_for_delivery'
-- on an own truck would be a field somebody has to remember to keep current,
-- and a stale status is worse than no status: the attention rules read it as
-- fact. Delivery is a single terminal assertion, made once, by the person who
-- already knows.
CREATE OR REPLACE FUNCTION public.mark_manual_delivery(
  p_shipment_id uuid,
  p_delivered_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_provider text;
  v_previous_status text;
  v_new_status text;
BEGIN
  SELECT organization_id, tracking_provider, tracking_status
    INTO v_org_id, v_provider, v_previous_status
  FROM public.shipments
  WHERE id = p_shipment_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Shipment % not found', p_shipment_id;
  END IF;

  IF NOT public.is_active_member(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  -- The whole reason this function can exist. A shipment with a provider has a
  -- carrier to ask, and its status must keep coming from that carrier.
  IF v_provider <> 'manual' THEN
    RAISE EXCEPTION
      'Delivery on a tracked carrier comes from the carrier, not by hand'
      USING ERRCODE = '42501';
  END IF;

  -- NULL undoes. Back to 'pending', which is where a manual shipment sits for
  -- its whole life anyway -- there is no intermediate state to restore.
  v_new_status := CASE WHEN p_delivered_at IS NULL THEN 'pending' ELSE 'delivered' END;

  UPDATE public.shipments
  SET tracking_status       = v_new_status,
      delivered_at          = p_delivered_at,
      delivery_recorded_by  = CASE WHEN p_delivered_at IS NULL THEN NULL ELSE auth.uid() END
  WHERE id = p_shipment_id;

  RETURN jsonb_build_object(
    'shipment_id', p_shipment_id,
    'status', v_new_status,
    'status_changed', v_new_status IS DISTINCT FROM v_previous_status,
    'delivered_at', p_delivered_at
  );
END;
$$;

COMMENT ON FUNCTION public.mark_manual_delivery(uuid, timestamptz) IS
  'Assert delivery on a carrier with no tracking service (own truck, delivery agent). Manual shipments only; records who asserted it. Pass NULL to undo.';

REVOKE ALL ON FUNCTION public.mark_manual_delivery(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_manual_delivery(uuid, timestamptz) TO authenticated;
