/**
 * Track Shipment Edge Function
 *
 * The interactive half of tracking: register a number with the provider, ask
 * for an update now, or work out which carrier a number belongs to.
 *
 * Two clients on purpose. Reads go through a client carrying the caller's JWT,
 * so RLS decides whether they may see the shipment at all -- an org id in a
 * request body is a claim, not a permission. Only the write of observed carrier
 * state uses the service role, because `apply_tracking_update` is deliberately
 * closed to authenticated users: the moment a person can type 'Delivered', the
 * record stops being evidence.
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTrackingProvider, configuredProviderName } from '../_shared/tracking/provider.ts';
import { normalizeCarrier, isManualCarrier } from '../_shared/tracking/carriers.ts';
import { TrackingError } from '../_shared/tracking/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface RequestBody {
  action: 'register' | 'refresh' | 'detect';
  shipmentId?: string;
  trackingNumber?: string;
}

//@ts-ignore
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    //@ts-ignore
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'Not authenticated' }, 401);

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await asUser.auth.getUser();
    if (userError || !user) return json({ error: 'Not authenticated' }, 401);

    const body: RequestBody = await req.json();
    const provider = getTrackingProvider();

    if (!provider) {
      return json(
        {
          error:
            'No tracking provider is configured. Shipments can still be recorded and updated by hand.',
          code: 'provider_not_configured',
        },
        503
      );
    }

    // ---------------------------------------------------------------
    // detect: which carrier owns this number
    // ---------------------------------------------------------------
    if (body.action === 'detect') {
      const number = body.trackingNumber?.trim();
      if (!number) return json({ error: 'trackingNumber is required' }, 400);

      const carriers = await provider.detect(number);
      return json({ carriers });
    }

    const shipmentId = body.shipmentId;
    if (!shipmentId) return json({ error: 'shipmentId is required' }, 400);

    // RLS is the authorization check. A shipment the caller cannot read simply
    // is not there.
    const { data: shipment, error: readError } = await asUser
      .from('shipments')
      .select(
        'id, organization_id, carrier_code, carrier_name, tracking_number, pro_number, ' +
          'tracking_provider, provider_tracking_id, sales_order_id'
      )
      .eq('id', shipmentId)
      .maybeSingle();

    if (readError) return json({ error: readError.message }, 400);
    if (!shipment) return json({ error: 'Shipment not found' }, 404);

    // The PRO number is what an LTL line's system answers to; the tracking
    // number is what parcel answers to. A shipment has one or the other, and
    // asking with the wrong one gets a confident "no such shipment".
    const number = (shipment.tracking_number || shipment.pro_number || '').trim();
    const carrierCode = normalizeCarrier(shipment.carrier_code || shipment.carrier_name);

    if (isManualCarrier(carrierCode)) {
      return json(
        {
          error: 'This shipment moves on a carrier with nothing to ask. Update it by hand.',
          code: 'manual_carrier',
        },
        400
      );
    }

    if (!number) {
      return json({ error: 'This shipment has no tracking or PRO number', code: 'no_number' }, 400);
    }

    const identity = {
      carrierCode,
      trackingNumber: number,
      title: `Order ${shipment.sales_order_id}`,
      // Echoed back by the provider on every webhook. This is how a push update
      // finds its row without a lookup table.
      reference: shipment.id,
    };

    const admin = createClient(supabaseUrl, serviceKey);

    try {
      let providerTrackingId = shipment.provider_tracking_id as string | null;

      if (body.action === 'register' || !providerTrackingId) {
        const registered = await provider.register(identity);
        providerTrackingId = registered.providerTrackingId || null;

        await admin
          .from('shipments')
          .update({
            provider_tracking_id: providerTrackingId,
            tracking_provider: configuredProviderName(),
            carrier_code: shipment.carrier_code ?? registered.carrierCode ?? carrierCode,
            tracking_active: true,
            tracking_error: null,
          })
          .eq('id', shipment.id);
      }

      const snapshot = await provider.fetch(identity, providerTrackingId);
      const { checkpoints, ...update } = snapshot;

      const { data: result, error: applyError } = await admin.rpc('apply_tracking_update', {
        p_shipment_id: shipment.id,
        p_update: update,
        p_checkpoints: checkpoints,
      });

      if (applyError) throw new Error(applyError.message);

      return json({ ok: true, result });
    } catch (error) {
      // A failed lookup is recorded on the row rather than only logged. A
      // shipment nobody could reach reads as "no news" otherwise, which is the
      // most expensive way to be wrong about freight.
      const message = error instanceof Error ? error.message : 'Tracking lookup failed';
      await admin.rpc('apply_tracking_update', {
        p_shipment_id: shipment.id,
        p_update: { error: message },
        p_checkpoints: [],
      });

      console.error('[track-shipment] lookup failed:', message);
      return json(
        { error: message, retryable: error instanceof TrackingError ? error.retryable : false },
        502
      );
    }
  } catch (error) {
    console.error('[track-shipment] failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
