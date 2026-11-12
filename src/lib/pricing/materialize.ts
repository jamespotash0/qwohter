/**
 * Proposal → Order Line Materialization
 *
 * A proposal's priced line items live inside `proposals.form_data` as JSONB. An
 * order line has to survive a year of partial fulfillment — ordered, acknowledged
 * at a different price, shipped in two drops, one carton damaged, replaced,
 * installed, invoiced — and a blob cannot carry an identity through that.
 *
 * This is the flattening step: pricing sections become a flat, numbered list of
 * order lines with cost resolved. Pure, so it can be tested and previewed before
 * anything is written.
 *
 * Section grouping is preserved as `area`, because that is what it means in
 * practice — dealers name pricing sections after rooms and phases.
 */

import { resolveUnitCost, calculateSellPrice, round2 } from './calculate';
import { resolveFulfillmentType } from './fulfillment';
import type {
  FulfillmentType,
  PricingLineItem,
  PricingSection,
} from '@/lib/types/pricing';

/** A line ready to be inserted, matching the order_lines column names. */
export interface MaterializedOrderLine {
  line_number: number;
  area: string | null;
  spec_phase: string | null;
  /**
   * Who supplies the line, as the specification names them. Text, not a
   * reference: there is no vendor account to maintain, and purchase orders are
   * placed in the manufacturer's own portal rather than composed here.
   */
  manufacturer_name: string | null;
  series_name: string | null;
  model_number: string | null;
  description: string;
  option_string: string | null;
  quantity: number;
  pricing_mode: 'cost_up' | 'list_down';
  /**
   * How the line gets delivered. Null when the form never said, which blocks
   * both ordering and scheduling until someone decides.
   */
  fulfillment_type: FulfillmentType | null;
  list_price: number | null;
  dealer_discount_percent: number | null;
  unit_cost: number;
  sell_rule: string | null;
  markup_type: 'percent' | 'dollar';
  markup_value: number;
  discount_type: 'percent' | 'dollar' | null;
  discount_value: number | null;
  sell_price: number;
  is_taxable: boolean;
  source_line_number: number | null;
  source_proposal_line_id: string | null;
}

export interface MaterializeOptions {
  /** Treat a section's name as the area label. On by default. */
  useSectionNameAsArea?: boolean;
}

/**
 * Trimmed value, or null when absent or blank. Specification exports are full of
 * empty and whitespace-only fields, and those must become null rather than being
 * stored as '' — hence an explicit helper instead of `??`, which would keep them.
 */
const trimmed = (value: string | null | undefined): string | null => {
  const t = value?.trim();
  if (t === undefined || t.length === 0) return null;
  return t;
};

/** A line that carries no charge and no product is not worth ordering. */
const isEmptyLine = (item: PricingLineItem): boolean =>
  !item.name?.trim() &&
  !item.modelNumber?.trim() &&
  item.quantity === 0;

/**
 * Flatten priced sections into numbered order lines.
 *
 * Line numbers are assigned across the whole order in section order, not per
 * section, because a purchase order references "line 47" of the order.
 */
export function materializeOrderLines(
  sections: PricingSection[],
  options: MaterializeOptions = {}
): MaterializedOrderLine[] {
  const { useSectionNameAsArea = true } = options;

  const lines: MaterializedOrderLine[] = [];
  let lineNumber = 0;

  for (const section of sections) {
    for (const item of section.lineItems) {
      if (isEmptyLine(item)) continue;

      lineNumber += 1;

      const manufacturer = trimmed(item.manufacturerName);

      lines.push({
        line_number: lineNumber,
        area:
          trimmed(item.area) ??
          (useSectionNameAsArea ? trimmed(section.name) : null),
        spec_phase: trimmed(item.specPhase),
        manufacturer_name: manufacturer,
        series_name: trimmed(item.seriesName),
        model_number: trimmed(item.modelNumber),
        // description is NOT NULL in the database; fall back through the fields
        // most likely to identify the line to a human reading the PO.
        description:
          trimmed(item.name) ?? trimmed(item.modelNumber) ?? 'Unnamed line',
        option_string: trimmed(item.optionString),
        quantity: item.quantity,
        pricing_mode: item.pricingMode ?? 'cost_up',
        fulfillment_type: resolveFulfillmentType(item, section),
        list_price: item.listPrice ?? null,
        dealer_discount_percent: item.dealerDiscountPercent ?? null,
        // Resolved, not copied: in list_down mode the stored unitCost is a cache
        // that may lag list price and discount.
        unit_cost: round2(resolveUnitCost(item)),
        sell_rule: trimmed(item.sellRule),
        markup_type: item.markupType ?? 'percent',
        markup_value: item.markupValue ?? 0,
        discount_type: item.discountType ?? null,
        discount_value: item.discountValue ?? null,
        sell_price: round2(calculateSellPrice(item)),
        is_taxable: item.isTaxable ?? false,
        source_line_number: item.sourceLineNumber ?? null,
        // The proposal line's id, so an order line traces back to the quote the
        // customer accepted.
        source_proposal_line_id: trimmed(item.id),
      });
    }
  }

  return lines;
}

export interface MaterializeSummary {
  lineCount: number;
  totalQuantity: number;
  totalCost: number;
  totalSell: number;
  /** Distinct manufacturers on the order, in first-seen order. */
  manufacturers: string[];
  /**
   * Lines naming no manufacturer at all. These cannot be grouped into an order
   * with anyone, so they are the ones worth surfacing before the order exists.
   */
  unnamedManufacturerLineCount: number;
}

/**
 * What materialization would produce, without writing anything. Intended for a
 * confirmation step: a dealer should see what an order contains, and which
 * lines name nobody to buy from, before it is created rather than after.
 */
export function summarizeMaterialization(
  lines: MaterializedOrderLine[]
): MaterializeSummary {
  const manufacturers: string[] = [];
  let unnamed = 0;

  for (const line of lines) {
    const name = line.manufacturer_name;
    if (!name) {
      unnamed += 1;
      continue;
    }
    if (!manufacturers.includes(name)) manufacturers.push(name);
  }

  return {
    lineCount: lines.length,
    totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
    totalCost: round2(
      lines.reduce((sum, l) => sum + l.quantity * l.unit_cost, 0)
    ),
    totalSell: round2(lines.reduce((sum, l) => sum + l.sell_price, 0)),
    manufacturers,
    unnamedManufacturerLineCount: unnamed,
  };
}
