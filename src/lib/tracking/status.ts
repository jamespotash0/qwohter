/**
 * Tracking presentation and attention rules.
 *
 * Pure, and separate from the components, because the interesting question a
 * tracking screen answers is not "what does the carrier say" but "which of
 * these forty shipments does somebody have to do something about today". That
 * judgement is worth testing, and it is the same judgement on the order page,
 * the dashboard tile, and the eventual notification.
 *
 * The carrier vocabulary here mirrors the `shipments.tracking_status` check
 * constraint. Provider-specific statuses never reach the client -- the edge
 * function adapters map them before anything is stored.
 */

export type TrackingStatus =
  | 'pending'
  | 'info_received'
  | 'in_transit'
  | 'out_for_delivery'
  | 'available_for_pickup'
  | 'attempt_failed'
  | 'delivered'
  | 'exception'
  | 'expired'
  | 'unknown';

export type TrackingTone = 'neutral' | 'moving' | 'imminent' | 'landed' | 'trouble';

/**
 * Wording chosen from the warehouse's point of view rather than the carrier's.
 * "Delivered" is the carrier's word and it stays, but it means the truck
 * stopped -- the screen says "not counted yet" alongside it, because a job that
 * reads complete before anyone opened a box is the failure this whole spine
 * exists to prevent.
 */
export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  pending: 'Awaiting first scan',
  info_received: 'Booked, not picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  available_for_pickup: 'Ready for pickup',
  attempt_failed: 'Delivery attempted',
  delivered: 'Delivered',
  exception: 'Exception',
  expired: 'No longer tracked',
  unknown: 'Unknown',
};

export const TRACKING_STATUS_TONES: Record<TrackingStatus, TrackingTone> = {
  pending: 'neutral',
  info_received: 'neutral',
  in_transit: 'moving',
  out_for_delivery: 'imminent',
  available_for_pickup: 'imminent',
  attempt_failed: 'trouble',
  delivered: 'landed',
  exception: 'trouble',
  expired: 'neutral',
  unknown: 'neutral',
};

export const TONE_STYLES: Record<TrackingTone, string> = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  moving: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  imminent: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  landed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  trouble: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

/** Carriers with nobody to ask. Mirrors MANUAL_CARRIERS in the edge functions. */
export const MANUAL_CARRIER_CODES = ['own-truck', 'delivery-agent'] as const;

/**
 * The dropdown list.
 *
 * A short curated list rather than the provider's full thousand-carrier
 * catalogue: these are what contract furniture actually moves on, and the free
 * text field beside it plus carrier detection handles everything else. The
 * authoritative normalization lives server-side in
 * `supabase/functions/_shared/tracking/carriers.ts`; this is the picker, and it
 * is allowed to be shorter than that table.
 */
export const CARRIER_OPTIONS: Array<{ code: string; name: string; group: 'Parcel' | 'Freight' | 'Direct' }> = [
  { code: 'fedex', name: 'FedEx', group: 'Parcel' },
  { code: 'ups', name: 'UPS', group: 'Parcel' },
  { code: 'usps', name: 'USPS', group: 'Parcel' },
  { code: 'dhl-express', name: 'DHL Express', group: 'Parcel' },
  { code: 'ontrac', name: 'OnTrac', group: 'Parcel' },
  { code: 'estes-express', name: 'Estes Express Lines', group: 'Freight' },
  { code: 'old-dominion-freight', name: 'Old Dominion (ODFL)', group: 'Freight' },
  { code: 'xpo-logistics', name: 'XPO Logistics', group: 'Freight' },
  { code: 'saia-freight', name: 'Saia LTL Freight', group: 'Freight' },
  { code: 'rl-carriers', name: 'R+L Carriers', group: 'Freight' },
  { code: 'abf-freight', name: 'ABF Freight', group: 'Freight' },
  { code: 'fedex-freight', name: 'FedEx Freight', group: 'Freight' },
  { code: 'tforce-freight', name: 'TForce Freight', group: 'Freight' },
  { code: 'southeastern-freight-lines', name: 'Southeastern Freight Lines', group: 'Freight' },
  { code: 'averitt-express', name: 'Averitt Express', group: 'Freight' },
  { code: 'dayton-freight', name: 'Dayton Freight Lines', group: 'Freight' },
  { code: 'pitt-ohio', name: 'PITT OHIO', group: 'Freight' },
  { code: 'daylight-transport', name: 'Daylight Transport', group: 'Freight' },
  { code: 'own-truck', name: 'Our own truck', group: 'Direct' },
  { code: 'delivery-agent', name: 'Delivery / white-glove agent', group: 'Direct' },
];

export const isManualCarrierCode = (code: string | null | undefined): boolean =>
  !!code && (MANUAL_CARRIER_CODES as readonly string[]).includes(code);

export const carrierName = (code: string | null | undefined, fallback?: string | null): string =>
  CARRIER_OPTIONS.find(c => c.code === code)?.name ?? fallback ?? code ?? 'Unknown carrier';

/** What is wrong with a shipment, worst first. Null means nothing to do. */
export type TrackingAttention = 'exception' | 'uncounted' | 'late' | 'unreachable';

export const ATTENTION_COPY: Record<TrackingAttention, { label: string; detail: string }> = {
  exception: {
    label: 'Exception',
    detail: 'The carrier has flagged this shipment. Freight claim windows are short.',
  },
  uncounted: {
    label: 'Landed, not counted',
    detail: 'The carrier says it was delivered and nobody has recorded a receipt against it.',
  },
  late: {
    label: 'Past its ETA',
    detail: 'The estimated delivery date has passed and the carrier has not reported delivery.',
  },
  unreachable: {
    label: 'Could not be tracked',
    detail: 'The last lookup failed, so this status is not news — it is the absence of news.',
  },
};

/** How long an unchecked status may sit before it stops being trustworthy. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface TrackableShipment {
  tracking_status: string;
  tracking_status_detail?: string | null;
  tracking_error?: string | null;
  tracking_active?: boolean | null;
  tracking_provider?: string | null;
  last_checked_at?: string | null;
  estimated_delivery_date?: string | null;
  delivered_at?: string | null;
}

export interface TrackingSummary {
  status: TrackingStatus;
  label: string;
  tone: TrackingTone;
  className: string;
  detail: string | null;
  /** Checked too long ago to be presented as current. */
  isStale: boolean;
  attention: TrackingAttention | null;
}

const asStatus = (value: string | null | undefined): TrackingStatus =>
  value && value in TRACKING_STATUS_LABELS ? (value as TrackingStatus) : 'unknown';

/**
 * Everything a badge needs about one shipment.
 *
 * `now` is a parameter rather than a call to `Date.now()` so lateness and
 * staleness — both of which are entirely about the passage of time — can be
 * tested without freezing the clock.
 *
 * `hasReceipt` is asked for explicitly rather than inferred from the shipment,
 * because "delivered and nobody counted it" is the single most valuable thing
 * this function reports and it cannot be derived from carrier data alone.
 */
export function describeTracking(
  shipment: TrackableShipment,
  options: { hasReceipt?: boolean; now?: Date } = {}
): TrackingSummary {
  const now = options.now ?? new Date();
  const status = asStatus(shipment.tracking_status);
  const tone = TRACKING_STATUS_TONES[status];

  const lastChecked = shipment.last_checked_at ? new Date(shipment.last_checked_at) : null;
  const isStale =
    shipment.tracking_provider !== 'manual' &&
    shipment.tracking_active !== false &&
    status !== 'expired' &&
    (!lastChecked || now.getTime() - lastChecked.getTime() > STALE_AFTER_MS);

  // Ordered by what costs the most to miss. A damaged pallet outranks a late
  // one, and a late one outranks a lookup that failed.
  let attention: TrackingAttention | null = null;
  if (status === 'exception' || status === 'attempt_failed') {
    attention = 'exception';
  } else if (status === 'delivered' && options.hasReceipt === false) {
    attention = 'uncounted';
  } else if (
    status !== 'delivered' &&
    shipment.estimated_delivery_date &&
    new Date(`${shipment.estimated_delivery_date}T23:59:59`) < now
  ) {
    attention = 'late';
  } else if (shipment.tracking_error) {
    attention = 'unreachable';
  }

  // "Awaiting first scan" is a lie on an own truck: there is no scan coming,
  // only somebody recording that it arrived.
  const isManual = shipment.tracking_provider === 'manual';
  const label =
    isManual && status === 'pending' ? 'Awaiting delivery' : TRACKING_STATUS_LABELS[status];

  return {
    status,
    label,
    tone,
    className: TONE_STYLES[tone],
    detail: shipment.tracking_status_detail?.trim() ? shipment.tracking_status_detail.trim() : null,
    isStale,
    attention,
  };
}

/** "2 hours ago", for a last-checked timestamp. Empty when never checked. */
export function describeLastChecked(
  lastCheckedAt: string | null | undefined,
  now: Date = new Date()
): string {
  if (!lastCheckedAt) return 'never checked';

  const then = new Date(lastCheckedAt);
  if (Number.isNaN(then.getTime())) return 'never checked';

  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
  if (minutes < 2) return 'checked just now';
  if (minutes < 60) return `checked ${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `checked ${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  return `checked ${days} day${days === 1 ? '' : 's'} ago`;
}
