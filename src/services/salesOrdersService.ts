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
import { fetchProposalById } from '@/services/proposalsService';
import {
  allocateDocumentNumber,
  SALES_ORDER_DOCUMENT_TYPE,
} from '@/services/numberingConfigService';

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
  /** Ordered minus received. Never negative, so an overage is not owed work. */
  qty_to_receive: number;
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

export interface MaterializePreview {
  lines: MaterializedOrderLine[];
  summary: MaterializeSummary;
}

/**
 * What creating an order from this proposal would produce, without writing.
 *
 * Call this before createOrderFromProposal and show the summary: a dealer needs
 * to see what the order contains, and which lines name nobody to buy from,
 * before the order exists rather than after.
 */
export async function previewOrderFromProposal(
  proposalId: string
): Promise<MaterializePreview> {
  const proposal = await fetchProposalById(proposalId);
  if (!proposal) {
    throw new Error('Proposal not found.');
  }

  const sections = readPricingSections(proposal.form_data);
  if (sections.length === 0) {
    throw new Error('This proposal has no priced line items to order.');
  }

  const lines = materializeOrderLines(sections);

  if (lines.length === 0) {
    throw new Error('This proposal has no orderable line items.');
  }

  return { lines, summary: summarizeMaterialization(lines) };
}

/**
 * Create a sales order and its lines from a proposal, atomically.
 *
 * Returns the new order's id. Lines naming no manufacturer are still created —
 * they are real scope that has been sold — but cannot be grouped into an order
 * with anyone until the specification names one. Dropping them would hide sold
 * work.
 */
export async function createOrderFromProposal(
  proposalId: string,
  input: Omit<CreateSalesOrderInput, 'proposal_id'>
): Promise<string> {
  const { lines } = await previewOrderFromProposal(proposalId);

  // Allocated only when the caller has not supplied one, so an order imported
  // with a number from elsewhere keeps it. A blank string counts as absent,
  // which `??` would not catch.
  const supplied = input.order_number?.trim();
  const order_number =
    supplied && supplied.length > 0
      ? supplied
      : await allocateOrderNumber(input.organization_id);

  return createSalesOrderWithLines(
    { ...input, order_number, proposal_id: proposalId },
    lines
  );
}

/**
 * The next sales order number, or null if numbering is unavailable.
 *
 * Deliberately non-fatal: a dealer who has just won a job should not be blocked
 * from recording it because a counter could not be read. An order without a
 * number is visibly a draft and can be numbered later; an order that failed to
 * save is lost work.
 */
async function allocateOrderNumber(organizationId: string): Promise<string | null> {
  try {
    const { number } = await allocateDocumentNumber(
      organizationId,
      SALES_ORDER_DOCUMENT_TYPE
    );
    return number;
  } catch (error) {
    console.error('[salesOrdersService] could not allocate an order number:', error);
    return null;
  }
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


// ============================================================================
// Derived status
// ============================================================================

export interface SalesOrderProgress {
  sales_order_id: string;
  stored_status: string;
  derived_status: string;
  line_count: number;
  qty_total: number;
  qty_purchasable: number;
  qty_ordered: number;
  qty_received: number;
  qty_installed: number;
}

/**
 * Where each order on the board has actually got to, keyed by order id.
 *
 * Read this rather than sales_orders.status. The stored column is set once at
 * creation and immediately starts lying -- a half-received job still reads
 * 'Released' because nobody went back to change it. The view derives from
 * order_line_events, so it cannot drift.
 *
 * Draft and Cancelled pass through untouched: those are decisions, and no
 * amount of event history implies them.
 */
export async function getOrderProgress(
  organizationId: string
): Promise<Record<string, SalesOrderProgress>> {
  const { data, error } = await supabase
    .from('sales_order_progress')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[salesOrdersService] getOrderProgress failed:', error);
    throw new Error(`Failed to load order progress: ${error.message}`);
  }

  const rows = (data || []) as unknown as SalesOrderProgress[];
  return Object.fromEntries(rows.map(row => [row.sales_order_id, row]));
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

// ============================================================================
// Observed discount rates
// ============================================================================

export interface ObservedRateRow {
  organization_id: string;
  manufacturer_name: string | null;
  series_name: string | null;
  contract_vehicle: string | null;
  line_count: number;
  discount_percent: number;
  assumed_discount_percent: number | null;
  drift_percent: number | null;
  min_discount_percent: number;
  max_discount_percent: number;
  last_seen_at: string | null;
}

/**
 * Discount rates as manufacturers have actually acknowledged them, beside the
 * rate the quote assumed.
 *
 * Empty is a meaningful answer: a dealer who has recorded no acknowledgments
 * has no evidence, which is different from having no drift.
 */
export async function getObservedRates(
  organizationId: string
): Promise<ObservedRateRow[]> {
  const { data, error } = await supabase
    .from('observed_vendor_discounts')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[salesOrdersService] getObservedRates failed:', error);
    throw new Error(`Failed to load discount rates: ${error.message}`);
  }

  return (data || []) as unknown as ObservedRateRow[];
}

// ============================================================================
// Specification revisions
// ============================================================================

/**
 * Order lines paired with how much of each has been ordered.
 *
 * The fulfillment figure is what makes a diff safe: without it every line looks
 * free to change, including the ones a factory has already been told to build.
 */
export async function getLinesForDiff(
  salesOrderId: string
): Promise<import('@/lib/sif/diff').ExistingLine[]> {
  const [lines, fulfillment] = await Promise.all([
    getOrderLines(salesOrderId),
    getOrderFulfillment(salesOrderId),
  ]);

  return lines
    .filter(line => line.status !== 'Cancelled')
    .map(line => ({
      id: line.id,
      line_number: line.line_number,
      manufacturer_name: line.manufacturer_name,
      model_number: line.model_number,
      description: line.description,
      option_string: line.option_string,
      quantity: Number(line.quantity),
      unit_cost: Number(line.unit_cost),
      list_price: line.list_price === null ? null : Number(line.list_price),
      source_line_number: line.source_line_number,
      qty_ordered: Number(fulfillment[line.id]?.qty_ordered ?? 0),
      fulfillment_type: line.fulfillment_type,
    }));
}

export interface RevisionResult {
  updated: number;
  added: number;
  removed: number;
  /** Lines the database refused because they are already on order. */
  refused: number;
}

/**
 * Apply a reviewed revision.
 *
 * Already-ordered lines are excluded by the caller and refused again by the
 * function — two guards on purpose, because the failure is silent and
 * expensive: editing a line the factory has been told to build destroys the
 * record of what was actually ordered.
 */
export async function applySpecRevision(
  salesOrderId: string,
  payload: {
    updates: Record<string, unknown>[];
    additions: Record<string, unknown>[];
    removals: { id: string }[];
  }
): Promise<RevisionResult> {
  const { data, error } = await supabase.rpc('apply_spec_revision' as never, {
    p_sales_order_id: salesOrderId,
    p_updates: payload.updates,
    p_additions: payload.additions,
    p_removals: payload.removals,
  } as never);

  if (error) {
    console.error('[salesOrdersService] applySpecRevision failed:', error);
    throw new Error(`Failed to apply the revision: ${error.message}`);
  }

  return data as unknown as RevisionResult;
}
