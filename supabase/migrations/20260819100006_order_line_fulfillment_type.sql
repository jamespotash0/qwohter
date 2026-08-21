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
