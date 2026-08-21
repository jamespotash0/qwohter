/**
 * Observed Discount Rates
 *
 * A dealer's discount off a manufacturer's list price is not reference data
 * anyone should be asked to type in. Project pricing is negotiated per job with
 * the rep, promos move quarterly, and program tiers change -- a standing
 * schedule is wrong within a quarter, and a stale one is worse than none
 * because it silently disagrees with the quote the customer signed.
 *
 * It is also already in the data. Every imported line carries a list price and
 * a cost, and the discount is the gap between them. So it gets READ rather than
 * asked for: zero data entry, and a rate that cannot go stale because it is a
 * record of what actually happened.
 *
 * What that buys beyond convenience is the quote-stage version of the
 * acknowledgment check: "every Steelcase Series 1 line for two years landed
 * between 54% and 56% off, this one came in at 48%" catches a bad export or a
 * rep quoting off the wrong schedule BEFORE it becomes a signed quote.
 *
 * Pure functions. The aggregation itself happens in the
 * observed_vendor_discounts view; this interprets it.
 */

/** One row of public.observed_vendor_discounts. */
export interface ObservedRate {
  manufacturerName: string;
  seriesName: string | null;
  contractVehicle: string | null;
  /** Blended rate achieved, weighted by extended list value. */
  discountPercent: number;
  /** The envelope of per-line rates seen in this group. */
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
 * Whether a line's discount falls outside everything previously seen from this
 * manufacturer.
 *
 * Compared against the observed MIN/MAX envelope rather than the mean: real
 * pricing legitimately varies across a series, and flagging every line that
 * differs from average would flag most of them. A line is only interesting when
 * it is outside the whole range history has ever produced.
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
