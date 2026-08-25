/**
 * Tracking provider contract.
 *
 * Every carrier this platform can see into arrives through one of these. The
 * shape is deliberately the smallest thing the back office needs rather than
 * the union of what providers offer: a normalized status, an ETA, and the scan
 * history. Everything richer -- signature images, proof-of-delivery photos,
 * carbon estimates -- is left in `raw` on the checkpoint, so adopting it later
 * is a read rather than a migration.
 *
 * Providers get acquired, reprice, and drop carriers. Nothing outside this
 * folder knows which one is in use.
 */

/** Our normalized status vocabulary. Matches the shipments.tracking_status check constraint. */
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

export type ProviderName = 'aftership' | 'easypost' | 'manual';

/** One carrier scan, as reported. */
export interface TrackingCheckpoint {
  occurred_at: string;
  status: string | null;
  message: string | null;
  location: string | null;
  /**
   * Stable identity for this scan. Providers replay their whole history on
   * every poll, so without this a shipment watched for three weeks accumulates
   * hundreds of copies of its pickup scan.
   */
  checkpoint_key: string;
  raw: unknown;
}

/** What a provider knows about one shipment right now. */
export interface TrackingSnapshot {
  tracking_status: TrackingStatus;
  tracking_status_detail: string | null;
  tracking_location: string | null;
  ship_date: string | null;
  estimated_delivery_date: string | null;
  delivered_at: string | null;
  carrier_code: string | null;
  provider_tracking_id: string | null;
  tracking_provider: ProviderName;
  checkpoints: TrackingCheckpoint[];
}

export interface TrackingIdentity {
  /** Normalized carrier slug, or null to let the provider detect it. */
  carrierCode: string | null;
  /** Parcel number, or the LTL PRO. Whichever the shipment actually has. */
  trackingNumber: string;
  /** Shown to the provider so its own dashboard is readable by a human. */
  title?: string;
  /** The dealer's reference, echoed back on webhooks. */
  reference?: string;
}

export interface TrackingProvider {
  readonly name: ProviderName;

  /**
   * Ask the provider to start watching a number. Returns its handle for the
   * shipment, so later refreshes are a lookup rather than a search.
   *
   * Must be idempotent: registering a number the provider already watches
   * returns the existing handle instead of throwing.
   */
  register(identity: TrackingIdentity): Promise<{ providerTrackingId: string; carrierCode: string | null }>;

  /** Current state and full scan history. */
  fetch(
    identity: TrackingIdentity,
    providerTrackingId?: string | null
  ): Promise<TrackingSnapshot>;

  /** Which carriers a number could belong to, best guess first. */
  detect(trackingNumber: string): Promise<string[]>;

  /**
   * Turn a provider webhook body into a snapshot plus the reference that says
   * which shipment it belongs to. Returns null when the payload is not a
   * tracking update -- providers send account and billing events down the same
   * pipe.
   */
  parseWebhook(body: unknown): { reference: string | null; providerTrackingId: string | null; snapshot: TrackingSnapshot } | null;
}

/** Raised when a provider answers, but about something we cannot use. */
export class TrackingError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
    this.name = 'TrackingError';
  }
}
