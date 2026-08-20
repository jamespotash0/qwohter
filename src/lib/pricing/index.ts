/**
 * Pricing library — pure calculation for priced line items.
 *
 * Consumed by the proposal editor today; by order lines, purchase orders, and
 * job costing as the back office lands.
 */

export {
  round2,
  calculateDealerCost,
  discountToMultiplier,
  multiplierToDiscount,
  resolveUnitCost,
  calculateLineListTotal,
  calculateLineCost,
  calculateSellPrice,
  calculateLineTax,
  calculateSubtotal,
  calculateTotalCost,
  enrichSections,
  summarizeSections,
  calculatePricing,
  calculateCostMarkupPercent,
  formatCurrency,
} from './calculate';

export {
  materializeOrderLines,
  summarizeMaterialization,
} from './materialize';

export type {
  MaterializedOrderLine,
  MaterializeOptions,
  MaterializeSummary,
} from './materialize';

export {
  resolveDiscount,
  resolveDiscountPercent,
  isAgreementEffective,
} from './discounts';

export type {
  DiscountAgreement,
  DiscountQuery,
  ResolvedDiscount,
} from './discounts';

export type {
  PricingLineItem,
  PricingSection,
  PricingSummary,
  PricingData,
  PricingMode,
  LineSpecMetadata,
} from '@/lib/types/pricing';
