/**
 * AfterShip adapter.
 *
 * Chosen as the default because it is tracking-only. The alternatives are
 * shipping platforms that track as a side effect of selling labels, and a
 * dealer buys almost no labels -- the freight is on the manufacturer's account,
 * moving on an LTL line, under a PRO number nobody here generated. AfterShip
 * covers those freight lines, which is the entire requirement.
 *
 * The API is versioned by URL segment and the version is read from the
 * environment, so a version bump is a config change rather than a deploy.
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

const BASE = 'https://api.aftership.com/tracking';
const DEFAULT_VERSION = '2025-07';

/**
 * AfterShip's tag vocabulary onto ours. `AttemptFail` and `Exception` stay
 * distinct because they mean different things to a warehouse: nobody was on the
 * dock, versus the freight is damaged, refused, or lost.
 */
const TAG_MAP: Record<string, TrackingStatus> = {
  Pending: 'pending',
  InfoReceived: 'info_received',
  InTransit: 'in_transit',
  OutForDelivery: 'out_for_delivery',
  AvailableForPickup: 'available_for_pickup',
  AttemptFail: 'attempt_failed',
  Delivered: 'delivered',
  Exception: 'exception',
  Expired: 'expired',
};

interface AfterShipTracking {
  id?: string;
  tag?: string;
  subtag_message?: string;
  slug?: string;
  shipment_delivery_date?: string | null;
  expected_delivery?: string | null;
  shipment_pickup_date?: string | null;
  order_id?: string | null;
  checkpoints?: Array<{
    checkpoint_time?: string;
    created_at?: string;
    tag?: string;
    message?: string;
    location?: string;
    city?: string;
    state?: string;
    country_iso3?: string;
  }>;
}

const asDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const asTimestamp = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const placeOf = (c: NonNullable<AfterShipTracking['checkpoints']>[number]): string | null =>
  c.location ??
  [c.city, c.state, c.country_iso3].filter(Boolean).join(', ') ??
  null;

export class AfterShipProvider implements TrackingProvider {
  readonly name: ProviderName = 'aftership';

  constructor(
    private readonly apiKey: string,
    private readonly version: string = DEFAULT_VERSION
  ) {
    if (!apiKey) throw new TrackingError('AFTERSHIP_API_KEY is not configured');
  }

  private get root(): string {
    return `${BASE}/${this.version}`;
  }

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.root}${path}`, {
      ...init,
      headers: {
        // The legacy `aftership-api-key` header is not accepted by the
        // versioned API.
        'as-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const text = await res.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new TrackingError(`AfterShip returned a non-JSON response (${res.status})`, res.status >= 500);
    }

    if (!res.ok) {
      const meta = (payload.meta ?? payload) as { message?: string; code?: number };
      // 429 and 5xx are worth another run of the poller. A 400 on a malformed
      // tracking number is not, and retrying it burns quota forever.
      throw new TrackingError(
        meta?.message ?? `AfterShip request failed (${res.status})`,
        res.status === 429 || res.status >= 500
      );
    }

    return (payload.data ?? payload) as T;
  }

  async register(identity: TrackingIdentity) {
    try {
      const data = await this.call<{ id?: string; slug?: string; tracking?: AfterShipTracking }>(
        '/trackings',
        {
          method: 'POST',
          body: JSON.stringify({
            tracking_number: identity.trackingNumber,
            // Omitted entirely when unknown, which is what makes AfterShip
            // detect the carrier itself.
            ...(identity.carrierCode ? { slug: identity.carrierCode } : {}),
            ...(identity.title ? { title: identity.title } : {}),
            // Echoed back on every webhook. How a push update finds its row.
            ...(identity.reference ? { order_id: identity.reference } : {}),
          }),
        }
      );

      const tracking = data.tracking ?? (data as AfterShipTracking);
      return {
        providerTrackingId: tracking.id ?? data.id ?? '',
        carrierCode: tracking.slug ?? identity.carrierCode ?? null,
      };
    } catch (error) {
      // Already watched. Idempotent by contract, so read it back instead.
      if (error instanceof TrackingError && /exist/i.test(error.message)) {
        const snapshot = await this.fetch(identity);
        return {
          providerTrackingId: snapshot.provider_tracking_id ?? '',
          carrierCode: snapshot.carrier_code,
        };
      }
      throw error;
    }
  }

  async fetch(identity: TrackingIdentity, providerTrackingId?: string | null): Promise<TrackingSnapshot> {
    const path = providerTrackingId
      ? `/trackings/${encodeURIComponent(providerTrackingId)}`
      : `/trackings?tracking_numbers=${encodeURIComponent(identity.trackingNumber)}` +
        (identity.carrierCode ? `&slugs=${encodeURIComponent(identity.carrierCode)}` : '');

    const data = await this.call<AfterShipTracking & { trackings?: AfterShipTracking[] }>(path);
    const tracking = data.trackings?.[0] ?? data;

    if (!tracking || (!tracking.tag && !tracking.id)) {
      throw new TrackingError('AfterShip has no record of that number yet', true);
    }

    return this.toSnapshot(tracking);
  }

  async detect(trackingNumber: string): Promise<string[]> {
    const data = await this.call<{ couriers?: Array<{ slug?: string }> }>('/couriers/detect', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });
    return (data.couriers ?? []).map(c => c.slug).filter((s): s is string => !!s);
  }

  parseWebhook(body: unknown) {
    const envelope = body as { msg?: AfterShipTracking; event?: string; data?: { tracking?: AfterShipTracking } };
    const tracking = envelope?.data?.tracking ?? envelope?.msg;
    if (!tracking || (!tracking.tag && !tracking.id)) return null;

    return {
      reference: tracking.order_id ?? null,
      providerTrackingId: tracking.id ?? null,
      snapshot: this.toSnapshot(tracking),
    };
  }

  private toSnapshot(tracking: AfterShipTracking): TrackingSnapshot {
    const checkpoints: TrackingCheckpoint[] = (tracking.checkpoints ?? [])
      .map(c => {
        const occurred = asTimestamp(c.checkpoint_time ?? c.created_at);
        if (!occurred) return null;
        const location = placeOf(c);
        const entry = {
          occurred_at: occurred,
          status: c.tag ?? null,
          message: c.message ?? null,
          location,
        };
        return { ...entry, checkpoint_key: checkpointKey(entry), raw: c };
      })
      .filter((c): c is TrackingCheckpoint => c !== null);

    const latest = checkpoints[checkpoints.length - 1];
    const status = TAG_MAP[tracking.tag ?? ''] ?? 'unknown';

    return {
      tracking_status: status,
      // The carrier's own words. "Delayed by weather in Memphis" is what the
      // customer actually needs, and no enum will ever carry it.
      tracking_status_detail: tracking.subtag_message ?? latest?.message ?? null,
      tracking_location: latest?.location ?? null,
      ship_date: asDate(tracking.shipment_pickup_date),
      estimated_delivery_date: asDate(tracking.expected_delivery),
      delivered_at:
        status === 'delivered'
          ? asTimestamp(tracking.shipment_delivery_date) ?? latest?.occurred_at ?? null
          : null,
      carrier_code: tracking.slug ?? null,
      provider_tracking_id: tracking.id ?? null,
      tracking_provider: 'aftership',
      checkpoints,
    };
  }
}
