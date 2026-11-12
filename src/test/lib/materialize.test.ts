/**
 * Materialization Tests
 *
 * Turning a proposal's JSONB pricing sections into durable order lines is the
 * hinge the whole back office swings on. Line numbering, cost resolution, and
 * supplier attribution are contractual here.
 */

import { describe, it, expect } from 'vitest';
import {
  materializeOrderLines,
  summarizeMaterialization,
  type PricingLineItem,
  type PricingSection,
} from '@/lib/pricing';


const line = (o: Partial<PricingLineItem> = {}): PricingLineItem => ({
  id: 'p-1',
  name: 'Task chair',
  quantity: 1,
  sellRule: 'per_unit',
  unitCost: 100,
  markupValue: 0,
  ...o,
});

const section = (
  lineItems: PricingLineItem[],
  o: Partial<PricingSection> = {}
): PricingSection => ({
  id: 's1',
  name: 'Open Plan',
  type: 'product',
  collapsed: false,
  lineItems,
  ...o,
});

describe('materializeOrderLines numbering', () => {
  it('numbers lines across the whole order, not per section', () => {
    const result = materializeOrderLines([
      section([line({ id: 'a' }), line({ id: 'b' })], { id: 's1', name: 'Level 2' }),
      section([line({ id: 'c' })], { id: 's2', name: 'Level 3' }),
    ]);
    expect(result.map(l => l.line_number)).toEqual([1, 2, 3]);
  });

  it('preserves section order', () => {
    const result = materializeOrderLines([
      section([line({ id: 'a', name: 'First' })], { id: 's1' }),
      section([line({ id: 'b', name: 'Second' })], { id: 's2' }),
    ]);
    expect(result.map(l => l.description)).toEqual(['First', 'Second']);
  });

  it('skips lines that carry no product and no quantity', () => {
    const result = materializeOrderLines([
      section([
        line({ id: 'a', name: 'Real' }),
        line({ id: 'b', name: '', modelNumber: '', quantity: 0 }),
      ]),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.line_number).toBe(1);
  });
});

describe('materializeOrderLines area', () => {
  it('uses the section name as the area', () => {
    const result = materializeOrderLines([section([line()], { name: 'Level 3 Open Plan' })]);
    expect(result[0]!.area).toBe('Level 3 Open Plan');
  });

  it("prefers the line's own area over the section name", () => {
    const result = materializeOrderLines([
      section([line({ area: 'Reception' })], { name: 'Level 3' }),
    ]);
    expect(result[0]!.area).toBe('Reception');
  });

  it('can be told not to borrow the section name', () => {
    const result = materializeOrderLines([section([line()], { name: 'Level 3' })], {
      useSectionNameAsArea: false,
    });
    expect(result[0]!.area).toBeNull();
  });
});

describe('materializeOrderLines cost resolution', () => {
  it('resolves cost from list and discount rather than a stale unitCost', () => {
    const result = materializeOrderLines([
      section([
        line({
          pricingMode: 'list_down',
          listPrice: 1000,
          dealerDiscountPercent: 55,
          unitCost: 9999, // stale cache
          quantity: 20,
          markupValue: 20,
        }),
      ]),
    ]);
    expect(result[0]!.unit_cost).toBe(450);
    expect(result[0]!.sell_price).toBe(10800);
    expect(result[0]!.pricing_mode).toBe('list_down');
  });

  it('carries cost_up lines through unchanged', () => {
    const result = materializeOrderLines([
      section([line({ quantity: 40, unitCost: 65, markupValue: 0, sellRule: 'per_hour' })]),
    ]);
    expect(result[0]!.unit_cost).toBe(65);
    expect(result[0]!.sell_price).toBe(2600);
    expect(result[0]!.pricing_mode).toBe('cost_up');
  });

  it('defaults markup type to percent', () => {
    expect(materializeOrderLines([section([line()])])[0]!.markup_type).toBe('percent');
  });
});

describe('materializeOrderLines supplier attribution', () => {
  const sections = [
    section([
      line({ id: 'a', manufacturerName: 'Steelcase' }),
      line({ id: 'b', manufacturerName: 'Haworth' }),
      line({ id: 'c', manufacturerName: '  ' }),
    ]),
  ];

  it('carries the manufacturer through verbatim', () => {
    const result = materializeOrderLines(sections);
    expect(result[0]!.manufacturer_name).toBe('Steelcase');
    expect(result[1]!.manufacturer_name).toBe('Haworth');
  });

  it('nulls a blank manufacturer rather than storing an empty string', () => {
    // A line naming nobody cannot be grouped into an order with anyone, and
    // '' would read as a real supplier when the fan-out groups by name.
    const result = materializeOrderLines(sections);
    expect(result[2]!.manufacturer_name).toBeNull();
  });

  it('preserves the specification\'s own casing', () => {
    // Grouping is by name, so normalizing here would silently merge two
    // manufacturers a spec file spelled differently on purpose.
    const result = materializeOrderLines([
      section([line({ manufacturerName: 'STEELCASE' })]),
    ]);
    expect(result[0]!.manufacturer_name).toBe('STEELCASE');
  });
});

describe('materializeOrderLines provenance', () => {
  it('keeps a link back to the proposal line and the spec file line', () => {
    const result = materializeOrderLines([
      section([
        line({
          id: 'proposal-line-42',
          sourceLineNumber: 14,
          optionString: '5S2-6205/6249',
          seriesName: 'Series 1',
        }),
      ]),
    ]);
    expect(result[0]).toMatchObject({
      source_proposal_line_id: 'proposal-line-42',
      source_line_number: 14,
      option_string: '5S2-6205/6249',
      series_name: 'Series 1',
    });
  });

  it('always produces a description, since the column is NOT NULL', () => {
    const withModel = materializeOrderLines([
      section([line({ name: '', modelNumber: '453A', quantity: 2 })]),
    ]);
    expect(withModel[0]!.description).toBe('453A');

    const withNeither = materializeOrderLines([
      section([line({ name: '', modelNumber: '', quantity: 2 })]),
    ]);
    expect(withNeither[0]!.description).toBe('Unnamed line');
  });
});

describe('summarizeMaterialization', () => {
  it('totals cost, sell, and quantity', () => {
    const lines = materializeOrderLines([
      section([
        line({ id: 'a', quantity: 10, unitCost: 100, markupValue: 25 }),
        line({ id: 'b', quantity: 5, unitCost: 40, markupValue: 0 }),
      ]),
    ]);
    const summary = summarizeMaterialization(lines);
    expect(summary.lineCount).toBe(2);
    expect(summary.totalQuantity).toBe(15);
    expect(summary.totalCost).toBe(1200);
    expect(summary.totalSell).toBe(1450);
  });

  it('lists distinct manufacturers without duplicates', () => {
    const lines = materializeOrderLines([
      section([
        line({ id: 'a', manufacturerName: 'Obscure Co' }),
        line({ id: 'b', manufacturerName: 'Obscure Co' }),
        line({ id: 'c', manufacturerName: 'Steelcase' }),
      ]),
    ]);
    const summary = summarizeMaterialization(lines);
    expect(summary.manufacturers).toEqual(['Obscure Co', 'Steelcase']);
    expect(summary.unnamedManufacturerLineCount).toBe(0);
  });

  it('counts lines naming nobody, and keeps them out of the list', () => {
    const lines = materializeOrderLines([
      section([
        line({ id: 'a', manufacturerName: 'Steelcase' }),
        line({ id: 'b', manufacturerName: '' }),
        line({ id: 'c', manufacturerName: '   ' }),
      ]),
    ]);
    const summary = summarizeMaterialization(lines);
    expect(summary.unnamedManufacturerLineCount).toBe(2);
    expect(summary.manufacturers).toEqual(['Steelcase']);
  });

  it('is clean when every line names a manufacturer', () => {
    const lines = materializeOrderLines([
      section([line({ manufacturerName: 'Steelcase' })]),
    ]);
    const summary = summarizeMaterialization(lines);
    expect(summary.unnamedManufacturerLineCount).toBe(0);
    expect(summary.manufacturers).toEqual(['Steelcase']);
  });
});

describe('materializeOrderLines fulfillment routing', () => {
  it('routes a merchandise section to purchasing', () => {
    const result = materializeOrderLines([
      section([line()], { type: 'merchandise', fulfillmentType: 'purchase' }),
    ]);
    expect(result[0]!.fulfillment_type).toBe('purchase');
  });

  it('keeps install labor off the purchase path', () => {
    // The bug this prevents: install labor reported as "name a supplier before
    // you can order", when the dealer's own crew is doing the work.
    const result = materializeOrderLines([
      section([line({ name: 'Install labor', sellRule: 'per_hour', quantity: 40 })], {
        name: 'Delivery & Installation',
        type: 'delivery_install',
        fulfillmentType: 'self_perform',
      }),
    ]);
    expect(result[0]!.fulfillment_type).toBe('self_perform');
  });

  it('lets a single line be subcontracted out of a self-performed section', () => {
    const result = materializeOrderLines([
      section(
        [line({ id: 'a' }), line({ id: 'b', fulfillmentType: 'subcontract' })],
        { type: 'delivery_install', fulfillmentType: 'self_perform' }
      ),
    ]);
    expect(result[0]!.fulfillment_type).toBe('self_perform');
    expect(result[1]!.fulfillment_type).toBe('subcontract');
  });

  it('leaves an unset section unrouted rather than guessing', () => {
    const result = materializeOrderLines([section([line()], { type: 'other' })]);
    expect(result[0]!.fulfillment_type).toBeNull();
  });

  it('falls back to the legacy section category', () => {
    const result = materializeOrderLines([section([line()], { type: 'tariffs' })]);
    expect(result[0]!.fulfillment_type).toBe('pass_through');
  });
});
