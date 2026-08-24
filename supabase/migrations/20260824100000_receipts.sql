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
