/**
 * Tracking — carrier status, presentation, and the rules for what needs a human.
 */

export {
  TRACKING_STATUS_LABELS,
  TRACKING_STATUS_TONES,
  TONE_STYLES,
  CARRIER_OPTIONS,
  MANUAL_CARRIER_CODES,
  ATTENTION_COPY,
  isManualCarrierCode,
  carrierName,
  describeTracking,
  describeLastChecked,
} from './status';

export type {
  TrackingStatus,
  TrackingTone,
  TrackingAttention,
  TrackingSummary,
  TrackableShipment,
} from './status';

export {
  summarizeShipment,
  buildShipmentLines,
  canSaveShipment,
} from './manifest';

export type { ShipmentEntry, ShipmentTotals, ShipmentLinePayload } from './manifest';
