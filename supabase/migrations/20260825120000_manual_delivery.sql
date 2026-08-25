-- Manual delivery, and making "delivered means the carrier said so" real
--
-- Two things, because they are the same thing from opposite sides.
--
-- 1. A shipment on the dealer's own truck or a manufacturer's white-glove agent
--    has nobody to ask. It was recorded, and then it sat at 'pending' forever:
--    'uncounted' -- the alarm this whole spine exists to raise -- keys off
--    tracking_status = 'delivered', so the deliveries a dealer controls most
--    directly were the only ones that could never raise it. Worse, a manual
--    shipment given an ETA went 'late' the day after and stayed late, because
--    nothing could ever move it out.
--
-- 2. apply_tracking_update is service-role-only precisely so that 'delivered'
--    keeps meaning "the carrier scanned it". But the UPDATE policy on shipments
--    is column-blind, so any member could always have written tracking_status
--    straight through PostgREST. The invariant was enforced by a TypeScript
--    type omitting the field -- a convention, not a rule.
--
-- So: close the hole properly, then open exactly one door through it. A person
-- may assert delivery on a carrier that has no API, and nowhere else. Who
-- asserted it is recorded, so a status that came from a human is still
-- distinguishable from one that came from a scan -- which is what makes the
-- record survive a freight claim.

-- ============================================================================
-- Provenance
-- ============================================================================
ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS delivery_recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.shipments.delivery_recorded_by IS
  'Who asserted delivery by hand. NULL means the status came from the carrier. Structural rather than a note in tracking_status_detail, because "is this a scan or a claim" is a question a claim adjuster asks.';

-- ============================================================================
-- Guard: observed carrier state is not typeable
-- ============================================================================
-- Raised only for the roles a browser actually arrives as. SECURITY DEFINER
-- functions run as the owner and are therefore exempt by construction, which is
-- the point: apply_tracking_update and mark_manual_delivery are the two ways
-- through, and both validate for themselves.
CREATE OR REPLACE FUNCTION public.guard_observed_tracking_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.tracking_status IS DISTINCT FROM OLD.tracking_status
     OR NEW.tracking_status_detail IS DISTINCT FROM OLD.tracking_status_detail
     OR NEW.tracking_location IS DISTINCT FROM OLD.tracking_location
     OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
     OR NEW.delivery_recorded_by IS DISTINCT FROM OLD.delivery_recorded_by
     OR NEW.last_checked_at IS DISTINCT FROM OLD.last_checked_at
     OR NEW.tracking_error IS DISTINCT FROM OLD.tracking_error
     OR NEW.provider_tracking_id IS DISTINCT FROM OLD.provider_tracking_id
     OR NEW.tracking_provider IS DISTINCT FROM OLD.tracking_provider
  THEN
    RAISE EXCEPTION
      'Carrier-observed tracking state cannot be edited directly. Use mark_manual_delivery() for a carrier with no tracking service.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_observed_tracking ON public.shipments;
CREATE TRIGGER guard_observed_tracking
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.guard_observed_tracking_columns();

-- ============================================================================
-- mark_manual_delivery
-- ============================================================================
-- The one door. Manual carriers only, membership checked, idempotent, and
-- reversible -- a NULL timestamp undoes a mis-click rather than leaving someone
-- with a delivered shipment that never arrived and no way back.
--
-- Deliberately NOT a general status setter. 'in_transit' and 'out_for_delivery'
-- on an own truck would be a field somebody has to remember to keep current,
-- and a stale status is worse than no status: the attention rules read it as
-- fact. Delivery is a single terminal assertion, made once, by the person who
-- already knows.
CREATE OR REPLACE FUNCTION public.mark_manual_delivery(
  p_shipment_id uuid,
  p_delivered_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_provider text;
  v_previous_status text;
  v_new_status text;
BEGIN
  SELECT organization_id, tracking_provider, tracking_status
    INTO v_org_id, v_provider, v_previous_status
  FROM public.shipments
  WHERE id = p_shipment_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Shipment % not found', p_shipment_id;
  END IF;

  IF NOT public.is_active_member(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Not a member of this organization' USING ERRCODE = '42501';
  END IF;

  -- The whole reason this function can exist. A shipment with a provider has a
  -- carrier to ask, and its status must keep coming from that carrier.
  IF v_provider <> 'manual' THEN
    RAISE EXCEPTION
      'Delivery on a tracked carrier comes from the carrier, not by hand'
      USING ERRCODE = '42501';
  END IF;

  -- NULL undoes. Back to 'pending', which is where a manual shipment sits for
  -- its whole life anyway -- there is no intermediate state to restore.
  v_new_status := CASE WHEN p_delivered_at IS NULL THEN 'pending' ELSE 'delivered' END;

  UPDATE public.shipments
  SET tracking_status       = v_new_status,
      delivered_at          = p_delivered_at,
      delivery_recorded_by  = CASE WHEN p_delivered_at IS NULL THEN NULL ELSE auth.uid() END
  WHERE id = p_shipment_id;

  RETURN jsonb_build_object(
    'shipment_id', p_shipment_id,
    'status', v_new_status,
    'status_changed', v_new_status IS DISTINCT FROM v_previous_status,
    'delivered_at', p_delivered_at
  );
END;
$$;

COMMENT ON FUNCTION public.mark_manual_delivery(uuid, timestamptz) IS
  'Assert delivery on a carrier with no tracking service (own truck, delivery agent). Manual shipments only; records who asserted it. Pass NULL to undo.';

REVOKE ALL ON FUNCTION public.mark_manual_delivery(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_manual_delivery(uuid, timestamptz) TO authenticated;
