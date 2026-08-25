/**
 * Acknowledgment ingestion — reading a manufacturer's answer, and deciding
 * which ordered line each part of it belongs to.
 */

export {
  matchAcknowledgment,
  needsReview,
  normalizeModel,
  type AckRow,
  type MatchTarget,
  type AckMatch,
  type AckMatchResult,
  type MatchConfidence,
} from './match';

export {
  guessAckMapping,
  canMatchOn,
  normalizeShipDate,
  rowsToAckRows,
  type AckField,
  type AckMapping,
} from './parse';

export {
  ingestAcknowledgmentFile,
  type AckEntries,
  type AckIngestResult,
} from './ingest';
