/**
 * Pricing Types
 *
 * Canonical shape for priced line items, the sections that group them, and the
 * calculated summary. These live outside the proposal feature because the same
 * shapes are consumed by order lines, purchase orders, and job costing — not
 * just by the proposal editor.
 *
 * Re-exported from FormBuilderContext for backwards compatibility.
 */

/**
 * How a line's unit cost is arrived at.
 *
 * - `cost_up`   — the dealer enters a unit cost directly. The original and
 *                 default behavior; everything authored in the app works this way.
 * - `list_down` — the line carries a manufacturer list price and a dealer
 *                 discount off that list. Unit cost is derived. This is how
 *                 contract furniture is priced and how specification exports
 *                 (SIF, CAP worksheets) deliver their lines.
 */
export type PricingMode = 'cost_up' | 'list_down';

/**
 * Specification metadata carried by a line that originated in a spec tool
 * (CET, Giza, 2020, ProjectMatrix). Inert for pricing — it exists so an
 * imported line keeps its provenance through to the purchase order.
 */
export interface LineSpecMetadata {
  /** Manufacturer as named by the source file (e.g. "Steelcase") */
  manufacturerName?: string;
  /** FK to product_manufacturers once resolved against the catalog */
  manufacturerId?: string;
  /** Series or product line as named by the source file */
  seriesName?: string;
  /** FK to product_series once resolved */
  seriesId?: string;
  /** Raw option / configuration code string from the spec tool */
  optionString?: string;
  /** Room or area the line was specified into */
  area?: string;
  /** Phase or tag grouping from the spec, used for phased ordering */
  specPhase?: string;
  /** Line number in the originating file, preserved for reconciliation */
  sourceLineNumber?: number;
}

export interface PricingLineItem extends LineSpecMetadata {
  id: string;
  name: string;
  /** Model number from product (for display) */
  modelNumber?: string;
  quantity: number;
  sellRule: string;
  /**
   * Dealer cost per unit. In `list_down` mode this is derived from
   * listPrice and dealerDiscountPercent — read it through resolveUnitCost
   * rather than trusting a stale stamped value.
   */
  unitCost: number;
  /** Which direction cost is derived from. Absent means `cost_up`. */
  pricingMode?: PricingMode;
  /** Manufacturer list price per unit. `list_down` mode only. */
  listPrice?: number;
  /**
   * Dealer discount off list, as a percentage. 55 means "55 off list",
   * i.e. a 0.45 multiplier. `list_down` mode only.
   */
  dealerDiscountPercent?: number;
  /** Markup value - interpreted based on markupType (percent or dollar amount) */
  markupValue: number;
  /** Markup type: 'percent' or 'dollar' (default: percent) */
  markupType?: 'percent' | 'dollar';
  isTaxable?: boolean;
  /** Source product ID - links to Product.id for cascade delete */
  sourceProductId?: string;
  /** Discount value (applied after markup, before tax) */
  discountValue?: number;
  /** Discount type: 'percent' or 'dollar' */
  discountType?: 'percent' | 'dollar';
  // Calculated fields (stored for reference)
  /** Calculated sell price for this line item */
  sellPrice?: number;
  /** Calculated tax amount for this line item */
  taxAmount?: number;
}

export interface PricingSection {
  id: string;
  name: string;
  type: string;
  collapsed: boolean;
  lineItems: PricingLineItem[];
}

/** Calculated pricing summary (stored for reference/reporting) */
export interface PricingSummary {
  /** Total cost of goods (before markup) */
  totalCost: number;
  /**
   * Total manufacturer list value, before any dealer discount. Zero unless
   * lines carry a list price — i.e. they came from a specification import.
   * Optional so summaries persisted before list-down pricing still typecheck.
   */
  totalList?: number;
  /** Subtotal (after markup, before tax) - this is total_value */
  subtotal: number;
  /** Gross profit (subtotal - totalCost) */
  grossProfit: number;
  /** Gross profit as percentage of subtotal */
  grossProfitPercent: number;
  /** Total tax amount */
  totalTax: number;
  /** Grand total (subtotal + tax) */
  grandTotal: number;
}

export interface PricingData {
  sections: PricingSection[];
  salesTaxPercent?: number;
  /** US state code for auto tax rate lookup */
  taxState?: string;
  /** Calculated summary totals */
  summary?: PricingSummary;
}
