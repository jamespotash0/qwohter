/**
 * Discount Resolution
 *
 * A dealer's discount from one manufacturer is never a single number. It varies
 * by product series and by the contract the sale runs under, and agreements
 * expire. Given the set of agreements on file, this resolves the one that
 * applies to a particular line.
 *
 * Pure functions, deliberately: quoting and purchasing must arrive at the same
 * dealer cost, and the only way to guarantee that is for both to call this.
 *
 * Specificity, most specific first:
 *   1. series + contract   this series, under this contract
 *   2. series              this series, any contract
 *   3. contract            any series, under this contract
 *   4. blanket             any series, any contract
 *
 * A tie inside a tier is broken by the larger discount, so a dealer is never
 * silently charged more than an agreement on file entitles them to.
 */

/**
 * The subset of a vendor_discounts row that resolution needs. Accepting a
 * structural type rather than the database row keeps this callable from tests
 * and from an importer holding not-yet-persisted agreements.
 */
export interface DiscountAgreement {
  discount_percent: number;
  series_id?: string | null;
  contract_vehicle?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export interface DiscountQuery {
  /** The series being priced, if known. */
  seriesId?: string | null;
  /** The contract the sale runs under, if any. */
  contractVehicle?: string | null;
  /** Date to evaluate against, ISO yyyy-mm-dd. Defaults to today. */
  asOf?: string;
}

export interface ResolvedDiscount {
  discountPercent: number;
  /** Which tier matched — useful for showing the user why they got this rate. */
  matchedOn: 'series+contract' | 'series' | 'contract' | 'blanket';
  agreement: DiscountAgreement;
}

/** Today as ISO yyyy-mm-dd, in local time. */
const todayISO = (): string => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Whether an agreement is in force on a given date. An open-ended range (either
 * bound null) is treated as unbounded in that direction.
 */
export const isAgreementEffective = (
  agreement: DiscountAgreement,
  asOf: string = todayISO()
): boolean => {
  if (agreement.effective_from && asOf < agreement.effective_from) return false;
  if (agreement.effective_to && asOf > agreement.effective_to) return false;
  return true;
};

/**
 * Rank an agreement against a query. Lower is more specific; -1 means the
 * agreement does not apply at all.
 */
const specificity = (
  agreement: DiscountAgreement,
  query: DiscountQuery
): number => {
  const wantsSeries = !!agreement.series_id;
  const wantsContract = !!agreement.contract_vehicle;

  // An agreement scoped to a series only applies to that series.
  if (wantsSeries && agreement.series_id !== query.seriesId) return -1;
  // Likewise for contract vehicle. Compared case-insensitively because these
  // are hand-entered ("Omnia" vs "omnia").
  if (
    wantsContract &&
    agreement.contract_vehicle?.toLowerCase() !==
      query.contractVehicle?.toLowerCase()
  ) {
    return -1;
  }

  if (wantsSeries && wantsContract) return 0;
  if (wantsSeries) return 1;
  if (wantsContract) return 2;
  return 3;
};

const TIER_NAMES: ResolvedDiscount['matchedOn'][] = [
  'series+contract',
  'series',
  'contract',
  'blanket',
];

/**
 * The discount that applies to a line, or null when no agreement covers it.
 *
 * Null is a meaningful answer and must not be coerced to zero: "no agreement on
 * file" means the line cannot be priced, whereas a 0% discount means the dealer
 * genuinely pays list.
 */
export const resolveDiscount = (
  agreements: DiscountAgreement[],
  query: DiscountQuery = {}
): ResolvedDiscount | null => {
  const asOf = query.asOf ?? todayISO();

  const candidates = agreements
    .filter(a => isAgreementEffective(a, asOf))
    .map(a => ({ agreement: a, tier: specificity(a, query) }))
    .filter(c => c.tier >= 0);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    // Same specificity: favour the dealer.
    return b.agreement.discount_percent - a.agreement.discount_percent;
  });

  const best = candidates[0]!;
  return {
    discountPercent: best.agreement.discount_percent,
    matchedOn: TIER_NAMES[best.tier]!,
    agreement: best.agreement,
  };
};

/**
 * Convenience wrapper returning just the percentage, with an explicit fallback
 * for callers that have already decided what "no agreement" should mean.
 */
export const resolveDiscountPercent = (
  agreements: DiscountAgreement[],
  query: DiscountQuery = {},
  fallback = 0
): number => resolveDiscount(agreements, query)?.discountPercent ?? fallback;
