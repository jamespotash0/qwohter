/**
 * Pricing Library Tests
 *
 * Locks down the money math extracted from PricingTab. Order lines, purchase
 * orders, and job costing will all route through these functions, so the
 * rounding and ordering conventions here are load-bearing.
 */

import { describe, it, expect } from 'vitest';
import {
  round2,
  calculateLineCost,
  calculateSellPrice,
  calculateLineTax,
  calculateSubtotal,
  calculateTotalCost,
  enrichSections,
  summarizeSections,
  calculatePricing,
  calculateCostMarkupPercent,
  formatCurrency,
  calculateDealerCost,
  discountToMultiplier,
  multiplierToDiscount,
  resolveUnitCost,
  calculateLineListTotal,
  type PricingLineItem,
  type PricingSection,
} from '@/lib/pricing';

const line = (overrides: Partial<PricingLineItem> = {}): PricingLineItem => ({
  id: 'l1',
  name: 'Task chair',
  quantity: 1,
  sellRule: 'per_unit',
  unitCost: 100,
  markupValue: 0,
  ...overrides,
});

const section = (
  lineItems: PricingLineItem[],
  overrides: Partial<PricingSection> = {}
): PricingSection => ({
  id: 's1',
  name: 'Product',
  type: 'product',
  collapsed: false,
  lineItems,
  ...overrides,
});

describe('round2', () => {
  it('rounds to currency precision', () => {
    expect(round2(1.004)).toBe(1);
    expect(round2(1.006)).toBe(1.01);
    expect(round2(1234.5678)).toBe(1234.57);
  });

  // Documents existing behavior rather than endorsing it: 1.005 is stored as
  // 1.00499... so Math.round(n * 100) / 100 rounds it down. Changing this would
  // shift totals on every proposal already in the database, so it stays as-is
  // until there is a deliberate migration.
  it('rounds a float-imprecise half down', () => {
    expect(round2(1.005)).toBe(1);
  });

  it('leaves whole numbers alone', () => {
    expect(round2(0)).toBe(0);
    expect(round2(42)).toBe(42);
  });
});

describe('calculateLineCost', () => {
  it('multiplies quantity by unit cost', () => {
    expect(calculateLineCost(line({ quantity: 12, unitCost: 249.5 }))).toBe(2994);
  });

  it('returns zero for a zero quantity', () => {
    expect(calculateLineCost(line({ quantity: 0, unitCost: 500 }))).toBe(0);
  });
});

describe('calculateSellPrice', () => {
  it('applies percentage markup by default', () => {
    expect(calculateSellPrice(line({ unitCost: 100, markupValue: 25 }))).toBe(125);
  });

  it('applies percentage markup across quantity', () => {
    expect(
      calculateSellPrice(line({ quantity: 4, unitCost: 100, markupValue: 50 }))
    ).toBe(600);
  });

  it('applies flat dollar markup once, not per unit', () => {
    expect(
      calculateSellPrice(
        line({ quantity: 4, unitCost: 100, markupValue: 50, markupType: 'dollar' })
      )
    ).toBe(450);
  });

  it('applies percentage discount after markup', () => {
    // 100 -> 125 markup -> 10% off = 112.5
    expect(
      calculateSellPrice(
        line({
          unitCost: 100,
          markupValue: 25,
          discountValue: 10,
          discountType: 'percent',
        })
      )
    ).toBe(112.5);
  });

  it('applies dollar discount after markup', () => {
    expect(
      calculateSellPrice(
        line({
          unitCost: 100,
          markupValue: 25,
          discountValue: 25,
          discountType: 'dollar',
        })
      )
    ).toBe(100);
  });

  it('never drives a line below zero with a dollar discount', () => {
    expect(
      calculateSellPrice(
        line({ unitCost: 100, markupValue: 0, discountValue: 500, discountType: 'dollar' })
      )
    ).toBe(0);
  });

  it('ignores a zero or absent discount', () => {
    expect(calculateSellPrice(line({ unitCost: 100, markupValue: 10, discountValue: 0 }))).toBe(110);
    expect(calculateSellPrice(line({ unitCost: 100, markupValue: 10 }))).toBe(110);
  });
});

describe('calculateLineTax', () => {
  it('is zero for non-taxable lines', () => {
    expect(calculateLineTax(line({ unitCost: 100, isTaxable: false }), 8.25)).toBe(0);
  });

  it('taxes the rounded sell price', () => {
    // sell 110.00 at 8.25% = 9.075
    expect(calculateLineTax(line({ unitCost: 100, markupValue: 10, isTaxable: true }), 8.25)).toBeCloseTo(9.075, 5);
  });

  it('is zero at a zero tax rate', () => {
    expect(calculateLineTax(line({ isTaxable: true }), 0)).toBe(0);
  });
});

describe('calculateSubtotal / calculateTotalCost', () => {
  const items = [
    line({ id: 'a', quantity: 2, unitCost: 100, markupValue: 25 }), // cost 200, sell 250
    line({ id: 'b', quantity: 1, unitCost: 50, markupValue: 0 }), //  cost 50,  sell 50
  ];

  it('sums sell prices', () => {
    expect(calculateSubtotal(items)).toBe(300);
  });

  it('sums costs before markup', () => {
    expect(calculateTotalCost(items)).toBe(250);
  });

  it('handles an empty set', () => {
    expect(calculateSubtotal([])).toBe(0);
    expect(calculateTotalCost([])).toBe(0);
  });
});

describe('enrichSections', () => {
  it('stamps rounded sellPrice and taxAmount onto every line', () => {
    const result = enrichSections(
      [section([line({ unitCost: 100, markupValue: 10, isTaxable: true })])],
      8.25
    );
    const item = result[0]!.lineItems[0]!;
    expect(item.sellPrice).toBe(110);
    expect(item.taxAmount).toBe(9.08);
  });

  it('does not mutate the input', () => {
    const input = [section([line({ unitCost: 100, markupValue: 10 })])];
    enrichSections(input, 5);
    expect(input[0]!.lineItems[0]!.sellPrice).toBeUndefined();
  });

  it('preserves section metadata', () => {
    const result = enrichSections(
      [section([line()], { id: 'labor', name: 'Install Labor', collapsed: true })],
      0
    );
    expect(result[0]!).toMatchObject({ id: 'labor', name: 'Install Labor', collapsed: true });
  });
});

describe('summarizeSections', () => {
  it('rolls up cost, subtotal, profit, tax, and grand total', () => {
    const enriched = enrichSections(
      [
        section([
          line({ id: 'a', quantity: 2, unitCost: 100, markupValue: 25, isTaxable: true }),
          line({ id: 'b', quantity: 1, unitCost: 50, markupValue: 0, isTaxable: false }),
        ]),
      ],
      10
    );
    const summary = summarizeSections(enriched);

    expect(summary.totalCost).toBe(250);
    expect(summary.subtotal).toBe(300);
    expect(summary.grossProfit).toBe(50);
    expect(summary.grossProfitPercent).toBeCloseTo(16.67, 2);
    expect(summary.totalTax).toBe(25); // only line a is taxable: 250 * 10%
    expect(summary.grandTotal).toBe(325);
  });

  it('reports zero margin percent when the subtotal is zero', () => {
    expect(summarizeSections([section([])]).grossProfitPercent).toBe(0);
  });

  it('sums across multiple sections', () => {
    const enriched = enrichSections(
      [
        section([line({ unitCost: 100, markupValue: 0 })], { id: 's1' }),
        section([line({ id: 'l2', unitCost: 200, markupValue: 0 })], { id: 's2' }),
      ],
      0
    );
    expect(summarizeSections(enriched).subtotal).toBe(300);
  });

  it('handles a negative margin without breaking', () => {
    const enriched = enrichSections(
      [section([line({ unitCost: 100, markupValue: 0, discountValue: 20, discountType: 'dollar' })])],
      0
    );
    const summary = summarizeSections(enriched);
    expect(summary.subtotal).toBe(80);
    expect(summary.grossProfit).toBe(-20);
    expect(summary.grossProfitPercent).toBe(-25);
  });
});

describe('calculatePricing', () => {
  it('enriches and summarizes in one pass, agreeing with the parts', () => {
    const input = [section([line({ quantity: 3, unitCost: 100, markupValue: 20, isTaxable: true })])];
    const { sections, summary } = calculatePricing(input, 7);

    expect(sections[0]!.lineItems[0]!.sellPrice).toBe(360);
    expect(summary.subtotal).toBe(360);
    expect(summary.totalTax).toBe(25.2);
    expect(summary.grandTotal).toBe(385.2);
  });

  it('produces the same summary as calling the steps separately', () => {
    const input = [section([line({ quantity: 2, unitCost: 133.33, markupValue: 17.5, isTaxable: true })])];
    const combined = calculatePricing(input, 8.25);
    const stepwise = summarizeSections(enrichSections(input, 8.25));
    expect(combined.summary).toEqual(stepwise);
  });
});

describe('calculateCostMarkupPercent', () => {
  it('expresses profit as a percentage of cost', () => {
    expect(calculateCostMarkupPercent(125, 100)).toBe(25);
  });

  it('returns zero when there is no cost', () => {
    expect(calculateCostMarkupPercent(500, 0)).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats as USD with two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negatives', () => {
    expect(formatCurrency(-42)).toBe('-$42.00');
  });
});

// ─── list-down (buy-side) pricing ────────────────────────────────────────────
// How contract furniture actually prices: manufacturer list, less a dealer
// discount off list, gives dealer cost. Markup then runs on top as before.

describe('calculateDealerCost', () => {
  it('applies a discount off list', () => {
    expect(calculateDealerCost(1000, 55)).toBe(450);
  });

  it('treats a missing discount as no discount', () => {
    expect(calculateDealerCost(1000)).toBe(1000);
  });

  it('handles a full discount', () => {
    expect(calculateDealerCost(1000, 100)).toBe(0);
  });
});

describe('discount / multiplier conversion', () => {
  it('converts a discount off list to a contract multiplier', () => {
    expect(discountToMultiplier(55)).toBeCloseTo(0.45, 10);
    expect(discountToMultiplier(0)).toBe(1);
  });

  it('converts a multiplier back to a discount', () => {
    expect(multiplierToDiscount(0.45)).toBeCloseTo(55, 10);
    expect(multiplierToDiscount(1)).toBe(0);
  });

  it('round-trips', () => {
    expect(multiplierToDiscount(discountToMultiplier(62.5))).toBeCloseTo(62.5, 10);
  });
});

describe('resolveUnitCost', () => {
  it('reads unitCost directly in cost_up mode', () => {
    expect(resolveUnitCost(line({ unitCost: 250 }))).toBe(250);
  });

  it('treats an absent pricingMode as cost_up', () => {
    expect(resolveUnitCost(line({ unitCost: 250, listPrice: 999 }))).toBe(250);
  });

  it('derives cost from list and discount in list_down mode', () => {
    expect(
      resolveUnitCost(
        line({ pricingMode: 'list_down', listPrice: 1000, dealerDiscountPercent: 55, unitCost: 0 })
      )
    ).toBe(450);
  });

  it('falls back to unitCost when list_down mode has no list price', () => {
    expect(resolveUnitCost(line({ pricingMode: 'list_down', unitCost: 175 }))).toBe(175);
  });

  it('ignores a stale stamped unitCost in list_down mode', () => {
    expect(
      resolveUnitCost(
        line({ pricingMode: 'list_down', listPrice: 1000, dealerDiscountPercent: 50, unitCost: 9999 })
      )
    ).toBe(500);
  });
});

describe('calculateLineListTotal', () => {
  it('extends list price across quantity', () => {
    expect(calculateLineListTotal(line({ quantity: 10, listPrice: 1200 }))).toBe(12000);
  });

  it('is zero for a line with no list price', () => {
    expect(calculateLineListTotal(line({ quantity: 10 }))).toBe(0);
  });
});

describe('list_down pricing end to end', () => {
  const specLine = line({
    id: 'spec-1',
    name: 'Series 1 Task Chair',
    quantity: 20,
    unitCost: 0,
    pricingMode: 'list_down',
    listPrice: 1000,
    dealerDiscountPercent: 55,
    markupValue: 20,
    isTaxable: true,
    manufacturerName: 'Steelcase',
    seriesName: 'Series 1',
    area: 'Level 3 Open Plan',
    optionString: '5S2-6205/6249',
    sourceLineNumber: 14,
  });

  it('derives cost, then marks up from the derived cost', () => {
    // 20 x (1000 less 55%) = 9,000 cost; +20% markup = 10,800 sell
    expect(calculateLineCost(specLine)).toBe(9000);
    expect(calculateSellPrice(specLine)).toBe(10800);
  });

  it('stamps the derived unit cost during enrichment', () => {
    const [s] = enrichSections([section([specLine])], 0);
    expect(s!.lineItems[0]!.unitCost).toBe(450);
    expect(s!.lineItems[0]!.sellPrice).toBe(10800);
  });

  it('reports list value alongside cost and sell in the summary', () => {
    const summary = calculatePricing([section([specLine])], 0).summary;
    expect(summary.totalList).toBe(20000);
    expect(summary.totalCost).toBe(9000);
    expect(summary.subtotal).toBe(10800);
    expect(summary.grossProfit).toBe(1800);
  });

  it('preserves spec metadata through enrichment', () => {
    const [s] = enrichSections([section([specLine])], 0);
    expect(s!.lineItems[0]!).toMatchObject({
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      area: 'Level 3 Open Plan',
      optionString: '5S2-6205/6249',
      sourceLineNumber: 14,
    });
  });

  it('mixes with cost_up lines in the same section', () => {
    const labor = line({ id: 'labor', name: 'Install', quantity: 40, unitCost: 65, sellRule: 'per_hour', markupValue: 0 });
    const summary = calculatePricing([section([specLine, labor])], 0).summary;
    expect(summary.totalCost).toBe(11600); // 9,000 product + 2,600 labor
    expect(summary.subtotal).toBe(13400); // 10,800 product + 2,600 labor
    expect(summary.totalList).toBe(20000); // labor carries no list price
  });
});

describe('summary back-compatibility', () => {
  it('reports zero list value for entirely cost_up pricing', () => {
    const summary = calculatePricing([section([line({ unitCost: 100, markupValue: 10 })])], 0).summary;
    expect(summary.totalList).toBe(0);
  });
});
