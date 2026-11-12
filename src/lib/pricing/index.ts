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
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
  inferFulfillmentType,
  resolveFulfillmentType,
  isPurchasable,
  isWorkOrderLine,
} from './fulfillment';

export { summarizeVariance, sortVarianceQueue, varianceAmount } from './variance';

export { summarizeReceipt, buildReceiptLines } from './receiving';

export type {
  ReceiptEntry,
  ReceiptTotals,
  ReceiptLinePayload,
} from './receiving';

export type {
  VarianceStatus,
  VarianceLine,
  VarianceSummary,
} from './variance';

export {
  lineDiscountPercent,
  findObservedRate,
  detectDiscountAnomaly,
  findDriftingRates,
} from './observed';

export type {
  ObservedRate,
  ObservedRateQuery,
  DiscountAnomaly,
  AnomalyOptions,
  RateDrift,
  DriftOptions,
} from './observed';

export type {
  PricingLineItem,
  PricingSection,
  PricingSummary,
  PricingData,
  PricingMode,
  FulfillmentType,
  LineSpecMetadata,
} from '@/lib/types/pricing';
