/**
 * Specification lines → proposal pricing sections
 *
 * The conversion that lets a SIF reach the quote rather than only the order.
 */

import { describe, it, expect } from 'vitest';
import { specLinesToPricingSections } from '@/lib/sif/toPricing';
import type { MaterializedOrderLine } from '@/lib/pricing/materialize';

/** A line as `rowsToOrderLines` produces one, with the parts a test cares about. */
function specLine(over: Partial<MaterializedOrderLine> = {}): MaterializedOrderLine {
  return {
    line_number: 1,
    area: 'Reception',
    spec_phase: null,
    manufacturer_name: 'Steelcase',
    series_name: 'Answer',
    model_number: 'AN-4830',
    description: 'Panel, 48W x 30H',
    option_string: '48W, 30H, LH',
    quantity: 4,
    pricing_mode: 'list_down',
    fulfillment_type: 'purchase',
    list_price: 500,
    dealer_discount_percent: 55,
    unit_cost: 225,
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
  };
}

const SEED = 'test';

describe('specLinesToPricingSections', () => {
  it('groups lines into one section per area', () => {
    const result = specLinesToPricingSections(
      [
        specLine({ area: 'Reception' }),
        specLine({ area: 'Open plan' }),
        specLine({ area: 'Reception' }),
      ],
      { idSeed: SEED }
    );

    expect(result.sections).toHaveLength(2);
    expect(result.sections.map(s => s.name)).toEqual(['Reception', 'Open plan']);
    expect(result.sections[0]!.lineItems).toHaveLength(2);
    expect(result.sections[1]!.lineItems).toHaveLength(1);
  });

  it('keeps the order the designer walked the building, not alphabetical', () => {
    const result = specLinesToPricingSections(
      [
        specLine({ area: 'Zebra room' }),
        specLine({ area: 'Atrium' }),
      ],
      { idSeed: SEED }
    );
    expect(result.sections.map(s => s.name)).toEqual(['Zebra room', 'Atrium']);
  });

  it('names a section for lines the file gave no area', () => {
    const result = specLinesToPricingSections(
      [specLine({ area: null }), specLine({ area: '   ' })],
      { idSeed: SEED, fallbackSectionName: 'From acme-hq.sif' }
    );
    // Blank and null land together rather than producing a section called "null"
    // and another called "   ".
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]!.name).toBe('From acme-hq.sif');
  });

  it('carries provenance onto the pricing line', () => {
    const [section] = specLinesToPricingSections([specLine()], { idSeed: SEED }).sections;
    const item = section!.lineItems[0]!;

    expect(item.manufacturerName).toBe('Steelcase');
    expect(item.seriesName).toBe('Answer');
    expect(item.modelNumber).toBe('AN-4830');
    expect(item.optionString).toBe('48W, 30H, LH');
    expect(item.sourceLineNumber).toBe(1);
  });

  it('preserves list-down pricing so cost stays derivable', () => {
    const [section] = specLinesToPricingSections([specLine()], { idSeed: SEED }).sections;
    const item = section!.lineItems[0]!;

    expect(item.pricingMode).toBe('list_down');
    expect(item.listPrice).toBe(500);
    expect(item.dealerDiscountPercent).toBe(55);
    expect(item.unitCost).toBe(225);
  });

  it('does not invent a margin', () => {
    // Sell is computed downstream from cost and markup. A converter that
    // guessed here would produce a quote nobody checked.
    const [section] = specLinesToPricingSections([specLine()], { idSeed: SEED }).sections;
    expect(section!.lineItems[0]!.markupValue).toBe(0);
  });

  it('carries the markup the importer set on the line', () => {
    // The blanket markup is applied by the mapper, so the converter reads it
    // off the line rather than being told twice and disagreeing.
    const result = specLinesToPricingSections([specLine({ markup_value: 20 })], {
      idSeed: SEED,
    });
    expect(result.sections[0]!.lineItems[0]!.markupValue).toBe(20);
    expect(result.zeroMargin).toBe(0);
  });

  it('counts lines that will quote at cost', () => {
    const result = specLinesToPricingSections(
      [specLine({ markup_value: 0 }), specLine({ markup_value: 15 })],
      { idSeed: SEED }
    );
    expect(result.zeroMargin).toBe(1);
  });

  it('routes imported sections to purchasing, unlike a blank one', () => {
    // A hand-added section defaults to pass_through so it never raises a PO
    // nobody asked for. An imported line names a manufacturer and a list price,
    // so it is product to be bought.
    const [section] = specLinesToPricingSections([specLine()], { idSeed: SEED }).sections;
    expect(section!.fulfillmentType).toBe('purchase');
    expect(section!.type).toBe('merchandise');
  });

  it('totals list and cost across quantities, not per unit', () => {
    const result = specLinesToPricingSections(
      [specLine({ quantity: 4, list_price: 500, unit_cost: 225 })],
      { idSeed: SEED }
    );
    expect(result.totalList).toBe(2000);
    expect(result.totalCost).toBe(900);
  });

  it('counts lines whose cost the file never resolved', () => {
    const result = specLinesToPricingSections(
      [
        specLine(),
        specLine({ unit_cost: 0, list_price: null, dealer_discount_percent: null }),
        // Imported at list because no discount was known — reads as pure margin.
        specLine({ unit_cost: 500, list_price: 500, dealer_discount_percent: null }),
      ],
      { idSeed: SEED }
    );
    expect(result.needsCost).toBe(2);
  });

  it('counts lines carrying no manufacturer', () => {
    const result = specLinesToPricingSections(
      [specLine(), specLine({ manufacturer_name: null, description: 'Freight' })],
      { idSeed: SEED }
    );
    expect(result.withoutManufacturer).toBe(1);
  });

  it('gives every section and line a distinct id', () => {
    const result = specLinesToPricingSections(
      [specLine({ area: 'A' }), specLine({ area: 'B' }), specLine({ area: 'A' })],
      { idSeed: SEED }
    );
    const ids = [
      ...result.sections.map(s => s.id),
      ...result.sections.flatMap(s => s.lineItems.map(i => i.id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps two imports into one proposal from colliding', () => {
    const first = specLinesToPricingSections([specLine()], { idSeed: 'a' });
    const second = specLinesToPricingSections([specLine()], { idSeed: 'b' });
    expect(first.sections[0]!.id).not.toBe(second.sections[0]!.id);
  });

  it('handles an empty file without inventing a section', () => {
    const result = specLinesToPricingSections([], { idSeed: SEED });
    expect(result.sections).toEqual([]);
    expect(result.totalCost).toBe(0);
    expect(result.totalList).toBe(0);
  });

  it('lets a freight row keep its own routing inside a purchased section', () => {
    const result = specLinesToPricingSections(
      [
        specLine(),
        specLine({ manufacturer_name: null, description: 'Delivery', fulfillment_type: 'pass_through' }),
      ],
      { idSeed: SEED }
    );
    const items = result.sections[0]!.lineItems;
    expect(items[0]!.fulfillmentType).toBe('purchase');
    expect(items[1]!.fulfillmentType).toBe('pass_through');
  });
});
