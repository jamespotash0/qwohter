/**
 * Sales Orders Service
 *
 * The order spine. A won proposal materializes into a sales order and durable
 * order lines; everything downstream — purchase orders, receipts, work orders,
 * job costing — hangs off those lines.
 *
 * Creation goes through the create_sales_order_with_lines RPC because
 * supabase-js has no transaction and a real furniture order is hundreds to
 * thousands of lines. A partial insert would produce an order that looks
 * complete and silently under-orders.
 *
 * Fulfillment quantities are never stored. They are summed from
 * order_line_events through the order_line_fulfillment view — see
 * getOrderFulfillment.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  materializeOrderLines,
  summarizeMaterialization,
  type MaterializedOrderLine,
  type MaterializeSummary,
} from '@/lib/pricing';
import type { PricingSection } from '@/lib/types/pricing';
import { getVendors } from '@/services/vendorsService';
import { fetchProposalById } from '@/services/proposalsService';

// The Database type fails supabase-js's GenericSchema constraint (no
// `Relationships` key on any table), so reads and writes alike resolve to
// `never` and are effectively unchecked. The interfaces below describe rows;
// they do not verify them. See companiesService for the full explanation.
const table = (name: string) => supabase.from(name as never);

// ============================================================================
// Types
// ============================================================================

export type SalesOrderStatus =
  | 'Draft'
  | 'Released'
  | 'Partially Ordered'
  | 'Ordered'
  | 'Receiving'
  | 'Installing'
  | 'Complete'
  | 'Cancelled';

export type OrderLineStatus = 'Open' | 'Ordered' | 'Cancelled' | 'Closed';

export type OrderLineEventType =
  | 'ordered'
  | 'acknowledged'
  | 'shipped'
  | 'received'
  | 'installed'
  | 'invoiced';

export interface SalesOrder {
  id: string;
  organization_id: string;
  project_id: string;
  proposal_id: string | null;
  order_number: string | null;
  customer_po_number: string | null;
  company_id: string | null;
  ship_to_name: string | null;
  ship_to_address_line1: string | null;
  ship_to_address_line2: string | null;
  ship_to_city: string | null;
  ship_to_state: string | null;
  ship_to_postal_code: string | null;
  ship_to_country: string | null;
  contract_vehicle: string | null;
  status: SalesOrderStatus;
  requested_delivery_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderLine extends MaterializedOrderLine {
  id: string;
  organization_id: string;
  sales_order_id: string;
  status: OrderLineStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Derived quantities from order_line_fulfillment. Never stored. */
export interface OrderLineFulfillment {
  order_line_id: string;
  organization_id: string;
  sales_order_id: string;
  quantity_ordered_total: number;
  qty_ordered: number;
  qty_acknowledged: number;
  qty_shipped: number;
  qty_received: number;
  qty_installed: number;
  qty_invoiced: number;
  qty_to_order: number;
}

export interface CreateSalesOrderInput {
  organization_id: string;
  project_id: string;
  proposal_id?: string | null;
  order_number?: string | null;
  customer_po_number?: string | null;
  company_id?: string | null;
  ship_to_name?: string | null;
  ship_to_address_line1?: string | null;
  ship_to_address_line2?: string | null;
  ship_to_city?: string | null;
  ship_to_state?: string | null;
  ship_to_postal_code?: string | null;
  ship_to_country?: string | null;
  contract_vehicle?: string | null;
  status?: SalesOrderStatus;
  requested_delivery_date?: string | null;
  notes?: string | null;
}

// ============================================================================
// Queries
// ============================================================================

export async function getSalesOrdersForProject(
  projectId: string
): Promise<SalesOrder[]> {
  const { data, error } = await table('sales_orders')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[salesOrdersService] getSalesOrdersForProject failed:', error);
    throw new Error(`Failed to load sales orders: ${error.message}`);
  }

  return (data || []) as unknown as SalesOrder[];
}

/**
 * Every sales order for an organization, newest first, with the project and
 * company joined for the list view.
 */
export async function getSalesOrdersForOrganization(
  organizationId: string,
  limit = 100
): Promise<SalesOrder[]> {
  const { data, error } = await table('sales_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[salesOrdersService] getSalesOrdersForOrganization failed:', error);
    throw new Error(`Failed to load sales orders: ${error.message}`);
  }

  return (data || []) as unknown as SalesOrder[];
}

/**
 * The project a proposal was promoted to when it was won.
 *
 * An order hangs off the project, not the document, so a won proposal that was
 * never sent to the board cannot be ordered yet.
 */
export async function getProjectIdForProposal(
  proposalId: string
): Promise<string | null> {
  const { data, error } = await table('projects')
    .select('id')
    .eq('proposal_id', proposalId)
    .maybeSingle();

  if (error) {
    console.error('[salesOrdersService] getProjectIdForProposal failed:', error);
    throw new Error(`Failed to resolve the project: ${error.message}`);
  }

  return (data as unknown as { id: string } | null)?.id ?? null;
}

export async function getSalesOrderById(
  salesOrderId: string
): Promise<SalesOrder | null> {
  const { data, error } = await table('sales_orders')
    .select('*')
    .eq('id', salesOrderId)
    .maybeSingle();

  if (error) {
    console.error('[salesOrdersService] getSalesOrderById failed:', error);
    throw new Error(`Failed to load sales order: ${error.message}`);
  }

  return (data as unknown as SalesOrder) ?? null;
}

/** Every line on an order, in specification sequence. */
export async function getOrderLines(salesOrderId: string): Promise<OrderLine[]> {
  const { data, error } = await table('order_lines')
    .select('*')
    .eq('sales_order_id', salesOrderId)
    .order('line_number', { ascending: true });

  if (error) {
    console.error('[salesOrdersService] getOrderLines failed:', error);
    throw new Error(`Failed to load order lines: ${error.message}`);
  }

  return (data || []) as unknown as OrderLine[];
}

/**
 * Derived fulfillment quantities for an order's lines, keyed by line id.
 *
 * Read this rather than any column on order_lines — there is no stored counter,
 * deliberately, because partial shipments and damage replacements corrupt them.
 */
export async function getOrderFulfillment(
  salesOrderId: string
): Promise<Record<string, OrderLineFulfillment>> {
  const { data, error } = await table('order_line_fulfillment')
    .select('*')
    .eq('sales_order_id', salesOrderId);

  if (error) {
    console.error('[salesOrdersService] getOrderFulfillment failed:', error);
    throw new Error(`Failed to load fulfillment: ${error.message}`);
  }

  const rows = (data || []) as unknown as OrderLineFulfillment[];
  return Object.fromEntries(rows.map(row => [row.order_line_id, row]));
}

// ============================================================================
// Materialization
// ============================================================================

/** The priced sections stored on a proposal, if it has any. */
function readPricingSections(formData: unknown): PricingSection[] {
  const pricing = (formData as { pricing?: { sections?: PricingSection[] } } | null)
    ?.pricing;
  return pricing?.sections ?? [];
}

/**
 * Manufacturer name → vendor id for an organization, indexed case-insensitively
 * so spec files with inconsistent casing still resolve.
 */
async function buildVendorIndex(
  organizationId: string
): Promise<Record<string, string>> {
  const vendors = await getVendors(organizationId);
  const index: Record<string, string> = {};

  for (const vendor of vendors) {
    index[vendor.name] = vendor.id;
    index[vendor.name.toLowerCase()] = vendor.id;
  }

  return index;
}

export interface MaterializePreview {
  lines: MaterializedOrderLine[];
  summary: MaterializeSummary;
}

/**
 * What creating an order from this proposal would produce, without writing.
 *
 * Call this before createOrderFromProposal and show the summary: a dealer needs
 * to see "3 manufacturers have no vendor account, 47 lines cannot be ordered"
 * before the order exists, not after.
 */
export async function previewOrderFromProposal(
  proposalId: string,
  organizationId: string
): Promise<MaterializePreview> {
  const proposal = await fetchProposalById(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found.');
  }

  const sections = readPricingSections(proposal.form_data);
  if (sections.length === 0) {
    throw new Error('This proposal has no priced line items to order.');
  }

  const vendorIdByManufacturer = await buildVendorIndex(organizationId);
  const lines = materializeOrderLines(sections, { vendorIdByManufacturer });

  if (lines.length === 0) {
    throw new Error('This proposal has no orderable line items.');
  }

  return { lines, summary: summarizeMaterialization(lines) };
}

/**
 * Create a sales order and its lines from a proposal, atomically.
 *
 * Returns the new order's id. Lines with an unresolved vendor are created — they
 * are real scope that has been sold — but cannot be put on a purchase order
 * until a vendor is assigned. Dropping them would hide sold work.
 */
export async function createOrderFromProposal(
  proposalId: string,
  input: Omit<CreateSalesOrderInput, 'proposal_id'>
): Promise<string> {
  const { lines } = await previewOrderFromProposal(
    proposalId,
    input.organization_id
  );

  return createSalesOrderWithLines({ ...input, proposal_id: proposalId }, lines);
}

/**
 * Insert an order and its lines in a single transaction via RPC.
 *
 * Exposed separately from the proposal path so an order can also be built from
 * a specification import, which produces the same line shape.
 */
export async function createSalesOrderWithLines(
  order: CreateSalesOrderInput,
  lines: MaterializedOrderLine[]
): Promise<string> {
  const { data, error } = await supabase.rpc('create_sales_order_with_lines' as never, {
    p_order: order,
    p_lines: lines,
  } as never);

  if (error) {
    console.error('[salesOrdersService] createSalesOrderWithLines failed:', error);
    throw new Error(`Failed to create sales order: ${error.message}`);
  }

  const orderId = data as unknown as string | null;
  if (!orderId) {
    throw new Error('Sales order was not created.');
  }

  return orderId;
}

// ============================================================================
// Mutations
// ============================================================================

export async function updateSalesOrder(
  salesOrderId: string,
  patch: Partial<CreateSalesOrderInput>
): Promise<SalesOrder> {
  const { data, error } = await table('sales_orders')
    .update(patch as never)
    .eq('id', salesOrderId)
    .select()
    .single();

  if (error) {
    console.error('[salesOrdersService] updateSalesOrder failed:', error);
    if (error.code === '23505') {
      throw new Error(
        `Order number "${patch.order_number}" is already in use.`
      );
    }
    throw new Error(`Failed to update sales order: ${error.message}`);
  }

  return data as unknown as SalesOrder;
}

export async function updateOrderLine(
  orderLineId: string,
  patch: Partial<MaterializedOrderLine> & { status?: OrderLineStatus; notes?: string | null }
): Promise<OrderLine> {
  const { data, error } = await table('order_lines')
    .update(patch as never)
    .eq('id', orderLineId)
    .select()
    .single();

  if (error) {
    console.error('[salesOrdersService] updateOrderLine failed:', error);
    throw new Error(`Failed to update order line: ${error.message}`);
  }

  return data as unknown as OrderLine;
}

/**
 * Assign a vendor to every line naming a manufacturer, after the vendor account
 * is created. The common fix for a preview that reported unresolved lines.
 */
export async function assignVendorToLines(
  salesOrderId: string,
  manufacturerName: string,
  vendorId: string
): Promise<number> {
  const { data, error } = await table('order_lines')
    .update({ vendor_id: vendorId } as never)
    .eq('sales_order_id', salesOrderId)
    .ilike('manufacturer_name', manufacturerName)
    .is('vendor_id', null)
    .select('id');

  if (error) {
    console.error('[salesOrdersService] assignVendorToLines failed:', error);
    throw new Error(`Failed to assign vendor: ${error.message}`);
  }

  return ((data || []) as unknown as { id: string }[]).length;
}

// ============================================================================
// Fulfillment events
// ============================================================================

export interface RecordEventInput {
  organization_id: string;
  order_line_id: string;
  event_type: OrderLineEventType;
  /** Signed. Negative reverses a prior event (return, cancellation, correction). */
  quantity: number;
  occurred_at?: string;
  reference_type?:
    | 'vendor_po'
    | 'acknowledgment'
    | 'receipt'
    | 'work_order'
    | 'invoice'
    | 'manual';
  reference_id?: string | null;
  notes?: string | null;
}

/**
 * Append a fulfillment event.
 *
 * The table is append-only: a mistake is corrected by recording a compensating
 * negative event, not by editing history. That keeps the audit trail honest when
 * a manufacturer disputes what was received.
 */
export async function recordOrderLineEvent(
  input: RecordEventInput
): Promise<void> {
  if (input.quantity === 0) {
    throw new Error('A fulfillment event must move a non-zero quantity.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await table('order_line_events').insert({
    ...input,
    created_by: user?.id ?? null,
  } as never);

  if (error) {
    console.error('[salesOrdersService] recordOrderLineEvent failed:', error);
    throw new Error(`Failed to record ${input.event_type}: ${error.message}`);
  }
}

/** Append several events at once — one receipt covers many lines. */
export async function recordOrderLineEvents(
  events: RecordEventInput[]
): Promise<void> {
  if (events.length === 0) return;
  if (events.some(e => e.quantity === 0)) {
    throw new Error('A fulfillment event must move a non-zero quantity.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await table('order_line_events').insert(
    events.map(e => ({ ...e, created_by: user?.id ?? null })) as never
  );

  if (error) {
    console.error('[salesOrdersService] recordOrderLineEvents failed:', error);
    throw new Error(`Failed to record events: ${error.message}`);
  }
}
