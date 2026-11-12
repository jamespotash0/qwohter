/**
 * Specification lines → proposal pricing sections
 *
 * The step that was missing. A specification file is the bill of materials for
 * a contract furniture job, and it arrives when the job is *quoted* — a
 * designer works in CET, Giza, 2020 or ProjectMatrix, exports, and that file is
 * what the client is about to be quoted from. Until now the parser could only
 * reach an order, which meant the quote had to be built from something else and
 * the same job was described twice.
 *
 * The shapes were always compatible. `LineSpecMetadata` on a pricing line names
 * its fields "as named by the source file" and keeps `sourceLineNumber` "for
 * reconciliation" — it was designed to receive exactly this. This is the
 * conversion nobody wrote.
 *
 * Pure, and deliberately does not price anything. Cost was resolved by the
 * mapper from what the file actually said; sell is computed downstream by
 * `calculatePricing` from cost and markup. A converter that quietly invented a
 * margin here would produce a quote nobody checked.
 */

import type { MaterializedOrderLine } from '@/lib/pricing/materialize';
import type { PricingLineItem, PricingSection } from '@/lib/types/pricing';

export interface ToPricingOptions {
  /**
   * Unique within the proposal. Section and line ids are built from it, so
   * importing two files into one proposal must pass two different seeds.
   * A parameter rather than `Date.now()` because this has to be testable.
   */
  idSeed: string;
  /** Section name for lines whose file carried no area. */
  fallbackSectionName?: string;
  /** Whether imported lines are taxable. Most dealers set this per section. */
  isTaxable?: boolean;
}

export interface ToPricingResult {
  sections: PricingSection[];
  /** Total manufacturer list value across every imported line. */
  totalList: number;
  /** Total resolved dealer cost across every imported line. */
  totalCost: number;
  /**
   * Lines whose cost could not be resolved from the file. These import at zero
   * or at list, and both are wrong in a way that reads as margin.
   */
  needsCost: number;
  /**
   * Lines carrying no manufacturer. A spec tool always names one, so these are
   * usually freight or labour rows the dealer added to the file by hand — they
   * import, but they cannot be purchased until somebody routes them.
   */
  withoutManufacturer: number;
  /** Lines that will quote at zero margin until a markup is applied. */
  zeroMargin: number;
}

/** Empty-safe, so an unnamed area never produces a section called "null". */
const sectionNameFor = (area: string | null, fallback: string): string => {
  const trimmed = area?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

/**
 * Group specification lines into pricing sections, one per area.
 *
 * Area is the grouping because that is what it already means on both sides:
 * dealers name pricing sections after rooms and phases, and a spec tool exports
 * the room it specified into. Preserving that means the quote the client reads
 * is organised the way the designer laid the job out, without anybody
 * rearranging it.
 *
 * First-seen order is preserved rather than sorted. The order of areas in the
 * file is the order the designer walked the building, and alphabetising it
 * throws that away.
 */
export function specLinesToPricingSections(
  lines: MaterializedOrderLine[],
  options: ToPricingOptions
): ToPricingResult {
  const {
    idSeed,
    fallbackSectionName = 'Specification',
    isTaxable = false,
  } = options;

  const byArea = new Map<string, MaterializedOrderLine[]>();
  for (const line of lines) {
    const name = sectionNameFor(line.area, fallbackSectionName);
    const bucket = byArea.get(name);
    if (bucket) bucket.push(line);
    else byArea.set(name, [line]);
  }

  let totalList = 0;
  let totalCost = 0;
  let needsCost = 0;
  let withoutManufacturer = 0;
  let zeroMargin = 0;

  const sections: PricingSection[] = [];
  let sectionIndex = 0;

  for (const [name, areaLines] of byArea) {
    const lineItems: PricingLineItem[] = areaLines.map((line, index) => {
      const quantity = Number(line.quantity) || 0;
      const unitCost = Number(line.unit_cost) || 0;

      totalCost += unitCost * quantity;
      if (line.list_price !== null) totalList += Number(line.list_price) * quantity;

      // Cost of 0, or a list price carried through untouched because no
      // discount was known. The mapper already recorded why; this counts it so
      // the import screen can say so before anything is written.
      if (unitCost === 0) needsCost += 1;
      else if (line.pricing_mode === 'list_down' && line.dealer_discount_percent === null) {
        needsCost += 1;
      }

      if (!line.manufacturer_name) withoutManufacturer += 1;
      if (!line.markup_value) zeroMargin += 1;

      return {
        id: `spec_${idSeed}_${sectionIndex}_${index}`,
        // The description is what a client reads on the quote; the model number
        // is what the factory reads on the order. Both are kept.
        name: line.description,
        modelNumber: line.model_number ?? undefined,
        quantity,
        sellRule: line.sell_rule ?? 'flat_rate',
        unitCost,
        pricingMode: line.pricing_mode,
        listPrice: line.list_price ?? undefined,
        dealerDiscountPercent: line.dealer_discount_percent ?? undefined,
        markupValue: Number(line.markup_value) || 0,
        markupType: line.markup_type ?? 'percent',
        isTaxable,
        discountValue: 0,
        discountType: 'percent',

        // Provenance. This is what lets a revised file be diffed against the
        // quote later, and what carries the factory's own identifiers through
        // to the order without anybody retyping them.
        manufacturerName: line.manufacturer_name ?? undefined,
        seriesName: line.series_name ?? undefined,
        optionString: line.option_string ?? undefined,
        area: line.area ?? undefined,
        specPhase: line.spec_phase ?? undefined,
        sourceLineNumber: line.source_line_number ?? undefined,

        // Set per line rather than left to the section: a file can mix product
        // with a freight row somebody added, and they are not bought the same way.
        fulfillmentType: line.fulfillment_type ?? undefined,
      };
    });

    sections.push({
      id: `spec_section_${idSeed}_${sectionIndex}`,
      name,
      // The legacy category slug for product. A specification file describes
      // merchandise; labour and freight are added by the dealer afterwards.
      type: 'merchandise',
      // Diverges from a hand-added section, which defaults to `pass_through` so
      // that a blank section never raises a purchase order nobody asked for.
      // An imported line is not blank — it names a manufacturer, a model and a
      // list price, so it is product to be bought. Defaulting these to
      // pass_through would mean re-categorising every line of a 500-line file.
      fulfillmentType: 'purchase',
      collapsed: false,
      lineItems,
    });

    sectionIndex += 1;
  }

  return {
    sections,
    totalList,
    totalCost,
    needsCost,
    withoutManufacturer,
    zeroMargin,
  };
}
