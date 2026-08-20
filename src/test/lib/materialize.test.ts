/**
 * Materialization Tests
 *
 * Turning a proposal's JSONB pricing sections into durable order lines is the
 * hinge the whole back office swings on. Line numbering, cost resolution, and
 * vendor assignment are contractual here.
 */

import { describe, it, expect } from 'vitest';
import {
  materializeOrderLines,
  summarizeMaterialization,
  type PricingLineItem,
  type PricingSection,
} from '@/lib/pricing';

const VENDOR_STEELCASE = 'aaaaaaaa-1111-1111-1111-111111111111';
const VENDOR_HAWORTH = 'bbbbbbbb-2222-2222-2222-222222222222';

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

describe('materializeOrderLines vendor resolution', () => {
  const sections = [
    section([
      line({ id: 'a', manufacturerName: 'Steelcase' }),
      line({ id: 'b', manufacturerName: 'Haworth' }),
      line({ id: 'c', manufacturerName: 'Obscure Co' }),
    ]),
  ];

  it('maps manufacturer names to vendor ids', () => {
    const result = materializeOrderLines(sections, {
      vendorIdByManufacturer: { Steelcase: VENDOR_STEELCASE, Haworth: VENDOR_HAWORTH },
    });
    expect(result[0]!.vendor_id).toBe(VENDOR_STEELCASE);
    expect(result[1]!.vendor_id).toBe(VENDOR_HAWORTH);
  });

  it('leaves vendor_id null when no account exists, rather than guessing', () => {
    const result = materializeOrderLines(sections, {
      vendorIdByManufacturer: { Steelcase: VENDOR_STEELCASE },
    });
    expect(result[2]!.vendor_id).toBeNull();
    expect(result[2]!.manufacturer_name).toBe('Obscure Co');
  });

  it('matches manufacturer names case-insensitively', () => {
    const result = materializeOrderLines(
      [section([line({ manufacturerName: 'STEELCASE' })])],
      { vendorIdByManufacturer: { steelcase: VENDOR_STEELCASE } }
    );
    expect(result[0]!.vendor_id).toBe(VENDOR_STEELCASE);
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

  it('reports manufacturers with no vendor account, without duplicates', () => {
    const lines = materializeOrderLines(
      [
        section([
          line({ id: 'a', manufacturerName: 'Obscure Co' }),
          line({ id: 'b', manufacturerName: 'Obscure Co' }),
          line({ id: 'c', manufacturerName: 'Steelcase' }),
        ]),
      ],
      { vendorIdByManufacturer: { Steelcase: VENDOR_STEELCASE } }
    );
    const summary = summarizeMaterialization(lines);
    expect(summary.unresolvedManufacturers).toEqual(['Obscure Co']);
    expect(summary.unassignedLineCount).toBe(2);
  });

  it('is clean when every line resolves', () => {
    const lines = materializeOrderLines(
      [section([line({ manufacturerName: 'Steelcase' })])],
      { vendorIdByManufacturer: { Steelcase: VENDOR_STEELCASE } }
    );
    const summary = summarizeMaterialization(lines);
    expect(summary.unassignedLineCount).toBe(0);
    expect(summary.unresolvedManufacturers).toEqual([]);
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
    // The bug this prevents: install labor reported as "assign a vendor before
    // you can order", when the dealer's own crew is doing the work.
    const result = materializeOrderLines([
      section([line({ name: 'Install labor', sellRule: 'per_hour', quantity: 40 })], {
        name: 'Delivery & Installation',
        type: 'delivery_install',
        fulfillmentType: 'self_perform',
      }),
    ]);
    expect(result[0]!.fulfillment_type).toBe('self_perform');
    expect(result[0]!.vendor_id).toBeNull();
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
