/**
 * Acknowledgment Variance
 *
 * What a manufacturer came back with, against the cost the QUOTE was built on.
 * The gap is where dealer margin quietly disappears — a factory acknowledging
 * at a higher price or three weeks late is routine, and catching it before the
 * invoice arrives is the point of the whole back office.
 *
 * The comparison is deliberately against the quoted cost rather than against
 * whatever was recorded as placed. Orders are placed in the manufacturer's own
 * portal, so "did the factory honour our paperwork" is not a question this
 * application is entitled to ask — but "did the cost I quoted survive contact
 * with the real order" is, and it is the one that costs a dealer money.
 *
 * Pure, and structurally typed rather than tied to the database row, so it can
 * be tested and reused over rows that have not been persisted yet.
 */

import { round2 } from './calculate';

/** What kind of attention an acknowledged line needs. */
export type VarianceStatus =
  | 'awaiting_ack'
  | 'match'
  | 'price'
  | 'date'
  | 'price_and_date';

/** The subset of a po_line_variance row that summarizing needs. */
export interface VarianceLine {
  variance_status: string | null;
  /** Acknowledged against the cost the quote was built on. The margin number. */
  quoted_cost_variance?: number | null;
  /** Acknowledged against what was recorded as placed. A data-entry check. */
  cost_variance: number | null;
  ship_date_slip_days: number | null;
}

/**
 * The variance that matters, in dollars.
 *
 * Prefers the quoted comparison and falls back to the recorded one, so a caller
 * holding rows from before the two were distinguished still gets an answer
 * rather than a silent zero.
 */
export const varianceAmount = (line: VarianceLine): number =>
  Number(line.quoted_cost_variance ?? line.cost_variance ?? 0);

export interface VarianceSummary {
  /** Lines the manufacturer has not answered yet. */
  awaitingAck: number;
  /** Acknowledged lines whose price or date moved. */
  withVariance: number;
  /**
   * Net cost exposure across those lines. A manufacturer honouring a lower
   * price is real money back, so credits net against overcharges rather than
   * being counted by magnitude.
   */
  totalExposure: number;
  /** Worst schedule slip in days. Early ship dates do not count as slip. */
  worstSlipDays: number;
}

/**
 * Headline figures for the variance queue: "12 awaiting acknowledgment, 4 with
 * variances totalling $8,400, worst slip 21 days".
 *
 * Matched lines contribute to nothing — they are the healthy majority and
 * including them would bury the exceptions.
 */
export function summarizeVariance(lines: VarianceLine[]): VarianceSummary {
  let awaitingAck = 0;
  let withVariance = 0;
  let totalExposure = 0;
  let worstSlipDays = 0;

  for (const line of lines) {
    if (line.variance_status === 'awaiting_ack') {
      awaitingAck += 1;
      continue;
    }
    if (line.variance_status === 'match') continue;

    withVariance += 1;
    totalExposure += varianceAmount(line);
    worstSlipDays = Math.max(worstSlipDays, Number(line.ship_date_slip_days ?? 0));
  }

  return {
    awaitingAck,
    withVariance,
    totalExposure: round2(totalExposure),
    worstSlipDays,
  };
}

/**
 * Order for the variance queue: lines still awaiting an acknowledgment first
 * (nothing can be done about a price that has not arrived), then by exposure,
 * largest first. Sorted by magnitude here so a large credit is as visible as a
 * large overcharge — both warrant a look.
 */
export function sortVarianceQueue<T extends VarianceLine>(lines: T[]): T[] {
  return [...lines].sort((a, b) => {
    const aAwaiting = a.variance_status === 'awaiting_ack' ? 1 : 0;
    const bAwaiting = b.variance_status === 'awaiting_ack' ? 1 : 0;
    if (aAwaiting !== bAwaiting) return bAwaiting - aAwaiting;
    return Math.abs(varianceAmount(b)) - Math.abs(varianceAmount(a));
  });
}
