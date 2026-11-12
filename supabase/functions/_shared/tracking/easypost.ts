/**
 * EasyPost adapter.
 *
 * The alternate, kept because it prices per tracker rather than per month and
 * is the cheaper answer for a dealer watching a handful of shipments. It is a
 * shipping platform first, so its freight coverage is thinner than AfterShip's
 * -- which matters here, since most of what a furniture dealer waits on moves
 * LTL.
 *
 * Selected with TRACKING_PROVIDER=easypost.
 */

import {
  TrackingError,
  type ProviderName,
  type TrackingCheckpoint,
  type TrackingIdentity,
  type TrackingProvider,
  type TrackingSnapshot,
  type TrackingStatus,
} from './types.ts';
import { checkpointKey } from './carriers.ts';

const BASE = 'https://api.easypost.com/v2';

const STATUS_MAP: Record<string, TrackingStatus> = {
  unknown: 'unknown',
  pre_transit: 'info_received',
  in_transit: 'in_transit',
  out_for_delivery: 'out_for_delivery',
  available_for_pickup: 'available_for_pickup',
  delivered: 'delivered',
  return_to_sender: 'exception',
  failure: 'exception',
  cancelled: 'expired',
  canceled: 'expired',
  error: 'exception',
};

/**
 * Our slugs onto EasyPost's carrier names. Only the ones that differ need to be
 * here; anything unmapped is sent through unchanged, and an unrecognized
 * carrier makes EasyPost fall back to its own detection.
 */
const CARRIER_MAP: Record<string, string> = {
  fedex: 'FedEx',
  'fedex-freight': 'FedExSmartPost',
  ups: 'UPS',
  usps: 'USPS',
  'dhl-express': 'DHLExpress',
  dhl: 'DHLGlobalMail',
  ontrac: 'OnTrac',
  'canada-post': 'CanadaPost',
  purolator: 'Purolator',
  'estes-express': 'Estes',
  'old-dominion-freight': 'OldDominion',
  'xpo-logistics': 'XPO',
  'saia-freight': 'Saia',
  'rl-carriers': 'RLCarriers',
  'abf-freight': 'ABFFreight',
};

interface EasyPostTracker {
  id?: string;
  status?: string;
  status_detail?: string;
  carrier?: string;
  est_delivery_date?: string | null;
  tracking_details?: Array<{
    datetime?: string;
    status?: string;
    message?: string;
    tracking_location?: { city?: string; state?: string; country?: string; zip?: string };
  }>;
}

const asDate = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const asTimestamp = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export class EasyPostProvider implements TrackingProvider {
  readonly name: ProviderName = 'easypost';

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new TrackingError('EASYPOST_API_KEY is not configured');
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        // EasyPost takes the key as HTTP basic auth with an empty password.
        Authorization: `Basic ${btoa(`${this.apiKey}:`)}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const text = await res.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new TrackingError(`EasyPost returned a non-JSON response (${res.status})`, res.status >= 500);
    }

    if (!res.ok) {
      const err = payload.error as { message?: string } | undefined;
      throw new TrackingError(
        err?.message ?? `EasyPost request failed (${res.status})`,
        res.status === 429 || res.status >= 500
      );
    }

    return payload as T;
  }

  async register(identity: TrackingIdentity) {
    const carrier = identity.carrierCode ? CARRIER_MAP[identity.carrierCode] ?? identity.carrierCode : undefined;

    const tracker = await this.call<EasyPostTracker>('/trackers', {
      method: 'POST',
      body: JSON.stringify({
        tracker: {
          tracking_code: identity.trackingNumber,
          ...(carrier ? { carrier } : {}),
        },
      }),
    });

    return {
      providerTrackingId: tracker.id ?? '',
      carrierCode: identity.carrierCode ?? null,
    };
  }

  async fetch(identity: TrackingIdentity, providerTrackingId?: string | null): Promise<TrackingSnapshot> {
    // EasyPost has no read-by-number endpoint: a tracker is a resource you
    // create once and then read by id. Without an id the honest move is to
    // create one, which is also what makes register/fetch interchangeable for
    // a caller that lost the handle.
    const tracker = providerTrackingId
      ? await this.call<EasyPostTracker>(`/trackers/${encodeURIComponent(providerTrackingId)}`)
      : await this.call<EasyPostTracker>('/trackers', {
          method: 'POST',
          body: JSON.stringify({
            tracker: {
              tracking_code: identity.trackingNumber,
              ...(identity.carrierCode
                ? { carrier: CARRIER_MAP[identity.carrierCode] ?? identity.carrierCode }
                : {}),
            },
          }),
        });

    return this.toSnapshot(tracker);
  }

  async detect(trackingNumber: string): Promise<string[]> {
    // EasyPost detects on creation rather than through a separate endpoint, so
    // a probe tracker is the only way to ask. Cheap, and the result is reused
    // by the register that follows.
    const tracker = await this.call<EasyPostTracker>('/trackers', {
      method: 'POST',
      body: JSON.stringify({ tracker: { tracking_code: trackingNumber } }),
    });

    if (!tracker.carrier) return [];
    const ours = Object.entries(CARRIER_MAP).find(([, name]) => name === tracker.carrier);
    return [ours?.[0] ?? tracker.carrier.toLowerCase()];
  }

  parseWebhook(body: unknown) {
    const event = body as { description?: string; result?: EasyPostTracker };
    if (!event?.result?.id || !event.description?.startsWith('tracker.')) return null;

    return {
      // EasyPost echoes no reference of ours, so the tracker id is the only
      // handle a push update carries.
      reference: null,
      providerTrackingId: event.result.id,
      snapshot: this.toSnapshot(event.result),
    };
  }

  private toSnapshot(tracker: EasyPostTracker): TrackingSnapshot {
    const checkpoints: TrackingCheckpoint[] = (tracker.tracking_details ?? [])
      .map(d => {
        const occurred = asTimestamp(d.datetime);
        if (!occurred) return null;
        const loc = d.tracking_location;
        const location =
          [loc?.city, loc?.state, loc?.country].filter(Boolean).join(', ') || null;
        const entry = {
          occurred_at: occurred,
          status: d.status ?? null,
          message: d.message ?? null,
          location,
        };
        return { ...entry, checkpoint_key: checkpointKey(entry), raw: d };
      })
      .filter((c): c is TrackingCheckpoint => c !== null);

    const latest = checkpoints[checkpoints.length - 1];
    const status = STATUS_MAP[tracker.status ?? ''] ?? 'unknown';

    return {
      tracking_status: status,
      tracking_status_detail: tracker.status_detail ?? latest?.message ?? null,
      tracking_location: latest?.location ?? null,
      ship_date: checkpoints[0]?.occurred_at?.slice(0, 10) ?? null,
      estimated_delivery_date: asDate(tracker.est_delivery_date),
      delivered_at: status === 'delivered' ? latest?.occurred_at ?? null : null,
      carrier_code: null,
      provider_tracking_id: tracker.id ?? null,
      tracking_provider: 'easypost',
      checkpoints,
    };
  }
}
