/**
 * Tracking Webhook Edge Function
 *
 * The push channel. A carrier scan reaches the dealer in seconds instead of
 * within the polling window, which is the difference between a warehouse
 * knowing a truck is out for delivery and a warehouse finding out it came.
 *
 * Public by necessity -- the provider will not authenticate as a Supabase user
 * -- so it is guarded by a shared secret carried in the path (`?token=`) and
 * compared in constant time. The endpoint writes only observed carrier state
 * against a shipment id the provider echoes back, so the worst a forged call
 * can do is set a wrong status on a shipment whose id the attacker already
 * knew; it can move no money and read nothing.
 */
//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getTrackingProvider } from '../_shared/tracking/provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Constant time, so the secret cannot be recovered a character at a time. */
const secretsMatch = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

//@ts-ignore
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  //@ts-ignore
  const expected = Deno.env.get('TRACKING_WEBHOOK_SECRET');
  if (!expected) {
    console.error('[tracking-webhook] TRACKING_WEBHOOK_SECRET is not set; refusing all calls');
    return json({ error: 'Not configured' }, 503);
  }

  const url = new URL(req.url);
  const presented = url.searchParams.get('token') ?? req.headers.get('x-tracking-token') ?? '';
  if (!secretsMatch(presented, expected)) return json({ error: 'Not authorized' }, 401);

  const provider = getTrackingProvider();
  if (!provider) return json({ error: 'No tracking provider configured' }, 503);

  try {
    const body = await req.json();
    const parsed = provider.parseWebhook(body);

    // Providers send account, billing, and test events down the same pipe.
    // Acknowledged rather than rejected, so the provider does not start
    // retrying and eventually disable the endpoint.
    if (!parsed) return json({ ok: true, ignored: true });

    //@ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    //@ts-ignore
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);

    // The reference is our own shipment id, echoed back. Where a provider
    // cannot carry one, fall back to the handle it gave us at registration.
    let shipmentId = parsed.reference;

    if (!shipmentId && parsed.providerTrackingId) {
      const { data } = await admin
        .from('shipments')
        .select('id')
        .eq('provider_tracking_id', parsed.providerTrackingId)
        .maybeSingle();
      shipmentId = data?.id ?? null;
    }

    if (!shipmentId) {
      console.warn('[tracking-webhook] Update for an unknown shipment; ignoring');
      return json({ ok: true, ignored: true });
    }

    const { checkpoints, ...update } = parsed.snapshot;
    const { data: result, error } = await admin.rpc('apply_tracking_update', {
      p_shipment_id: shipmentId,
      p_update: update,
      p_checkpoints: checkpoints,
    });

    if (error) {
      console.error('[tracking-webhook] apply failed:', error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, result });
  } catch (error) {
    console.error('[tracking-webhook] failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
