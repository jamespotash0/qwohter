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
