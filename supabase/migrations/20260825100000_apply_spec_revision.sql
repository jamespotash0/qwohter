-- Apply a specification revision
--
-- The designer revised the spec after the quote was signed. This applies the
-- differences a human has reviewed, in one call.
--
-- One call because a half-applied revision is worse than none: an order where
-- twelve lines moved and eight did not looks complete, reconciles against
-- neither version of the specification, and nobody can tell which is which.
--
-- Decisions baked in:
--
--   * Lines already on a manufacturer order are NEVER touched here. The caller
--     is expected to have excluded them, and this refuses them again as a
--     backstop -- editing a line the factory has already been told to build
--     destroys the record of what was ordered, and the honest routes are a
--     change order or a cancellation.
--
--   * Removals CANCEL rather than delete. A removed line may already carry
--     fulfillment events, attachments, or a place in someone's memory of the
--     job; erasing the row loses all of it. 'Cancelled' is excluded from every
--     rollup already.
--
--   * Line numbers are NOT resequenced. They are what a factory and a
--     warehouse quote back, and renumbering a live order to close a gap is how
--     two people end up talking about different line 47s.

CREATE OR REPLACE FUNCTION public.apply_spec_revision(
  p_sales_order_id uuid,
  p_updates jsonb DEFAULT '[]'::jsonb,
  p_additions jsonb DEFAULT '[]'::jsonb,
  p_removals jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_next_line integer;
  v_updated integer := 0;
  v_added integer := 0;
  v_removed integer := 0;
  v_refused integer := 0;
BEGIN
  SELECT organization_id INTO v_org_id
    FROM public.sales_orders WHERE id = p_sales_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  -- Backstop. Anything already ordered is refused regardless of what the
  -- caller asked for.
  WITH ordered AS (
    SELECT ol.id
    FROM public.order_lines ol
    JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
    WHERE ol.sales_order_id = p_sales_order_id
      AND f.qty_ordered > 0
  )
  SELECT count(*) INTO v_refused
  FROM (
    SELECT (u->>'id')::uuid AS id FROM jsonb_array_elements(p_updates) u
    UNION ALL
    SELECT (r->>'id')::uuid FROM jsonb_array_elements(p_removals) r
  ) touched
  WHERE touched.id IN (SELECT id FROM ordered);

  -- Updates: quantity, cost, options, description.
  WITH ordered AS (
    SELECT ol.id
    FROM public.order_lines ol
    JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
    WHERE ol.sales_order_id = p_sales_order_id
      AND f.qty_ordered > 0
  )
  UPDATE public.order_lines ol
     SET quantity = COALESCE((u->>'quantity')::numeric, ol.quantity),
         unit_cost = COALESCE((u->>'unit_cost')::numeric, ol.unit_cost),
         list_price = COALESCE((u->>'list_price')::numeric, ol.list_price),
         dealer_discount_percent =
           COALESCE((u->>'dealer_discount_percent')::numeric, ol.dealer_discount_percent),
         option_string = COALESCE(NULLIF(u->>'option_string', ''), ol.option_string),
         description = COALESCE(NULLIF(u->>'description', ''), ol.description)
    FROM jsonb_array_elements(p_updates) u
   WHERE ol.id = (u->>'id')::uuid
     AND ol.sales_order_id = p_sales_order_id
     AND ol.id NOT IN (SELECT id FROM ordered);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Removals cancel rather than delete.
  WITH ordered AS (
    SELECT ol.id
    FROM public.order_lines ol
    JOIN public.order_line_fulfillment f ON f.order_line_id = ol.id
    WHERE ol.sales_order_id = p_sales_order_id
      AND f.qty_ordered > 0
  )
  UPDATE public.order_lines ol
     SET status = 'Cancelled'
    FROM jsonb_array_elements(p_removals) r
   WHERE ol.id = (r->>'id')::uuid
     AND ol.sales_order_id = p_sales_order_id
     AND ol.id NOT IN (SELECT id FROM ordered);
  GET DIAGNOSTICS v_removed = ROW_COUNT;

  -- Additions continue the existing numbering rather than resequencing.
  SELECT COALESCE(max(line_number), 0) INTO v_next_line
    FROM public.order_lines WHERE sales_order_id = p_sales_order_id;

  INSERT INTO public.order_lines (
    organization_id, sales_order_id, line_number, area, spec_phase,
    manufacturer_name, series_name, model_number, description, option_string,
    quantity, fulfillment_type, pricing_mode, list_price,
    dealer_discount_percent, unit_cost, sell_price, source_line_number
  )
  SELECT
    v_org_id,
    p_sales_order_id,
    v_next_line + (t.ordinality)::integer,
    NULLIF(t.a->>'area', ''),
    NULLIF(t.a->>'spec_phase', ''),
    NULLIF(t.a->>'manufacturer_name', ''),
    NULLIF(t.a->>'series_name', ''),
    NULLIF(t.a->>'model_number', ''),
    COALESCE(NULLIF(t.a->>'description', ''), 'Unnamed line'),
    NULLIF(t.a->>'option_string', ''),
    COALESCE((t.a->>'quantity')::numeric, 1),
    COALESCE(NULLIF(t.a->>'fulfillment_type', ''), 'purchase'),
    COALESCE(NULLIF(t.a->>'pricing_mode', ''), 'cost_up'),
    NULLIF(t.a->>'list_price', '')::numeric,
    NULLIF(t.a->>'dealer_discount_percent', '')::numeric,
    COALESCE((t.a->>'unit_cost')::numeric, 0),
    COALESCE((t.a->>'sell_price')::numeric, 0),
    NULLIF(t.a->>'source_line_number', '')::integer
  FROM jsonb_array_elements(p_additions) WITH ORDINALITY AS t(a, ordinality);
  GET DIAGNOSTICS v_added = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'added', v_added,
    'removed', v_removed,
    'refused', v_refused
  );
END;
$$;

COMMENT ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) IS
  'Apply a reviewed specification revision in one call. Lines already on a manufacturer order are refused; removals cancel rather than delete; line numbers are never resequenced.';

REVOKE ALL ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_spec_revision(uuid, jsonb, jsonb, jsonb) TO service_role;
