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
