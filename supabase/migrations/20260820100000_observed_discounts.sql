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
