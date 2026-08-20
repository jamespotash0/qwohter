/**
 * Fulfillment Routing
 *
 * Decides how a priced line actually gets delivered, which decides whether it
 * can ever appear on a purchase order.
 *
 * A dealer sells product and service on one quote: chairs bought from Steelcase,
 * installation performed by their own crew, freight from a carrier, a tariff
 * re-billed at cost. Only some of those are things you *buy*, and only bought
 * things belong in the purchase order fan-out.
 *
 * Resolution order: the line's own override, then its section's setting, then a
 * guess from the section's legacy category slug.
 */

import type {
  FulfillmentType,
  PricingLineItem,
  PricingSection,
} from '@/lib/types/pricing';

export const FULFILLMENT_TYPES: FulfillmentType[] = [
  'purchase',
  'subcontract',
  'self_perform',
  'pass_through',
];

/** Labels and help text for the section editor. */
export const FULFILLMENT_TYPE_LABELS: Record<
  FulfillmentType,
  { label: string; description: string }
> = {
  purchase: {
    label: 'Purchased',
    description: 'Bought from a manufacturer. Goes on a purchase order.',
  },
  subcontract: {
    label: 'Subcontracted',
    description: 'Work someone else performs. Goes on a PO to that subcontractor.',
  },
  self_perform: {
    label: 'Self-performed',
    description: 'Your own crew or truck. Becomes a work order, never a PO.',
  },
  pass_through: {
    label: 'Pass-through',
    description: 'A cost you re-bill rather than procure. Tariffs, permits, storage.',
  },
};

/**
 * Best guess from a section's legacy category slug, for forms built before
 * fulfillment type existed.
 *
 * Anything unrecognised — including every user-added section, which the old
 * builder stamped as 'other' with no way to change it — resolves to null rather
 * than a guess. A wrong guess either raises a purchase order for the dealer's
 * own labor or silently drops product that needed buying; an explicit "unrouted"
 * is recoverable, and the section editor is where it gets fixed.
 */
export function inferFulfillmentType(
  sectionType: string | undefined
): FulfillmentType | null {
  switch (sectionType) {
    case 'merchandise':
      return 'purchase';
    case 'delivery_install':
      return 'self_perform';
    case 'freight':
      // Freight is bought — from the factory as prepaid-and-add, or from a
      // carrier. Either way it is procured, not performed.
      return 'purchase';
    case 'tariffs':
      return 'pass_through';
    default:
      return null;
  }
}

/**
 * How this line gets delivered, or null when nothing has decided.
 *
 * Null is a real answer and must be surfaced: it means the form never said, so
 * neither ordering nor scheduling can claim the line.
 */
export function resolveFulfillmentType(
  item: Pick<PricingLineItem, 'fulfillmentType'>,
  section?: Pick<PricingSection, 'fulfillmentType' | 'type'>
): FulfillmentType | null {
  if (item.fulfillmentType) return item.fulfillmentType;
  if (section?.fulfillmentType) return section.fulfillmentType;
  return inferFulfillmentType(section?.type);
}

/** Whether a line is something the dealer buys, and so belongs in the fan-out. */
export function isPurchasable(type: FulfillmentType | null): boolean {
  return type === 'purchase' || type === 'subcontract';
}

/** Whether a line is work the dealer performs, and so becomes a work order. */
export function isWorkOrderLine(type: FulfillmentType | null): boolean {
  return type === 'self_perform';
}
