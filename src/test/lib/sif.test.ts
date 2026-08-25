/**
 * Specification import tests
 *
 * The contracts that matter, in order of what they cost when broken:
 *
 *   1. An option string containing commas must survive. Splitting it builds
 *      the wrong product.
 *   2. A row must never import at a cost the file did not state. A line at
 *      zero cost reads as pure margin.
 *   3. Nothing is dropped silently — a rejected row says why.
 */

import { describe, it, expect } from 'vitest';
import {
  splitLine,
  detectDelimiter,
  looksLikeHeader,
  parseSpecFile,
} from '@/lib/sif/parse';
import {
  guessMapping,
  missingRequired,
  parseNumber,
  rowsToOrderLines,
  type ColumnMapping,
} from '@/lib/sif/map';

describe('splitLine', () => {
  it('keeps a quoted option string intact', () => {
    // The expensive one: "48W, 30D, LH" is one field. Split it and the factory
    // builds a different desk.
    const fields = splitLine('Steelcase,OL-6030,"48W, 30D, LH",4', ',');
    expect(fields).toEqual(['Steelcase', 'OL-6030', '48W, 30D, LH', '4']);
  });

  it('reads a doubled quote as a literal quote', () => {
    expect(splitLine('a,"36"" wide",c', ',')).toEqual(['a', '36" wide', 'c']);
  });

  it('preserves empty trailing fields', () => {
    expect(splitLine('a,b,,', ',')).toEqual(['a', 'b', '', '']);
  });

  it('trims surrounding whitespace but not inner', () => {
    expect(splitLine(' a , b c ,d', ',')).toEqual(['a', 'b c', 'd']);
  });
});

describe('detectDelimiter', () => {
  it('picks tabs over commas when commas are inside prose', () => {
    // A naive frequency count would choose the comma here and destroy the file.
    const lines = [
      'Mfg\tPart\tDescription\tQty',
      'Steelcase\t453A\tTask chair, height adjustable, arms\t400',
      'Haworth\tCM-42\tStorage tower, 4 shelf, locking\t60',
    ];
    expect(detectDelimiter(lines)).toBe('\t');
  });

  it('picks commas for a plain CSV', () => {
    expect(
      detectDelimiter(['Mfg,Part,Qty', 'Steelcase,453A,400', 'Haworth,CM-42,60'])
    ).toBe(',');
  });

  it('picks pipes when the file uses them', () => {
    expect(
      detectDelimiter(['Mfg|Part|Qty', 'Steelcase|453A|400', 'Haworth|CM-42|60'])
    ).toBe('|');
  });
});

describe('looksLikeHeader', () => {
  it('recognises labels', () => {
    expect(looksLikeHeader(['Manufacturer', 'Part', 'Qty', 'List Price'])).toBe(true);
  });

  it('recognises a data row by its numbers', () => {
    expect(looksLikeHeader(['Steelcase', '453A-5S2', '400', '1000.00'])).toBe(false);
  });

  it('is not fooled by an empty row', () => {
    expect(looksLikeHeader(['', '', ''])).toBe(false);
  });
});

describe('parseSpecFile', () => {
  const file = [
    'Riverside HQ — Specification export',
    '',
    'Manufacturer,Series,Part Number,Description,Options,Area,Qty,List Price,Discount %',
    'Steelcase,Series 1,453A-5S2,Task Chair,"Arms, casters, black",Open Plan,400,1000.00,55',
    'Steelcase,Ology,OL-6030,Height-Adjust Desk,"60W, 30D",Private Offices,120,2400.00,56',
    'Haworth,Compose,CM-4218,Storage Tower,,Collaboration,60,1500.00,48',
  ].join('\n');

  it('finds the header row and the data below it', () => {
    const parsed = parseSpecFile(file);
    expect(parsed.hasHeaderRow).toBe(true);
    expect(parsed.headers[0]).toBe('Manufacturer');
    expect(parsed.rows).toHaveLength(3);
  });

  it('skips a preamble line rather than treating it as a record', () => {
    const parsed = parseSpecFile(file);
    expect(parsed.skipped.map(s => s.text)).toContain(
      'Riverside HQ — Specification export'
    );
  });

  it('keeps commas inside the options column', () => {
    const parsed = parseSpecFile(file);
    expect(parsed.rows[0]![4]).toBe('Arms, casters, black');
  });

  it('handles a file with no header row', () => {
    const parsed = parseSpecFile('Steelcase,453A,400\nHaworth,CM-42,60');
    expect(parsed.hasHeaderRow).toBe(false);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.headers[0]).toBe('Column 1');
  });

  it('returns empty rather than throwing on an empty file', () => {
    expect(parseSpecFile('   \n\n').rows).toEqual([]);
  });

  it('pads a short row instead of dropping real product', () => {
    const parsed = parseSpecFile('A,B,C,D\n1,2,3,4\n5,6');
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[1]).toEqual(['5', '6', '', '']);
  });
});

describe('guessMapping', () => {
  const headers = [
    'Manufacturer',
    'Series',
    'Part Number',
    'Description',
    'Options',
    'Area',
    'Qty',
    'List Price',
    'Discount %',
  ];

  it('maps the obvious columns', () => {
    const m = guessMapping(headers);
    expect(m.manufacturer_name).toBe(0);
    expect(m.description).toBe(3);
    expect(m.quantity).toBe(6);
    expect(m.list_price).toBe(7);
  });

  it('prefers list price over a bare price column', () => {
    // Mapping the wrong one makes every downstream margin wrong.
    const m = guessMapping(['Description', 'Price', 'List Price']);
    expect(m.list_price).toBe(2);
  });

  it('never assigns two fields to the same column', () => {
    const m = guessMapping(['Part', 'Part', 'Description']);
    const used = Object.values(m);
    expect(new Set(used).size).toBe(used.length);
  });

  it('reports what a mapping still needs', () => {
    expect(missingRequired({ description: 1 })).toEqual(['manufacturer_name']);
    expect(missingRequired({ manufacturer_name: 0, description: 1 })).toEqual([]);
  });
});

describe('parseNumber', () => {
  it('strips currency and separators', () => {
    expect(parseNumber('$1,234.56')).toBe(1234.56);
  });

  it('strips a trailing percent', () => {
    expect(parseNumber('55%')).toBe(55);
  });

  it('reads parentheses as negative', () => {
    expect(parseNumber('(250.00)')).toBe(-250);
  });

  it('returns null for blank and junk, never 0', () => {
    // 0 and "unknown" must stay distinguishable all the way down.
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber('n/a')).toBeNull();
  });
});

describe('rowsToOrderLines', () => {
  it('applies a blanket markup to every line', () => {
    // A spec tool exports cost, never sell. Without this every imported line
    // quotes at cost.
    const rows = [['Steelcase', 'Panel', '2', '500']];
    const mapping = {
      manufacturer_name: 0,
      description: 1,
      quantity: 2,
      list_price: 3,
    };
    const { lines } = rowsToOrderLines(rows, mapping, {
      fallbackDiscountPercent: 50,
      markupPercent: 20,
    });
    expect(lines[0]!.markup_value).toBe(20);
    expect(lines[0]!.markup_type).toBe('percent');
  });

  it('defaults markup to zero when the importer names none', () => {
    const rows = [['Steelcase', 'Panel', '1', '100']];
    const mapping = { manufacturer_name: 0, description: 1, quantity: 2, unit_cost: 3 };
    const { lines } = rowsToOrderLines(rows, mapping);
    expect(lines[0]!.markup_value).toBe(0);
  });

  const mapping: ColumnMapping = {
    manufacturer_name: 0,
    series_name: 1,
    model_number: 2,
    description: 3,
    option_string: 4,
    area: 5,
    quantity: 6,
    list_price: 7,
    dealer_discount_percent: 8,
  };

  const row = (over: Partial<Record<number, string>> = {}) => {
    const base = [
      'Steelcase',
      'Series 1',
      '453A-5S2',
      'Task Chair',
      'Arms, casters',
      'Open Plan',
      '400',
      '1000.00',
      '55',
    ];
    for (const [i, v] of Object.entries(over)) base[Number(i)] = v as string;
    return base;
  };

  it('derives cost from list and discount', () => {
    const { lines } = rowsToOrderLines([row()], mapping);
    expect(lines[0]!.unit_cost).toBe(450);
    expect(lines[0]!.pricing_mode).toBe('list_down');
    expect(lines[0]!.dealer_discount_percent).toBe(55);
  });

  it('numbers lines sequentially and keeps the source line', () => {
    const { lines } = rowsToOrderLines([row(), row(), row()], mapping);
    expect(lines.map(l => l.line_number)).toEqual([1, 2, 3]);
    expect(lines[2]!.source_line_number).toBe(3);
  });

  it('flags a row priced at list with no discount, and does not invent one', () => {
    // Imported honestly at list, and reported — never silently marked up.
    const { lines, rejected } = rowsToOrderLines([row({ 8: '' })], mapping);
    expect(lines[0]!.unit_cost).toBe(1000);
    expect(rejected[0]!.reason).toMatch(/no discount/i);
  });

  it('applies a fallback discount when the file carries none', () => {
    const { lines } = rowsToOrderLines([row({ 8: '' })], mapping, {
      fallbackDiscountPercent: 50,
    });
    expect(lines[0]!.unit_cost).toBe(500);
  });

  it('flags a row with no price at all rather than importing it quietly', () => {
    const { lines, rejected } = rowsToOrderLines([row({ 7: '', 8: '' })], mapping);
    expect(lines[0]!.unit_cost).toBe(0);
    expect(rejected[0]!.reason).toMatch(/no price/i);
  });

  it('rejects a row with no description or model number', () => {
    const { lines, rejected } = rowsToOrderLines([row({ 2: '', 3: '' })], mapping);
    expect(lines).toHaveLength(0);
    expect(rejected[0]!.reason).toMatch(/description/i);
  });

  it('falls back to the model number when description is blank', () => {
    const { lines } = rowsToOrderLines([row({ 3: '' })], mapping);
    expect(lines[0]!.description).toBe('453A-5S2');
  });

  it('rejects a zero or negative quantity', () => {
    expect(rowsToOrderLines([row({ 6: '0' })], mapping).lines).toHaveLength(0);
    expect(rowsToOrderLines([row({ 6: '-5' })], mapping).lines).toHaveLength(0);
  });

  it('defaults quantity to 1 when the file has no quantity column', () => {
    const { lines } = rowsToOrderLines([row()], { ...mapping, quantity: undefined });
    expect(lines[0]!.quantity).toBe(1);
  });

  it('routes imported product as purchasable', () => {
    // A specification file describes product. Labor and freight are the
    // dealer's own additions, never exported by the spec tool.
    const { lines } = rowsToOrderLines([row()], mapping);
    expect(lines[0]!.fulfillment_type).toBe('purchase');
  });

  it('carries the option string through verbatim', () => {
    const { lines } = rowsToOrderLines([row()], mapping);
    expect(lines[0]!.option_string).toBe('Arms, casters');
  });

  it('uses a default area when the file has no area column', () => {
    const { lines } = rowsToOrderLines([row()], { ...mapping, area: undefined }, {
      defaultArea: 'Phase 1',
    });
    expect(lines[0]!.area).toBe('Phase 1');
  });
});
