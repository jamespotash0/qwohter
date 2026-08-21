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
