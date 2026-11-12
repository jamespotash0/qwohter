/**
 * Vendor Order Service
 *
 * The fan-out: one customer order splits into N manufacturer orders. A
 * 1,200-line job might be six orders to six factories, each acknowledged,
 * shipped, and invoiced on its own schedule.
 *
 * This application does NOT compose or transmit purchase orders -- dealers
 * place them in the manufacturer's own portal. What is recorded here is the
 * split and the result: who each group of lines went to, under what order
 * number, and what came back on the acknowledgment.
 *
 * Recording an order goes through the create_vendor_po_with_lines RPC so the
 * header, its lines, and the 'ordered' fulfillment events land together. Lines
 * that exist without their events would leave those quantities looking
 * unordered, and the next fan-out would buy the same product twice.
 *
 * Quantities are never stored on order lines. Read them from
 * order_line_fulfillment.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import {
  round2,
  sortVarianceQueue,
  isPurchasable,
  type FulfillmentType,
} from '@/lib/pricing';

type VendorPORow = Database['public']['Tables']['vendor_pos']['Row'];
type POLineRow = Database['public']['Tables']['po_lines']['Row'];
type VarianceRow = Database['public']['Views']['po_line_variance']['Row'];

export type VendorPO = VendorPORow;
export type POLine = POLineRow;
export type POLineVariance = VarianceRow;
export type VendorPOStatus = NonNullable<VendorPORow['status']>;

export type { VarianceStatus, VarianceSummary } from '@/lib/pricing';
export { summarizeVariance } from '@/lib/pricing';

// ============================================================================
// Fan-out planning
// ============================================================================

/** One manufacturer's share of an order, before anything is written. */
export interface FanOutGroup {
  manufacturerName: string;
  lines: {
    orderLineId: string;
    lineNumber: number;
    description: string;
    modelNumber: string | null;
    quantity: number;
    unitCost: number;
    extendedCost: number;
  }[];
  totalCost: number;
}

export interface FanOutLineRef {
  orderLineId: string;
  lineNumber: number;
  description: string;
  manufacturerName: string | null;
  quantity: number;
}

export interface FanOutPlan {
  groups: FanOutGroup[];
  /**
   * Purchasable lines naming no manufacturer, so there is nobody to group them
   * with. These genuinely block ordering and must be surfaced — they are scope
   * the customer already bought.
   */
  unassignedLines: FanOutLineRef[];
  /**
   * Lines whose fulfillment type was never set, so nothing can claim them:
   * ordering does not know to buy them, scheduling does not know to crew them.
   * Fixed in the form's section settings, not here.
   */
  unroutedLines: FanOutLineRef[];
  /**
   * Lines this order will never purchase — the dealer's own labor, and costs
   * re-billed rather than procured. Reported so the caller can show a complete
   * picture of the order without implying anything is wrong.
   */
  notPurchased: (FanOutLineRef & { fulfillmentType: FulfillmentType })[];
}

/**
 * What purchase orders this sales order still needs, grouped by vendor.
 *
 * Reads outstanding quantity from order_line_fulfillment rather than assuming
 * nothing has been ordered, so this is safe to run repeatedly as a job is
 * released in phases.
 */
export async function planFanOut(salesOrderId: string): Promise<FanOutPlan> {
  const [{ data: lines, error: linesError }, { data: fulfillment, error: fError }] =
    await Promise.all([
      supabase
        .from('order_lines')
        .select('*')
        .eq('sales_order_id', salesOrderId)
        .neq('status', 'Cancelled')
        .order('line_number', { ascending: true }),
      supabase
        .from('order_line_fulfillment')
        .select('order_line_id, qty_to_order')
        .eq('sales_order_id', salesOrderId),
    ]);

  if (linesError) {
    console.error('[vendorPOService] planFanOut lines failed:', linesError);
    throw new Error(`Failed to load order lines: ${linesError.message}`);
  }
  if (fError) {
    console.error('[vendorPOService] planFanOut fulfillment failed:', fError);
    throw new Error(`Failed to load fulfillment: ${fError.message}`);
  }

  const toOrder = new Map(
    (fulfillment ?? []).map(row => [row.order_line_id, Number(row.qty_to_order ?? 0)])
  );

  const groups = new Map<string, FanOutGroup>();
  const unassignedLines: FanOutLineRef[] = [];
  const unroutedLines: FanOutLineRef[] = [];
  const notPurchased: FanOutPlan['notPurchased'] = [];

  for (const line of lines ?? []) {
    const outstanding = toOrder.get(line.id) ?? Number(line.quantity);
    // Fully ordered already, or reversed past zero by a cancellation.
    if (outstanding <= 0) continue;

    const ref: FanOutLineRef = {
      orderLineId: line.id,
      lineNumber: line.line_number,
      description: line.description,
      manufacturerName: line.manufacturer_name,
      quantity: outstanding,
    };

    const fulfillmentType = line.fulfillment_type as FulfillmentType | null;

    // Nothing decided how this line is delivered. Not a supplier problem, and
    // telling the user to name one would send them to the wrong screen.
    if (!fulfillmentType) {
      unroutedLines.push(ref);
      continue;
    }

    // The dealer's own crew, or a cost re-billed. These are never bought, so
    // reporting them as needing a supplier would train people to ignore the
    // warning that actually matters.
    if (!isPurchasable(fulfillmentType)) {
      notPurchased.push({ ...ref, fulfillmentType });
      continue;
    }

    // Who supplies it is what groups the split. A line naming nobody cannot be
    // grouped with anyone, which is a specification gap rather than a setup one.
    const manufacturer = line.manufacturer_name?.trim();

    if (!manufacturer) {
      unassignedLines.push(ref);
      continue;
    }

    const unitCost = Number(line.unit_cost);
    const entry = groups.get(manufacturer) ?? {
      manufacturerName: manufacturer,
      lines: [],
      totalCost: 0,
    };

    entry.lines.push({
      orderLineId: line.id,
      lineNumber: line.line_number,
      description: line.description,
      modelNumber: line.model_number,
      quantity: outstanding,
      unitCost,
      extendedCost: round2(outstanding * unitCost),
    });
    entry.totalCost = round2(entry.totalCost + outstanding * unitCost);
    groups.set(manufacturer, entry);
  }

  return {
    groups: [...groups.values()].sort((a, b) =>
      a.manufacturerName.localeCompare(b.manufacturerName)
    ),
    unassignedLines,
    unroutedLines,
    notPurchased,
  };
}

// ============================================================================
// Issuing
// ============================================================================

export interface CreateVendorPOInput {
  organization_id: string;
  sales_order_id: string;
  manufacturer_name: string;
  po_number?: string | null;
  status?: VendorPOStatus;
  payment_terms?: string | null;
  freight_terms?: string | null;
  requested_ship_date?: string | null;
  ship_to_name?: string | null;
  ship_to_address_line1?: string | null;
  ship_to_address_line2?: string | null;
  ship_to_city?: string | null;
  ship_to_state?: string | null;
  ship_to_postal_code?: string | null;
  ship_to_country?: string | null;
  notes?: string | null;
}

export interface POLineInput {
  order_line_id: string;
  quantity: number;
}

/**
 * Create one purchase order and its lines atomically.
 *
 * Unit cost is read from the order line inside the database function, not sent
 * from here — what the dealer is committing to buy at is not the client's to
 * assert.
 */
export async function createVendorPO(
  po: CreateVendorPOInput,
  lines: POLineInput[]
): Promise<string> {
  if (lines.length === 0) {
    throw new Error('A purchase order needs at least one line.');
  }

  const { data, error } = await supabase.rpc('create_vendor_po_with_lines', {
    p_po: po as unknown as Json,
    p_lines: lines as unknown as Json,
  });

  if (error) {
    console.error('[vendorPOService] createVendorPO failed:', error);
    if (error.code === '23505') {
      throw new Error(`Purchase order number "${po.po_number}" is already in use.`);
    }
    throw new Error(`Failed to create purchase order: ${error.message}`);
  }

  if (!data) {
    throw new Error('Purchase order was not created.');
  }

  return data;
}

/**
 * Trimmed value, or null when absent or blank. `??` would keep an empty string,
 * and a blank order number stored as '' reads as a real one.
 */
const trimmedOrNull = (value: string | undefined): string | null => {
  const t = value?.trim();
  return t === undefined || t.length === 0 ? null : t;
};

export interface FanOutResult {
  created: { manufacturerName: string; purchaseOrderId: string }[];
  failed: { manufacturerName: string; error: string }[];
}

/**
 * Record an order for every manufacturer group in a plan.
 *
 * Each is written independently: if one fails, the others still land rather
 * than the whole release rolling back. Failures come back with the plan so the
 * caller can report exactly which manufacturers were not recorded.
 *
 * `poNumberByManufacturer` carries the order number the manufacturer's portal
 * assigned, keyed by manufacturer name. It is optional because a dealer may
 * record the split before placing, then fill the numbers in afterwards.
 */
export async function fanOutPurchaseOrders(
  plan: FanOutPlan,
  base: Omit<CreateVendorPOInput, 'manufacturer_name' | 'po_number'>,
  poNumberByManufacturer: Record<string, string> = {}
): Promise<FanOutResult> {
  const created: FanOutResult['created'] = [];
  const failed: FanOutResult['failed'] = [];

  for (const group of plan.groups) {
    try {
      const purchaseOrderId = await createVendorPO(
        {
          ...base,
          manufacturer_name: group.manufacturerName,
          po_number: trimmedOrNull(poNumberByManufacturer[group.manufacturerName]),
        },
        group.lines.map(line => ({
          order_line_id: line.orderLineId,
          quantity: line.quantity,
        }))
      );
      created.push({ manufacturerName: group.manufacturerName, purchaseOrderId });
    } catch (error) {
      failed.push({
        manufacturerName: group.manufacturerName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { created, failed };
}

// ============================================================================
// Queries
// ============================================================================

export async function getVendorPOs(salesOrderId: string): Promise<VendorPO[]> {
  const { data, error } = await supabase
    .from('vendor_pos')
    .select('*')
    .eq('sales_order_id', salesOrderId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[vendorPOService] getVendorPOs failed:', error);
    throw new Error(`Failed to load purchase orders: ${error.message}`);
  }

  return data ?? [];
}

export async function getPOLines(vendorPOId: string): Promise<POLine[]> {
  const { data, error } = await supabase
    .from('po_lines')
    .select('*')
    .eq('vendor_po_id', vendorPOId)
    .order('line_number', { ascending: true });

  if (error) {
    console.error('[vendorPOService] getPOLines failed:', error);
    throw new Error(`Failed to load purchase order lines: ${error.message}`);
  }

  return data ?? [];
}

/**
 * The variance queue — the screen a PM opens in the morning.
 *
 * Defaults to lines that need attention: still awaiting an acknowledgment, or
 * acknowledged at a price or date that moved. Pass includeMatched to see
 * everything.
 */
export async function getVarianceQueue(
  organizationId: string,
  options: { includeMatched?: boolean; limit?: number } = {}
): Promise<POLineVariance[]> {
  const { includeMatched = false, limit = 200 } = options;

  let query = supabase
    .from('po_line_variance')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(limit);

  if (!includeMatched) {
    query = query.neq('variance_status', 'match');
  }

  const { data, error } = await query;

  if (error) {
    console.error('[vendorPOService] getVarianceQueue failed:', error);
    throw new Error(`Failed to load variance queue: ${error.message}`);
  }

  // Ordered in code rather than SQL so the queue's ranking lives with the rest
  // of the variance logic.
  return sortVarianceQueue(data ?? []);
}

// ============================================================================
// Acknowledgment
// ============================================================================

export interface AcknowledgeLineInput {
  poLineId: string;
  ackedQuantity: number;
  ackedUnitCost: number;
  ackedShipDate?: string | null;
}

/**
 * Record what a manufacturer came back with.
 *
 * cost_variance is a generated column, so it follows from these values and
 * cannot drift. Writing acknowledged_at is what moves a line out of
 * 'awaiting_ack' — leaving it null means the acknowledgment never arrived,
 * which is a different problem from one that arrived unchanged.
 */
export async function acknowledgePOLines(
  vendorPOId: string,
  lines: AcknowledgeLineInput[],
  header: { vendorAckNumber?: string | null; acknowledgedShipDate?: string | null } = {}
): Promise<void> {
  const acknowledgedAt = new Date().toISOString();

  for (const line of lines) {
    const { error } = await supabase
      .from('po_lines')
      .update({
        acked_quantity: line.ackedQuantity,
        acked_unit_cost: line.ackedUnitCost,
        acked_ship_date: line.ackedShipDate ?? null,
        acknowledged_at: acknowledgedAt,
      })
      .eq('id', line.poLineId);

    if (error) {
      console.error('[vendorPOService] acknowledgePOLines failed:', error);
      throw new Error(`Failed to record acknowledgment: ${error.message}`);
    }
  }

  const { error: headerError } = await supabase
    .from('vendor_pos')
    .update({
      status: 'Acknowledged',
      acknowledged_at: acknowledgedAt,
      vendor_ack_number: header.vendorAckNumber ?? null,
      acknowledged_ship_date: header.acknowledgedShipDate ?? null,
    })
    .eq('id', vendorPOId);

  if (headerError) {
    console.error('[vendorPOService] acknowledge header failed:', headerError);
    throw new Error(`Failed to update purchase order: ${headerError.message}`);
  }
}

export async function updateVendorPO(
  vendorPOId: string,
  patch: Partial<CreateVendorPOInput> & {
    sent_at?: string | null;
    sent_to_email?: string | null;
  }
): Promise<VendorPO> {
  const { data, error } = await supabase
    .from('vendor_pos')
    .update(patch)
    .eq('id', vendorPOId)
    .select()
    .single();

  if (error) {
    console.error('[vendorPOService] updateVendorPO failed:', error);
    if (error.code === '23505') {
      throw new Error(`Purchase order number "${patch.po_number}" is already in use.`);
    }
    throw new Error(`Failed to update purchase order: ${error.message}`);
  }

  return data;
}
