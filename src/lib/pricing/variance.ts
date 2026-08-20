/**
 * Acknowledgment Variance
 *
 * What a manufacturer came back with, against what was ordered. The gap is
 * where dealer margin quietly disappears — a factory acknowledging at a higher
 * price or three weeks late is routine, and catching it before the invoice
 * arrives is the point of the whole back office.
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
  cost_variance: number | null;
  ship_date_slip_days: number | null;
}

export interface VarianceSummary {
  /** Lines a vendor has not answered yet. */
  awaitingAck: number;
  /** Acknowledged lines whose price or date moved. */
  withVariance: number;
  /**
   * Net cost exposure across those lines. A vendor honouring a lower price is
   * real money back, so credits net against overcharges rather than being
   * counted by magnitude.
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
    totalExposure += Number(line.cost_variance ?? 0);
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
    return Math.abs(Number(b.cost_variance ?? 0)) - Math.abs(Number(a.cost_variance ?? 0));
  });
}
