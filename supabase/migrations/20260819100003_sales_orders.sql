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
--     sale, and it is what vendor_discounts resolution keys off.

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

  -- Drives discount resolution against vendor_discounts.
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

  -- Who this will be bought from. Null until resolved -- an imported line names
  -- a manufacturer as text before it is matched to a vendor account.
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  manufacturer_name text,
  series_id uuid REFERENCES public.product_series(id) ON DELETE SET NULL,
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
-- Supports the PO fan-out: group an order's open lines by vendor.
CREATE INDEX IF NOT EXISTS idx_order_lines_vendor
  ON public.order_lines (vendor_id, status) WHERE vendor_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_lines_number_unique
  ON public.order_lines (sales_order_id, line_number);

ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;

-- Cost columns live on this table, so read access is membership-wide but the
-- application must hide cost from users failing can_view_cost(). Splitting the
-- buy side into its own table would enforce that in the database; that is a
-- deliberate follow-up once the back-office roles exist, because today every
-- role that can read an order can already read a proposal's costs.
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
    vendor_id, manufacturer_name, series_id, series_name,
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
    NULLIF(l->>'vendor_id', '')::uuid,
    NULLIF(l->>'manufacturer_name', ''),
    NULLIF(l->>'series_id', '')::uuid,
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
