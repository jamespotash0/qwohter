/**
 * Specification column mapping
 *
 * Turns parsed rows into order lines, given which column means what.
 *
 * The mapping is explicit rather than inferred-and-trusted. A guess is offered
 * from the header names, because most exports use recognisable labels and
 * confirming a good guess is fast — but the import screen always shows it, and
 * a wrong guess on `list price` versus `net price` is the difference between a
 * job that makes money and one that does not.
 *
 * `manufacturer` and `description` are the only fields an order line genuinely
 * cannot do without. Everything else is optional, because specification exports
 * vary wildly in what they carry and refusing a file for a missing column a
 * dealer does not use would make the importer useless.
 */

import type { MaterializedOrderLine } from '@/lib/pricing/materialize';
import { round2 } from '@/lib/pricing/calculate';

/** Every order-line field an import can populate. */
export type MappableField =
  | 'manufacturer_name'
  | 'series_name'
  | 'model_number'
  | 'description'
  | 'option_string'
  | 'area'
  | 'spec_phase'
  | 'quantity'
  | 'list_price'
  | 'dealer_discount_percent'
  | 'unit_cost'
  | 'sell_price'
  | 'source_line_number';

/** Column index per field. Absent means the file does not carry it. */
export type ColumnMapping = Partial<Record<MappableField, number>>;

export const REQUIRED_FIELDS: MappableField[] = ['manufacturer_name', 'description'];

/**
 * Header labels seen in the wild, most specific first.
 *
 * Order matters: 'list price' must be tested before 'price', or a file with
 * both columns maps the wrong one and every margin downstream is wrong.
 */
const HEADER_HINTS: [MappableField, RegExp[]][] = [
  ['list_price', [/\blist\s*(price|amt|amount)?\b/i, /\blist\b/i]],
  ['unit_cost', [/\b(net|dealer|unit)\s*(cost|price)\b/i, /\bcost\b/i]],
  ['sell_price', [/\b(sell|extended\s*sell|customer)\s*(price|total)?\b/i]],
  ['dealer_discount_percent', [/\b(disc(ount)?|multiplier)\b.*%?/i]],
  ['manufacturer_name', [/\b(manufacturer|mfg|mfr|vendor|catalog|brand)\b/i]],
  ['series_name', [/\bseries\b/i, /\bproduct\s*line\b/i]],
  ['model_number', [/\b(model|part|catalog)\s*(number|no|#)\b/i, /\bpart\b/i, /\bsku\b/i]],
  ['option_string', [/\boptions?\b/i, /\bconfig(uration)?\b/i, /\bspecification\s*string\b/i]],
  ['area', [/\b(area|room|location|zone)\b/i, /\btag\b/i]],
  ['spec_phase', [/\bphase\b/i]],
  ['quantity', [/\b(qty|quantity)\b/i]],
  ['description', [/\bdescription\b/i, /\bdesc\b/i, /\bproduct\b/i]],
  ['source_line_number', [/\b(line|item)\s*(number|no|#)\b/i, /^line$/i]],
];

/**
 * A first guess at the mapping from header labels.
 *
 * Each column is claimed at most once, and each field claims at most one
 * column, so a file with both "List Price" and "Price" cannot map both to the
 * same field and quietly overwrite one.
 */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const takenColumns = new Set<number>();

  for (const [field, patterns] of HEADER_HINTS) {
    if (mapping[field] !== undefined) continue;
    for (const pattern of patterns) {
      const index = headers.findIndex(
        (header, i) => !takenColumns.has(i) && pattern.test(header)
      );
      if (index >= 0) {
        mapping[field] = index;
        takenColumns.add(index);
        break;
      }
    }
  }

  return mapping;
}

/** Which required fields the mapping is still missing. */
export function missingRequired(mapping: ColumnMapping): MappableField[] {
  return REQUIRED_FIELDS.filter(field => mapping[field] === undefined);
}

/** Trimmed cell, or null when blank. */
const cell = (row: string[], index?: number): string | null => {
  if (index === undefined) return null;
  const value = row[index]?.trim();
  return value === undefined || value.length === 0 ? null : value;
};

/**
 * A number from a spec-file cell, or null.
 *
 * Strips currency symbols, thousands separators, and trailing percent signs,
 * and reads parenthesised values as negative — all of which appear in exports
 * that were shaped for a spreadsheet rather than for a machine.
 */
export function parseNumber(raw: string | null): number | null {
  if (raw === null) return null;
  const negative = /^\(.*\)$/.test(raw.trim());
  const cleaned = raw.replace(/[()$,\s%]/g, '');
  if (cleaned.length === 0) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

export interface MapOptions {
  /**
   * Applied when a row carries a list price but no cost and no discount. A
   * dealer importing a spec priced at list needs *something*, and this is the
   * one number they can supply for the whole file.
   */
  fallbackDiscountPercent?: number;
  /** Area for rows whose file carries no area column. */
  defaultArea?: string | null;
}

export interface MapResult {
  lines: MaterializedOrderLine[];
  /** Rows that produced nothing, with why — never silently dropped. */
  rejected: { rowNumber: number; reason: string }[];
}

/**
 * Turn mapped rows into order lines.
 *
 * Cost resolution, in order of what the file actually said:
 *   1. an explicit cost column
 *   2. list price less a discount the file carried
 *   3. list price less a discount the importer was given
 *
 * If none of those apply the cost is 0 and the row says so in `rejected` —
 * a line imported at zero cost reads as pure margin and is the single most
 * expensive thing an importer can do quietly.
 */
export function rowsToOrderLines(
  rows: string[][],
  mapping: ColumnMapping,
  options: MapOptions = {}
): MapResult {
  const lines: MaterializedOrderLine[] = [];
  const rejected: MapResult['rejected'] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;

    const manufacturer = cell(row, mapping.manufacturer_name);
    const description =
      cell(row, mapping.description) ?? cell(row, mapping.model_number);

    if (!description) {
      rejected.push({ rowNumber, reason: 'No description or model number' });
      return;
    }

    const quantity = parseNumber(cell(row, mapping.quantity)) ?? 1;
    if (quantity <= 0) {
      rejected.push({ rowNumber, reason: `Quantity is ${quantity}` });
      return;
    }

    const listPrice = parseNumber(cell(row, mapping.list_price));
    const explicitCost = parseNumber(cell(row, mapping.unit_cost));
    const fileDiscount = parseNumber(cell(row, mapping.dealer_discount_percent));
    const discount = fileDiscount ?? options.fallbackDiscountPercent ?? null;

    let unitCost = 0;
    let pricingMode: 'cost_up' | 'list_down' = 'cost_up';
    let discountPercent: number | null = null;

    if (explicitCost !== null) {
      unitCost = explicitCost;
    } else if (listPrice !== null && discount !== null) {
      pricingMode = 'list_down';
      discountPercent = discount;
      unitCost = round2(listPrice * (1 - discount / 100));
    } else if (listPrice !== null) {
      // Priced at list with no discount known. Recorded honestly rather than
      // guessed at, and flagged so somebody supplies the multiplier.
      pricingMode = 'list_down';
      unitCost = listPrice;
      rejected.push({
        rowNumber,
        reason: 'List price with no discount — imported at list, cost is wrong',
      });
    } else {
      rejected.push({ rowNumber, reason: 'No price of any kind — cost is 0' });
    }

    lines.push({
      line_number: lines.length + 1,
      area: cell(row, mapping.area) ?? options.defaultArea ?? null,
      spec_phase: cell(row, mapping.spec_phase),
      manufacturer_name: manufacturer,
      series_name: cell(row, mapping.series_name),
      model_number: cell(row, mapping.model_number),
      description,
      option_string: cell(row, mapping.option_string),
      quantity,
      pricing_mode: pricingMode,
      // Purchasable by default: a specification file describes product. Labor
      // and freight are added by the dealer, not exported by the spec tool.
      fulfillment_type: 'purchase',
      list_price: listPrice,
      dealer_discount_percent: discountPercent,
      unit_cost: unitCost,
      sell_rule: null,
      markup_type: 'percent',
      markup_value: 0,
      discount_type: null,
      discount_value: null,
      sell_price: parseNumber(cell(row, mapping.sell_price)) ?? 0,
      is_taxable: false,
      source_line_number:
        parseNumber(cell(row, mapping.source_line_number)) ?? rowNumber,
      source_proposal_line_id: null,
    });
  });

  return { lines, rejected };
}
