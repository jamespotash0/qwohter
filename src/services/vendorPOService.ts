/**
 * Vendor Purchase Order Service
 *
 * The fan-out: one customer order becomes N purchase orders, one per
 * manufacturer. A 1,200-line job might be six POs to six factories, each
 * acknowledged, shipped, and invoiced on its own schedule.
 *
 * Issuing a PO goes through the create_vendor_po_with_lines RPC so the header,
 * its lines, and the 'ordered' fulfillment events land together. A PO whose
 * lines exist but whose events do not would leave those quantities looking
 * unordered, and the next fan-out would buy the same product twice.
 *
 * Quantities are never stored on order lines. Read them from
 * order_line_fulfillment.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { round2, sortVarianceQueue } from '@/lib/pricing';

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

/** One vendor's share of an order, before anything is written. */
export interface FanOutGroup {
  vendorId: string;
  vendorName: string;
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

export interface FanOutPlan {
  groups: FanOutGroup[];
  /**
   * Lines with quantity still to order but no vendor assigned. These block
   * ordering and must be surfaced, not silently skipped — they are scope the
   * customer already bought.
   */
  unassignedLines: {
    orderLineId: string;
    lineNumber: number;
    description: string;
    manufacturerName: string | null;
    quantity: number;
  }[];
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
        .select('*, vendors(id, name)')
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
  const unassignedLines: FanOutPlan['unassignedLines'] = [];

  for (const line of lines ?? []) {
    const outstanding = toOrder.get(line.id) ?? Number(line.quantity);
    // Fully ordered already, or reversed past zero by a cancellation.
    if (outstanding <= 0) continue;

    const vendor = (line as { vendors?: { id: string; name: string } | null }).vendors;

    if (!vendor) {
      unassignedLines.push({
        orderLineId: line.id,
        lineNumber: line.line_number,
        description: line.description,
        manufacturerName: line.manufacturer_name,
        quantity: outstanding,
      });
      continue;
    }

    const unitCost = Number(line.unit_cost);
    const entry = groups.get(vendor.id) ?? {
      vendorId: vendor.id,
      vendorName: vendor.name,
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
    groups.set(vendor.id, entry);
  }

  return {
    groups: [...groups.values()].sort((a, b) => a.vendorName.localeCompare(b.vendorName)),
    unassignedLines,
  };
}

// ============================================================================
// Issuing
// ============================================================================

export interface CreateVendorPOInput {
  organization_id: string;
  sales_order_id: string;
  vendor_id: string;
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
 * Issue a purchase order for every vendor group in a plan.
 *
 * Each PO is created independently: if one vendor fails, the others still land
 * rather than the whole release rolling back. Failures come back with the plan
 * so the caller can report exactly which vendors did not get an order.
 */
export async function fanOutPurchaseOrders(
  plan: FanOutPlan,
  base: Omit<CreateVendorPOInput, 'vendor_id' | 'po_number'>,
  poNumberFor?: (group: FanOutGroup, index: number) => string | undefined
): Promise<{
  created: { vendorId: string; vendorName: string; purchaseOrderId: string }[];
  failed: { vendorId: string; vendorName: string; error: string }[];
}> {
  const created: { vendorId: string; vendorName: string; purchaseOrderId: string }[] = [];
  const failed: { vendorId: string; vendorName: string; error: string }[] = [];

  for (const [index, group] of plan.groups.entries()) {
    try {
      const purchaseOrderId = await createVendorPO(
        { ...base, vendor_id: group.vendorId, po_number: poNumberFor?.(group, index) ?? null },
        group.lines.map(line => ({
          order_line_id: line.orderLineId,
          quantity: line.quantity,
        }))
      );
      created.push({ vendorId: group.vendorId, vendorName: group.vendorName, purchaseOrderId });
    } catch (error) {
      failed.push({
        vendorId: group.vendorId,
        vendorName: group.vendorName,
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
