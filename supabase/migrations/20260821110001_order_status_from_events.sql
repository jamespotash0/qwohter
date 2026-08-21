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
