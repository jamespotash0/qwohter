/**
 * Specification revision diffing tests
 *
 * The contracts, in order of what they cost when broken:
 *
 *   1. Renumbering must not read as "everything changed". Spec tools renumber
 *      on every export, and a diff that panics is a diff nobody reads.
 *   2. Forty identical chairs must not collapse onto one match.
 *   3. A line already on a manufacturer order must never look safe to change.
 */

import { describe, it, expect } from 'vitest';
import { diffSpecification, sortDiff, type ExistingLine } from '@/lib/sif/diff';
import type { MaterializedOrderLine } from '@/lib/pricing/materialize';

const existing = (over: Partial<ExistingLine> = {}): ExistingLine => ({
  id: over.id ?? 'e1',
  line_number: 1,
  manufacturer_name: 'Steelcase',
  model_number: '453A-5S2',
  description: 'Task Chair',
  option_string: 'Arms, casters',
  quantity: 400,
  unit_cost: 450,
  list_price: 1000,
  source_line_number: 1,
  qty_ordered: 0,
  ...over,
});

const incoming = (over: Partial<MaterializedOrderLine> = {}): MaterializedOrderLine => ({
  line_number: 1,
  area: 'Open Plan',
  spec_phase: null,
  manufacturer_name: 'Steelcase',
  series_name: 'Series 1',
  model_number: '453A-5S2',
  description: 'Task Chair',
  option_string: 'Arms, casters',
  quantity: 400,
  pricing_mode: 'list_down',
  fulfillment_type: 'purchase',
  list_price: 1000,
  dealer_discount_percent: 55,
  unit_cost: 450,
  sell_rule: null,
  markup_type: 'percent',
  markup_value: 0,
  discount_type: null,
  discount_value: null,
  sell_price: 0,
  is_taxable: false,
  source_line_number: 1,
  source_proposal_line_id: null,
  ...over,
});

describe('diffSpecification — matching', () => {
  it('sees no change when nothing moved', () => {
    const d = diffSpecification([existing()], [incoming()]);
    expect(d.unchanged).toHaveLength(1);
    expect(d.modified).toHaveLength(0);
    expect(d.netCostDelta).toBe(0);
  });

  it('survives renumbering by matching on part and options', () => {
    // The whole point: spec tools renumber on export. A diff that reports
    // everything as added and removed is a diff nobody will read.
    const d = diffSpecification(
      [existing({ source_line_number: 1 })],
      [incoming({ source_line_number: 47, line_number: 47 })]
    );
    expect(d.unchanged).toHaveLength(1);
    expect(d.changes[0]!.matchedOn).toBe('part_and_options');
    expect(d.added).toHaveLength(0);
    expect(d.removed).toHaveLength(0);
  });

  it('prefers the source line number when it is stable', () => {
    const d = diffSpecification([existing()], [incoming()]);
    expect(d.changes[0]!.matchedOn).toBe('source_line');
  });

  it('matches on part alone when the configuration changed', () => {
    const d = diffSpecification(
      [existing({ source_line_number: null, option_string: 'Arms, casters' })],
      [incoming({ source_line_number: null, option_string: 'Armless, glides' })]
    );
    expect(d.changes[0]!.matchedOn).toBe('part');
    expect(d.changes[0]!.kind).toBe('options');
  });

  it('does not collapse identical lines onto one match', () => {
    // Forty identical chairs across four areas is normal. Each must pair with
    // exactly one counterpart.
    const three = [
      existing({ id: 'a', source_line_number: null }),
      existing({ id: 'b', source_line_number: null }),
      existing({ id: 'c', source_line_number: null }),
    ];
    const two = [
      incoming({ source_line_number: null }),
      incoming({ source_line_number: null }),
    ];
    const d = diffSpecification(three, two);
    expect(d.unchanged).toHaveLength(2);
    expect(d.removed).toHaveLength(1);
  });
});

describe('diffSpecification — classification', () => {
  it('reports a quantity move with its cost delta', () => {
    const d = diffSpecification([existing()], [incoming({ quantity: 450 })]);
    expect(d.modified[0]!.kind).toBe('quantity');
    expect(d.modified[0]!.costDelta).toBe(22500); // 50 x 450
    expect(d.modified[0]!.details[0]).toMatch(/400 → 450/);
  });

  it('reports a cost move, and ranks it over a quantity move', () => {
    // A price change moves margin without changing what shows up on the truck.
    const d = diffSpecification(
      [existing()],
      [incoming({ quantity: 401, unit_cost: 500 })]
    );
    expect(d.modified[0]!.kind).toBe('cost');
    expect(d.modified[0]!.details).toHaveLength(2);
  });

  it('ranks an options change above everything, as a different product', () => {
    const d = diffSpecification(
      [existing()],
      [incoming({ quantity: 500, unit_cost: 600, option_string: 'Armless' })]
    );
    expect(d.modified[0]!.kind).toBe('options');
  });

  it('reports an added line at its full cost', () => {
    const d = diffSpecification([], [incoming({ quantity: 10, unit_cost: 100 })]);
    expect(d.added).toHaveLength(1);
    expect(d.added[0]!.costDelta).toBe(1000);
  });

  it('reports a removed line as money back', () => {
    const d = diffSpecification([existing({ quantity: 10, unit_cost: 100 })], []);
    expect(d.removed).toHaveLength(1);
    expect(d.removed[0]!.costDelta).toBe(-1000);
  });

  it('nets the whole revision', () => {
    const d = diffSpecification(
      [existing({ id: 'a', quantity: 10, unit_cost: 100 })],
      [
        incoming({ quantity: 12, unit_cost: 100 }),
        incoming({ source_line_number: 99, model_number: 'NEW-1', quantity: 5, unit_cost: 40 }),
      ]
    );
    expect(d.netCostDelta).toBe(400); // +200 quantity, +200 added
  });

  it('ignores sub-cent cost noise', () => {
    const d = diffSpecification([existing({ unit_cost: 450 })], [incoming({ unit_cost: 450.001 })]);
    expect(d.unchanged).toHaveLength(1);
  });
});

describe('diffSpecification — already ordered', () => {
  it('flags a change to product already on a manufacturer order', () => {
    // Applying this silently would edit what the factory was told to build.
    const d = diffSpecification(
      [existing({ qty_ordered: 400 })],
      [incoming({ quantity: 450 })]
    );
    expect(d.blocked).toHaveLength(1);
    expect(d.blocked[0]!.alreadyOrdered).toBe(true);
  });

  it('flags a removal of product already ordered', () => {
    const d = diffSpecification([existing({ qty_ordered: 400 })], []);
    expect(d.blocked[0]!.kind).toBe('removed');
  });

  it('does not flag an unchanged line that happens to be ordered', () => {
    const d = diffSpecification([existing({ qty_ordered: 400 })], [incoming()]);
    expect(d.blocked).toHaveLength(0);
  });

  it('never flags an added line — nothing new can be on order yet', () => {
    const d = diffSpecification([], [incoming()]);
    expect(d.added[0]!.alreadyOrdered).toBe(false);
  });
});

describe('sortDiff', () => {
  it('leads with what is already ordered, whatever its size', () => {
    const d = diffSpecification(
      [
        existing({ id: 'a', qty_ordered: 400, quantity: 1, unit_cost: 1 }),
        existing({ id: 'b', source_line_number: 2, quantity: 10, unit_cost: 1000 }),
      ],
      [
        incoming({ quantity: 2, unit_cost: 1 }),
        incoming({ source_line_number: 2, quantity: 90, unit_cost: 1000 }),
      ]
    );
    const sorted = sortDiff(d.changes);
    expect(sorted[0]!.alreadyOrdered).toBe(true);
  });

  it('orders by exposure within a rank', () => {
    const d = diffSpecification(
      [
        existing({ id: 'a', source_line_number: 1, quantity: 1, unit_cost: 10 }),
        existing({ id: 'b', source_line_number: 2, model_number: 'X', quantity: 1, unit_cost: 10 }),
      ],
      [
        incoming({ source_line_number: 1, quantity: 2, unit_cost: 10 }),
        incoming({ source_line_number: 2, model_number: 'X', quantity: 100, unit_cost: 10 }),
      ]
    );
    const quantities = sortDiff(d.changes).filter(c => c.kind === 'quantity');
    expect(quantities[0]!.costDelta).toBeGreaterThan(quantities[1]!.costDelta);
  });

  it('puts unchanged lines last', () => {
    const d = diffSpecification(
      [
        existing({ id: 'a', source_line_number: 1 }),
        existing({ id: 'b', source_line_number: 2, model_number: 'X' }),
      ],
      [
        incoming({ source_line_number: 1 }),
        incoming({ source_line_number: 2, model_number: 'X', quantity: 999 }),
      ]
    );
    const sorted = sortDiff(d.changes);
    expect(sorted[sorted.length - 1]!.kind).toBe('unchanged');
  });
});

describe('diffSpecification — lines the dealer added themselves', () => {
  it('does not propose removing install labor', () => {
    // A spec file never contains the dealer's own labor. Treating its absence
    // as a removal would cancel a crew's work on every revision.
    const d = diffSpecification(
      [existing({ id: 'labor', model_number: null, fulfillment_type: 'self_perform' })],
      []
    );
    expect(d.removed).toHaveLength(0);
    expect(d.changes[0]!.details[0]).toMatch(/outside the specification/i);
  });

  it('does not propose removing a pass-through cost', () => {
    const d = diffSpecification(
      [existing({ id: 'freight', fulfillment_type: 'pass_through' })],
      []
    );
    expect(d.removed).toHaveLength(0);
  });

  it('still removes purchased product that left the specification', () => {
    const d = diffSpecification(
      [existing({ id: 'chair', fulfillment_type: 'purchase' })],
      []
    );
    expect(d.removed).toHaveLength(1);
  });

  it('treats unknown routing as spec-sourced', () => {
    // The older, more common case; a person reviews before anything applies.
    const d = diffSpecification([existing({ id: 'x', fulfillment_type: null })], []);
    expect(d.removed).toHaveLength(1);
  });

  it('keeps a subcontracted line out of removals', () => {
    const d = diffSpecification(
      [existing({ id: 'sub', fulfillment_type: 'subcontract' })],
      []
    );
    expect(d.removed).toHaveLength(0);
  });
});
