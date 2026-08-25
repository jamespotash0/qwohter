/**
 * Refresh Shipment Tracking Edge Function
 *
 * The poll. Runs hourly under pg_cron and asks the provider about whatever
 * `shipments_due_for_tracking` says is worth asking about -- which is not
 * everything, because a pallet sitting at a factory dock will say the same
 * thing all week while a truck out for delivery changes within the hour.
 *
 * Webhooks are the primary channel where a provider offers them; this exists
 * because webhooks are lost, providers have outages, and a shipment nobody has
 * heard about in three days must not read as a shipment with no news.
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTrackingProvider } from '../_shared/tracking/provider.ts';
import { normalizeCarrier } from '../_shared/tracking/carriers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** One run's ceiling. Keeps a backlog from spending a month's quota at once. */
const BATCH_SIZE = 100;
/** Concurrent lookups. Providers rate limit, and a 429 costs the whole batch. */
const CONCURRENCY = 5;

interface DueShipment {
  shipment_id: string;
  organization_id: string;
  tracking_provider: string;
  provider_tracking_id: string | null;
  carrier_code: string | null;
  tracking_number: string | null;
  pro_number: string | null;
  tracking_status: string;
}

//@ts-ignore
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  //@ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  //@ts-ignore
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // Cron-only. The scheduler presents the service role key; nothing else may
  // spend the tracking quota.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return json({ error: 'Not authorized' }, 401);
  }

  const provider = getTrackingProvider();
  if (!provider) {
    console.log('[refresh-shipment-tracking] No provider configured; nothing to do');
    return json({ ok: true, checked: 0, reason: 'provider_not_configured' });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin.rpc('shipments_due_for_tracking', { p_limit: BATCH_SIZE });
  if (error) {
    console.error('[refresh-shipment-tracking] queue read failed:', error);
    return json({ error: error.message }, 500);
  }

  const due = (data ?? []) as DueShipment[];
  if (due.length === 0) return json({ ok: true, checked: 0 });

  let updated = 0;
  let changed = 0;
  let failed = 0;

  const checkOne = async (shipment: DueShipment) => {
    const number = (shipment.tracking_number || shipment.pro_number || '').trim();
    if (!number) return;

    try {
      const snapshot = await provider.fetch(
        {
          carrierCode: normalizeCarrier(shipment.carrier_code),
          trackingNumber: number,
          reference: shipment.shipment_id,
        },
        shipment.provider_tracking_id
      );

      const { checkpoints, ...update } = snapshot;
      const { data: result, error: applyError } = await admin.rpc('apply_tracking_update', {
        p_shipment_id: shipment.shipment_id,
        p_update: update,
        p_checkpoints: checkpoints,
      });

      if (applyError) throw new Error(applyError.message);

      updated += 1;
      if ((result as { status_changed?: boolean } | null)?.status_changed) changed += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : 'Tracking lookup failed';
      console.error(`[refresh-shipment-tracking] ${shipment.shipment_id}: ${message}`);

      // Recorded on the row, and last_checked_at moves with it -- otherwise a
      // permanently bad number is retried every single run forever.
      await admin.rpc('apply_tracking_update', {
        p_shipment_id: shipment.shipment_id,
        p_update: { error: message },
        p_checkpoints: [],
      });
    }
  };

  for (let i = 0; i < due.length; i += CONCURRENCY) {
    await Promise.all(due.slice(i, i + CONCURRENCY).map(checkOne));
  }

  console.log(
    `[refresh-shipment-tracking] checked ${due.length}, updated ${updated}, changed ${changed}, failed ${failed}`
  );

  return json({ ok: true, checked: due.length, updated, changed, failed });
});
