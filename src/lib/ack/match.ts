/**
 * Matching an acknowledgment to what was ordered
 *
 * The hard half of ingesting an acknowledgment. Extracting figures from a
 * manufacturer's file is fiddly; deciding *which line each one belongs to* is
 * where the money is, because a cost applied to the wrong line is worse than no
 * cost at all — it reads as confirmed.
 *
 * Manufacturers do not echo a dealer's line numbers. They send their own
 * sequence, they split one ordered line into two when it ships from two plants,
 * they merge duplicates, and they write the model number in a different shape
 * than the specification tool exported. So matching is done on what is actually
 * stable: the model number, normalised hard, then the description, then nothing.
 *
 * Three rules this will not break:
 *
 *   1. A target is claimed at most once. Two ack rows cannot both fill one line.
 *   2. What did not match is reported in BOTH directions. A row on the
 *      acknowledgment with no home, and a line on the order nobody answered,
 *      are different problems and both are invisible if only one is shown.
 *   3. Confidence is returned, never assumed. A weak match is offered for a
 *      human to confirm, not applied.
 */

/** One row read off an acknowledgment, before it is attached to anything. */
export interface AckRow {
  modelNumber: string | null;
  description: string | null;
  quantity: number | null;
  unitCost: number | null;
  shipDate: string | null;
  /** 1-based row in the uploaded file, so a person can go and look at it. */
  sourceRow: number;
}

/** A purchase order line an acknowledgment row might belong to. */
export interface MatchTarget {
  poLineId: string;
  lineNumber: number;
  modelNumber: string | null;
  description: string | null;
  quantity: number;
  unitCost: number;
}

export type MatchConfidence = 'exact' | 'likely' | 'weak';

export interface AckMatch {
  poLineId: string;
  row: AckRow;
  confidence: MatchConfidence;
  /** Shown to the person confirming, so the match can be judged not just seen. */
  reason: string;
}

export interface AckMatchResult {
  matches: AckMatch[];
  /** Rows on the acknowledgment that belong to no line on this order. */
  unmatchedRows: AckRow[];
  /** Lines on the order the acknowledgment never mentioned. */
  unmatchedTargets: MatchTarget[];
}

/**
 * Model numbers are written differently by every tool that touches them:
 * `AN-4830`, `AN4830`, `an 4830`, `AN.4830`. Everything that is not a letter or
 * a digit is noise for the purpose of deciding whether two strings name the
 * same product.
 */
export function normalizeModel(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Case and run-of-space insensitive, for prose rather than part numbers. */
function normalizeText(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Words worth comparing — short ones carry no signal and match everything. */
function tokens(value: string | null | undefined): Set<string> {
  return new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/)
      .filter(word => word.length > 2)
  );
}

/** Proportion of the smaller token set that both share. */
function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/** Below this, two descriptions have nothing meaningful in common. */
const WEAK_OVERLAP_THRESHOLD = 0.6;

interface Candidate {
  target: MatchTarget;
  confidence: MatchConfidence;
  reason: string;
  /** Higher wins. Used only to order candidates for one row. */
  score: number;
}

function candidatesFor(row: AckRow, targets: MatchTarget[]): Candidate[] {
  const rowModel = normalizeModel(row.modelNumber);
  const rowTokens = tokens(row.description);
  const rowDescription = normalizeText(row.description);

  const found: Candidate[] = [];

  for (const target of targets) {
    if (rowModel && normalizeModel(target.modelNumber) === rowModel) {
      // A model number match where the quantity also agrees is as certain as
      // this gets without the manufacturer echoing our line numbers.
      const sameQuantity = row.quantity !== null && row.quantity === target.quantity;
      found.push({
        target,
        confidence: 'exact',
        reason: sameQuantity
          ? `Model ${row.modelNumber} and quantity ${target.quantity} both match`
          : `Model ${row.modelNumber} matches`,
        score: sameQuantity ? 100 : 90,
      });
      continue;
    }

    if (rowDescription && normalizeText(target.description) === rowDescription) {
      found.push({
        target,
        confidence: 'likely',
        reason: 'Description matches exactly',
        score: 70,
      });
      continue;
    }

    const similarity = overlap(rowTokens, tokens(target.description));
    if (similarity >= WEAK_OVERLAP_THRESHOLD) {
      found.push({
        target,
        confidence: 'weak',
        reason: `Description is ${Math.round(similarity * 100)}% similar — check this one`,
        score: 40 * similarity,
      });
    }
  }

  return found.sort((a, b) => b.score - a.score);
}

/**
 * Attach acknowledgment rows to purchase order lines.
 *
 * Best-first across the whole file rather than row by row: a row with an exact
 * model match should claim its line before a different row's weak description
 * match can take it, and processing in file order would let the weak one win by
 * arriving first.
 */
export function matchAcknowledgment(
  rows: AckRow[],
  targets: MatchTarget[]
): AckMatchResult {
  const ranked: { row: AckRow; candidate: Candidate }[] = [];

  for (const row of rows) {
    for (const candidate of candidatesFor(row, targets)) {
      ranked.push({ row, candidate });
    }
  }

  ranked.sort((a, b) => b.candidate.score - a.candidate.score);

  const claimedTargets = new Set<string>();
  const usedRows = new Set<number>();
  const matches: AckMatch[] = [];

  for (const { row, candidate } of ranked) {
    if (usedRows.has(row.sourceRow)) continue;
    if (claimedTargets.has(candidate.target.poLineId)) continue;

    claimedTargets.add(candidate.target.poLineId);
    usedRows.add(row.sourceRow);
    matches.push({
      poLineId: candidate.target.poLineId,
      row,
      confidence: candidate.confidence,
      reason: candidate.reason,
    });
  }

  // Returned in file and line order rather than match order, because that is
  // the order a person reading the two documents side by side expects.
  matches.sort((a, b) => a.row.sourceRow - b.row.sourceRow);

  return {
    matches,
    unmatchedRows: rows.filter(row => !usedRows.has(row.sourceRow)),
    unmatchedTargets: targets.filter(target => !claimedTargets.has(target.poLineId)),
  };
}

/** How many matches need a human to look at them before anything is saved. */
export function needsReview(result: AckMatchResult): number {
  return (
    result.matches.filter(match => match.confidence !== 'exact').length +
    result.unmatchedRows.length
  );
}
