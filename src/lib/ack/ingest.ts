/**
 * From an uploaded acknowledgment to filled-in fields
 *
 * One call: read the file, work out its columns, attach each row to the line it
 * belongs to, and hand back values for the form plus everything a person has to
 * look at before saving.
 *
 * Nothing here writes. The dialog it feeds is still confirmed by a human, and
 * that is deliberate — an acknowledged cost decides whether a job is profitable,
 * and a figure that arrives without anybody agreeing to it is exactly the kind
 * of number that gets discovered at month end.
 *
 * Weak matches are reported but NOT applied. A description that is 60% similar
 * is worth showing somebody; it is not worth quietly writing a cost against.
 */

import { parseSpecFile } from '@/lib/sif/parse';
import { guessAckMapping, canMatchOn, rowsToAckRows } from './parse';
import { matchAcknowledgment, type AckMatch, type AckRow, type MatchTarget } from './match';

/** Form values, keyed by purchase order line id. */
export type AckEntries = Record<string, { quantity: string; unitCost: string }>;

export interface AckIngestResult {
  /** Applied to the form: exact and likely matches only. */
  applied: AckEntries;
  /** The ship date to put on the acknowledgment, or null if the file gave none. */
  shipDate: string | null;
  /** Matches that were applied. */
  appliedCount: number;
  /** Found, but too uncertain to fill in. Shown so somebody can decide. */
  needsCheck: AckMatch[];
  /** Rows on the acknowledgment belonging to no line on this order. */
  unmatchedRows: AckRow[];
  /** Lines on the order the acknowledgment never mentioned. */
  unmatchedTargets: MatchTarget[];
  /** Set when the file could not be used at all. */
  error?: string;
}

const EMPTY: Omit<AckIngestResult, 'error'> = {
  applied: {},
  shipDate: null,
  appliedCount: 0,
  needsCheck: [],
  unmatchedRows: [],
  unmatchedTargets: [],
};

export function ingestAcknowledgmentFile(
  text: string,
  targets: MatchTarget[]
): AckIngestResult {
  const parsed = parseSpecFile(text);

  if (parsed.rows.length === 0) {
    return { ...EMPTY, unmatchedTargets: targets, error: 'That file has no rows.' };
  }

  const mapping = guessAckMapping(parsed.headers);

  if (!canMatchOn(mapping)) {
    return {
      ...EMPTY,
      unmatchedTargets: targets,
      error:
        'No column in that file names a product. An acknowledgment needs a part number or a description to attach each row to a line.',
    };
  }

  const rows = rowsToAckRows(parsed.rows, mapping);
  const result = matchAcknowledgment(rows, targets);

  const applied: AckEntries = {};
  const needsCheck: AckMatch[] = [];
  const appliedShipDates: string[] = [];

  for (const match of result.matches) {
    if (match.confidence === 'weak') {
      needsCheck.push(match);
      continue;
    }

    const target = targets.find(t => t.poLineId === match.poLineId);
    applied[match.poLineId] = {
      // A row that omitted a figure keeps what was ordered, rather than
      // becoming zero — an acknowledgment is usually silent about what did
      // not change.
      quantity: `${match.row.quantity ?? target?.quantity ?? ''}`,
      unitCost: `${match.row.unitCost ?? target?.unitCost ?? ''}`,
    };

    if (match.row.shipDate) appliedShipDates.push(match.row.shipDate);
  }

  return {
    applied,
    // The latest date across the acknowledgment, because that is the one the
    // install is actually gated on — the job is not ready when the first
    // carton ships.
    shipDate:
      appliedShipDates.length > 0
        ? appliedShipDates.reduce((latest, date) => (date > latest ? date : latest))
        : null,
    appliedCount: Object.keys(applied).length,
    needsCheck,
    unmatchedRows: result.unmatchedRows,
    unmatchedTargets: result.unmatchedTargets,
  };
}
