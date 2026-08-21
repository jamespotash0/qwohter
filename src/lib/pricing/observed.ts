/**
 * Observed Discount Rates
 *
 * A dealer's discount off list is not reference data anyone should type in.
 * Project pricing is negotiated per job with the rep, promos move quarterly,
 * and program tiers change -- a standing schedule is wrong within a quarter,
 * and a stale one is worse than none because it silently disagrees with the
 * quote the customer signed.
 *
 * There are THREE cost numbers in a furniture job, and only the last is
 * evidence:
 *
 *   1. ASSUMED   list x the multiplier configured in Giza / CET / 2020.
 *   2. ACTUAL    what the manufacturer's portal priced it at on placement.
 *   3. FINAL     what the acknowledgment, then the invoice, says.
 *
 * The quote is built on (1). Margin is decided by (3). So rates are observed
 * from ACKNOWLEDGED cost -- inferring them from quoted cost would be circular,
 * reading back the dealer's own configured multiplier and reporting it as an
 * observation, most confidently in exactly the case where it had gone stale.
 *
 * What that buys is a standing, systemic finding rather than a per-line
 * curiosity:
 *
 *   "Your specification tool assumes 55% off Steelcase Series 1. The last 14
 *    acknowledged lines came in at 48%. Every quote you write is 7 points
 *    optimistic."
 *
 * Pure functions. The aggregation happens in the observed_vendor_discounts
 * view; this interprets it.
 */

/** One row of public.observed_vendor_discounts. */
export interface ObservedRate {
  manufacturerName: string;
  seriesName: string | null;
  contractVehicle: string | null;
  /**
   * The rate manufacturers actually ACKNOWLEDGED, weighted by extended list
   * value. This is the evidence.
   */
  discountPercent: number;
  /**
   * The rate the quote was built on over the same lines -- the specification
   * tool's configured multiplier. This is the assumption.
   */
  assumedDiscountPercent?: number | null;
  /**
   * assumed − acknowledged, in percentage points. Positive means the
   * specification tool is OPTIMISTIC: it assumes a bigger discount than is
   * actually being given, so quoted cost runs under real cost and margin is
   * being quoted away on every job.
   */
  driftPercent?: number | null;
  /** The envelope of acknowledged per-line rates in this group. */
  minDiscountPercent: number;
  maxDiscountPercent: number;
  lineCount: number;
  lastSeenAt: string | null;
}

export interface ObservedRateQuery {
  manufacturerName?: string | null;
  seriesName?: string | null;
  contractVehicle?: string | null;
}

/** Normalized form for comparing text that arrived from a specification export. */
const norm = (value: string | null | undefined): string | null => {
  const t = value?.trim().toLowerCase();
  if (t === undefined || t.length === 0) return null;
  return t;
};

/**
 * The discount a line was actually bought at, or null when it cannot be
 * inferred.
 *
 * Null is a real answer and must not be coerced to zero: a line with no list
 * price (labor, freight, a pass-through cost) has no discount, which is a
 * different statement from "bought at list".
 */
export const lineDiscountPercent = (
  listPrice: number | null | undefined,
  unitCost: number | null | undefined
): number | null => {
  if (listPrice === null || listPrice === undefined || listPrice <= 0) return null;
  if (unitCost === null || unitCost === undefined) return null;
  return Math.round((1 - unitCost / listPrice) * 100 * 100) / 100;
};

/**
 * Rank an observed rate against a query. Lower is more specific; -1 means it
 * does not apply.
 *
 * The manufacturer must always match. An observation about Steelcase says
 * nothing whatsoever about Haworth, so unlike a hand-entered agreement there is
 * no "any manufacturer" tier to fall back to.
 */
const specificity = (rate: ObservedRate, query: ObservedRateQuery): number => {
  if (norm(rate.manufacturerName) !== norm(query.manufacturerName)) return -1;

  const hasSeries = !!norm(rate.seriesName);
  const hasContract = !!norm(rate.contractVehicle);

  if (hasSeries && norm(rate.seriesName) !== norm(query.seriesName)) return -1;
  if (hasContract && norm(rate.contractVehicle) !== norm(query.contractVehicle)) {
    return -1;
  }

  if (hasSeries && hasContract) return 0;
  if (hasSeries) return 1;
  if (hasContract) return 2;
  return 3;
};

/**
 * The most specific observed rate covering a line, or null when this
 * manufacturer has never been bought from before.
 *
 * Ties are broken by the larger sample. Rates come out of a GROUP BY so two
 * rows cannot share a tier for the same query, but a caller may pass in rates
 * assembled from elsewhere and a bigger sample is the better evidence.
 */
export const findObservedRate = (
  rates: ObservedRate[],
  query: ObservedRateQuery
): ObservedRate | null => {
  if (!norm(query.manufacturerName)) return null;

  const candidates = rates
    .map(rate => ({ rate, tier: specificity(rate, query) }))
    .filter(c => c.tier >= 0)
    .sort((a, b) =>
      a.tier !== b.tier ? a.tier - b.tier : b.rate.lineCount - a.rate.lineCount
    );

  return candidates[0]?.rate ?? null;
};

export interface DiscountAnomaly {
  /** What this line came in at. */
  actualPercent: number;
  /** The blended rate history says to expect. */
  expectedPercent: number;
  /** The envelope history has stayed inside until now. */
  observedMinPercent: number;
  observedMaxPercent: number;
  /** How far outside that envelope this line sits, in percentage points. */
  deviationPercent: number;
  /** How much evidence backs the expectation. */
  lineCount: number;
  /**
   * Which way it went. 'worse' means a smaller discount than history, so the
   * line costs more than expected and margin is being quoted away.
   */
  direction: 'worse' | 'better';
}

export interface AnomalyOptions {
  /**
   * Percentage points of slack outside the observed envelope before a line is
   * called anomalous. Rounding and freight-inclusive pricing move rates around
   * by small fractions constantly.
   */
  tolerancePercent?: number;
  /**
   * How many prior lines are needed before history is worth believing. One
   * previous order is a coincidence, not a pattern, and crying wolf off a
   * single observation is how a warning gets trained away.
   */
  minLineCount?: number;
}

/**
 * Whether a line's discount falls outside everything a manufacturer has
 * actually acknowledged for this series.
 *
 * The line being checked carries a QUOTED cost; the envelope comes from
 * ACKNOWLEDGED cost. So this asks the useful question -- "is what we are about
 * to promise the customer consistent with what this factory actually charges" --
 * rather than comparing an assumption against itself.
 *
 * Compared against the MIN/MAX envelope rather than the mean: real pricing
 * legitimately varies across a series, and flagging every line that differs
 * from average would flag most of them. A line is only interesting when it
 * falls outside the whole range history has ever produced.
 */
export const detectDiscountAnomaly = (
  rates: ObservedRate[],
  line: ObservedRateQuery & {
    listPrice?: number | null;
    unitCost?: number | null;
  },
  options: AnomalyOptions = {}
): DiscountAnomaly | null => {
  const { tolerancePercent = 1, minLineCount = 3 } = options;

  const actual = lineDiscountPercent(line.listPrice, line.unitCost);
  if (actual === null) return null;

  const rate = findObservedRate(rates, line);
  if (!rate || rate.lineCount < minLineCount) return null;

  const floor = rate.minDiscountPercent - tolerancePercent;
  const ceiling = rate.maxDiscountPercent + tolerancePercent;

  if (actual >= floor && actual <= ceiling) return null;

  const deviation =
    actual < floor ? rate.minDiscountPercent - actual : actual - rate.maxDiscountPercent;

  return {
    actualPercent: actual,
    expectedPercent: rate.discountPercent,
    observedMinPercent: rate.minDiscountPercent,
    observedMaxPercent: rate.maxDiscountPercent,
    deviationPercent: Math.round(deviation * 100) / 100,
    lineCount: rate.lineCount,
    // A smaller discount is a higher cost, which is the expensive direction.
    direction: actual < floor ? 'worse' : 'better',
  };
};

/**
 * A manufacturer or series whose acknowledged rate has moved away from what the
 * specification tool assumes.
 */
export interface RateDrift {
  manufacturerName: string;
  seriesName: string | null;
  contractVehicle: string | null;
  /** What the quote assumes. */
  assumedPercent: number;
  /** What manufacturers actually acknowledge. */
  acknowledgedPercent: number;
  /** assumed − acknowledged. Positive is the expensive direction. */
  driftPercent: number;
  lineCount: number;
  /**
   * 'optimistic' means every quote against this series under-states cost, which
   * quietly removes margin from jobs nobody has looked at yet.
   */
  direction: 'optimistic' | 'conservative';
}

export interface DriftOptions {
  /**
   * Percentage points of drift before it is worth reporting. Small gaps are
   * normal -- freight-inclusive pricing and rounding move rates constantly.
   */
  thresholdPercent?: number;
  /**
   * How many acknowledged lines are needed before claiming a systemic pattern.
   * Higher than the per-line check on purpose: this asserts something about the
   * dealer's configuration, not about one line.
   */
  minLineCount?: number;
}

/**
 * Manufacturers and series where the discount config has drifted from reality,
 * worst first.
 *
 * This is the finding worth surfacing on its own screen. A single line
 * acknowledged 7 points light is a nuisance; a SERIES that has been running 7
 * points light for a year means every quote written against it was wrong, and
 * the fix is one number in Giza rather than a renegotiation.
 *
 * Rows with no assumed rate are skipped rather than treated as zero drift --
 * absent evidence is not evidence of agreement.
 */
export const findDriftingRates = (
  rates: ObservedRate[],
  options: DriftOptions = {}
): RateDrift[] => {
  const { thresholdPercent = 2, minLineCount = 5 } = options;

  return rates
    .filter(r => {
      if (r.lineCount < minLineCount) return false;
      if (r.assumedDiscountPercent === null || r.assumedDiscountPercent === undefined) {
        return false;
      }
      const drift = r.driftPercent ?? r.assumedDiscountPercent - r.discountPercent;
      return Math.abs(drift) >= thresholdPercent;
    })
    .map(r => {
      const assumed = r.assumedDiscountPercent as number;
      const drift = r.driftPercent ?? assumed - r.discountPercent;
      return {
        manufacturerName: r.manufacturerName,
        seriesName: r.seriesName,
        contractVehicle: r.contractVehicle,
        assumedPercent: assumed,
        acknowledgedPercent: r.discountPercent,
        driftPercent: Math.round(drift * 100) / 100,
        lineCount: r.lineCount,
        direction: drift > 0 ? ('optimistic' as const) : ('conservative' as const),
      };
    })
    .sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));
};
