/**
 * Pricing Calculations
 *
 * Pure functions — no React, no Supabase, no side effects. Extracted from
 * PricingTab so that order lines, purchase orders, and job costing all resolve
 * money through the same code path as the proposal editor.
 *
 * Rounding convention: every value that reaches a summary or is persisted is
 * rounded to 2 decimals. Intermediate values are not, so a chain of operations
 * does not accumulate rounding error.
 */

import type {
  PricingLineItem,
  PricingSection,
  PricingSummary,
} from '@/lib/types/pricing';

/** Round to 2 decimal places (currency precision). */
export const round2 = (num: number): number => Math.round(num * 100) / 100;

/**
 * Dealer cost per unit from a manufacturer list price and a discount off list.
 * A "55 off" discount is a 0.45 multiplier.
 *
 * Rounded at the unit, deliberately: `1000 * (1 - 55/100)` is 449.99999999999994
 * in floating point, and multiplying that by a quantity of 20 puts 8999.999999999998
 * on a purchase order. Dealer cost is a real per-unit price a manufacturer will
 * invoice against, so it settles to cents here rather than at the extended total.
 */
export const calculateDealerCost = (
  listPrice: number,
  dealerDiscountPercent = 0
): number => round2(listPrice * (1 - dealerDiscountPercent / 100));

/**
 * The multiplier form of a discount off list, which is how dealers and
 * manufacturers usually state it on a contract (0.45 rather than "55 off").
 */
export const discountToMultiplier = (dealerDiscountPercent = 0): number =>
  1 - dealerDiscountPercent / 100;

/** The inverse — a contract multiplier expressed as a discount off list. */
export const multiplierToDiscount = (multiplier: number): number =>
  (1 - multiplier) * 100;

/**
 * The authoritative unit cost for a line.
 *
 * In `list_down` mode cost is derived from list price and the dealer discount,
 * so a stamped `unitCost` is only ever a cache. Every calculation reads cost
 * through here; nothing should touch `item.unitCost` directly.
 */
export const resolveUnitCost = (item: PricingLineItem): number => {
  if (item.pricingMode === 'list_down' && item.listPrice !== undefined) {
    return calculateDealerCost(item.listPrice, item.dealerDiscountPercent);
  }
  return item.unitCost;
};

/**
 * Extended list price for a line — quantity x manufacturer list, before any
 * dealer discount. Zero for lines that carry no list price.
 */
export const calculateLineListTotal = (item: PricingLineItem): number =>
  item.listPrice !== undefined ? item.quantity * item.listPrice : 0;

/**
 * Cost of a single line before any markup: quantity x resolved unit cost.
 */
export const calculateLineCost = (item: PricingLineItem): number =>
  item.quantity * resolveUnitCost(item);

/**
 * Sell price for a line: cost, marked up, then discounted. Before tax.
 *
 * Markup and discount are each either a percentage or a flat dollar amount.
 * A dollar discount can never drive the line below zero.
 */
export const calculateSellPrice = (item: PricingLineItem): number => {
  const baseCost = calculateLineCost(item);

  let priceAfterMarkup: number;
  if (item.markupType === 'dollar') {
    priceAfterMarkup = baseCost + (item.markupValue || 0);
  } else {
    priceAfterMarkup = baseCost + baseCost * (item.markupValue / 100);
  }

  if (item.discountValue && item.discountValue > 0) {
    if (item.discountType === 'percent') {
      return priceAfterMarkup * (1 - item.discountValue / 100);
    }
    return Math.max(0, priceAfterMarkup - item.discountValue);
  }

  return priceAfterMarkup;
};

/**
 * Tax on a single line. Non-taxable lines contribute zero.
 */
export const calculateLineTax = (
  item: PricingLineItem,
  salesTaxPercent: number
): number =>
  item.isTaxable ? round2(calculateSellPrice(item)) * (salesTaxPercent / 100) : 0;

/** Sum of sell prices across a set of line items (a section subtotal). */
export const calculateSubtotal = (items: PricingLineItem[]): number =>
  items.reduce((sum, item) => sum + calculateSellPrice(item), 0);

/** Sum of costs across a set of line items, before markup. */
export const calculateTotalCost = (items: PricingLineItem[]): number =>
  items.reduce((sum, item) => sum + calculateLineCost(item), 0);

/**
 * Recalculate and stamp the derived fields (sellPrice, taxAmount) onto every
 * line item, returning new sections. The stamped values are what get persisted
 * to the proposal, so they are rounded here.
 */
export const enrichSections = (
  sections: PricingSection[],
  salesTaxPercent: number
): PricingSection[] =>
  sections.map(section => ({
    ...section,
    lineItems: section.lineItems.map(item => ({
      ...item,
      // In list_down mode unitCost is derived, so restamp it here to keep the
      // persisted value in step with listPrice and the dealer discount.
      unitCost: round2(resolveUnitCost(item)),
      sellPrice: round2(calculateSellPrice(item)),
      taxAmount: round2(calculateLineTax(item, salesTaxPercent)),
    })),
  }));

/**
 * Roll enriched sections up into the summary totals stored on the proposal.
 *
 * Reads the stamped sellPrice/taxAmount rather than recalculating, so the
 * summary always agrees with the line values the user is looking at.
 */
export const summarizeSections = (
  sections: PricingSection[]
): PricingSummary => {
  const subtotal = round2(
    sections.reduce(
      (total, section) =>
        total +
        section.lineItems.reduce((sum, item) => sum + (item.sellPrice ?? 0), 0),
      0
    )
  );

  const totalCost = round2(
    sections.reduce(
      (total, section) => total + calculateTotalCost(section.lineItems),
      0
    )
  );

  const totalTax = round2(
    sections.reduce(
      (total, section) =>
        section.lineItems.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0) +
        total,
      0
    )
  );

  const grossProfit = round2(subtotal - totalCost);

  // List value of the order, before any dealer discount. Zero unless lines
  // carry a manufacturer list price (i.e. came from a spec import).
  const totalList = round2(
    sections.reduce(
      (total, section) =>
        total +
        section.lineItems.reduce(
          (sum, item) => sum + calculateLineListTotal(item),
          0
        ),
      0
    )
  );

  return {
    totalCost,
    totalList,
    subtotal,
    grossProfit,
    grossProfitPercent: round2(
      subtotal > 0 ? (grossProfit / subtotal) * 100 : 0
    ),
    totalTax,
    grandTotal: round2(subtotal + totalTax),
  };
};

/**
 * Enrich then summarize in one step — the common case when syncing pricing
 * state back to the proposal.
 */
export const calculatePricing = (
  sections: PricingSection[],
  salesTaxPercent: number
): { sections: PricingSection[]; summary: PricingSummary } => {
  const enriched = enrichSections(sections, salesTaxPercent);
  return { sections: enriched, summary: summarizeSections(enriched) };
};

/**
 * Markup expressed as a percentage of cost, the inverse view of margin.
 * Returns 0 when there is no cost to mark up.
 */
export const calculateCostMarkupPercent = (
  subtotal: number,
  totalCost: number
): number => (totalCost > 0 ? ((subtotal - totalCost) / totalCost) * 100 : 0);

/** Format a number as USD. */
export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
