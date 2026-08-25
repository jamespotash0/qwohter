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
