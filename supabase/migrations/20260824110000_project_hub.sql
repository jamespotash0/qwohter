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
