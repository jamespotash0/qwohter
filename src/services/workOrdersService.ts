/**
 * Work Orders Service
 *
 * The service half of a dealer's job. Product is bought through purchase
 * orders; delivery and installation are scheduled here.
 *
 * A work order is performed either by one of the dealer's crews or by a
 * subcontractor. Both need a date, a site contact, and dock access — someone
 * else swinging the wrench does not remove the scheduling problem, it just
 * changes who is billed for it.
 *
 * Two rules are enforced by the database rather than here, deliberately:
 * a crew cannot be double-booked (an exclusion constraint over the scheduled
 * range), and a Scheduled work order must have a time and a performer.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { isWorkOrderLine, round2, type FulfillmentType } from '@/lib/pricing';

type CrewRow = Database['public']['Tables']['crews']['Row'];
type WorkOrderRow = Database['public']['Tables']['work_orders']['Row'];
type WorkOrderLineRow = Database['public']['Tables']['work_order_lines']['Row'];
type ScheduleRow = Database['public']['Views']['work_order_schedule']['Row'];

export type Crew = CrewRow;
export type WorkOrder = WorkOrderRow;
export type WorkOrderLine = WorkOrderLineRow;
export type ScheduledWorkOrder = ScheduleRow;

export type WorkType = NonNullable<WorkOrderRow['work_type']>;
export type WorkOrderStatus = NonNullable<WorkOrderRow['status']>;

/** Postgres exclusion-constraint name for a crew booked twice at once. */
const DOUBLE_BOOKING_CONSTRAINT = 'work_orders_no_crew_double_booking';

// ============================================================================
// Crews
// ============================================================================

export async function getCrews(
  organizationId: string,
  includeInactive = false
): Promise<Crew[]> {
  let query = supabase
    .from('crews')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (!includeInactive) query = query.eq('is_active', true);

  const { data, error } = await query;

  if (error) {
    console.error('[workOrdersService] getCrews failed:', error);
    throw new Error(`Failed to load crews: ${error.message}`);
  }

  return data ?? [];
}

export async function createCrew(
  input: Database['public']['Tables']['crews']['Insert']
): Promise<Crew> {
  const { data, error } = await supabase.from('crews').insert(input).select().single();

  if (error) {
    console.error('[workOrdersService] createCrew failed:', error);
    if (error.code === '23505') {
      throw new Error(`A crew named "${input.name}" already exists.`);
    }
    throw new Error(`Failed to create crew: ${error.message}`);
  }

  return data;
}

export async function updateCrew(
  crewId: string,
  patch: Database['public']['Tables']['crews']['Update']
): Promise<Crew> {
  const { data, error } = await supabase
    .from('crews')
    .update(patch)
    .eq('id', crewId)
    .select()
    .single();

  if (error) {
    console.error('[workOrdersService] updateCrew failed:', error);
    throw new Error(`Failed to update crew: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Planning
// ============================================================================

/** An order line that still needs to be scheduled. */
export interface SchedulableLine {
  orderLineId: string;
  lineNumber: number;
  description: string;
  fulfillmentType: FulfillmentType;
  /** Quantity sold. */
  quantity: number;
  /** Already installed, from fulfillment events. */
  installed: number;
  /** Already covered by another work order, planned but not yet complete. */
  scheduled: number;
  /** Still needs a slot. */
  remaining: number;
}

/**
 * Lines on an order that still need site work scheduled.
 *
 * Subtracts what is already installed *and* what other work orders already
 * cover, so re-running this while a job is part-scheduled does not double-book
 * the same chairs onto a second day.
 */
export async function planSchedulableLines(
  salesOrderId: string
): Promise<SchedulableLine[]> {
  const [lines, fulfillment, scheduled] = await Promise.all([
    supabase
      .from('order_lines')
      .select('id, line_number, description, quantity, fulfillment_type')
      .eq('sales_order_id', salesOrderId)
      .neq('status', 'Cancelled')
      .order('line_number', { ascending: true }),
    supabase
      .from('order_line_fulfillment')
      .select('order_line_id, qty_installed')
      .eq('sales_order_id', salesOrderId),
    supabase
      .from('work_order_lines')
      .select('order_line_id, quantity, work_orders!inner(status, sales_order_id)')
      .eq('work_orders.sales_order_id', salesOrderId),
  ]);

  if (lines.error) {
    console.error('[workOrdersService] planSchedulableLines failed:', lines.error);
    throw new Error(`Failed to load order lines: ${lines.error.message}`);
  }
  if (fulfillment.error) {
    throw new Error(`Failed to load fulfillment: ${fulfillment.error.message}`);
  }
  if (scheduled.error) {
    throw new Error(`Failed to load existing work orders: ${scheduled.error.message}`);
  }

  const installedBy = new Map(
    (fulfillment.data ?? []).map(row => [row.order_line_id, Number(row.qty_installed ?? 0)])
  );

  // Cancelled work orders release their claim; completed ones are already
  // counted through installed quantities, so only live plans are subtracted.
  const scheduledBy = new Map<string, number>();
  for (const row of scheduled.data ?? []) {
    const status = (row as { work_orders?: { status: string } | null }).work_orders?.status;
    if (status === 'Cancelled' || status === 'Complete') continue;
    scheduledBy.set(
      row.order_line_id,
      (scheduledBy.get(row.order_line_id) ?? 0) + Number(row.quantity)
    );
  }

  const result: SchedulableLine[] = [];

  for (const line of lines.data ?? []) {
    const fulfillmentType = line.fulfillment_type as FulfillmentType | null;
    if (!isWorkOrderLine(fulfillmentType)) continue;

    const quantity = Number(line.quantity);
    const installed = installedBy.get(line.id) ?? 0;
    const alreadyScheduled = scheduledBy.get(line.id) ?? 0;
    const remaining = round2(quantity - installed - alreadyScheduled);

    if (remaining <= 0) continue;

    result.push({
      orderLineId: line.id,
      lineNumber: line.line_number,
      description: line.description,
      fulfillmentType: fulfillmentType as FulfillmentType,
      quantity,
      installed,
      scheduled: alreadyScheduled,
      remaining,
    });
  }

  return result;
}

// ============================================================================
// Scheduling
// ============================================================================

export interface CreateWorkOrderInput {
  organization_id: string;
  project_id: string;
  sales_order_id?: string | null;
  work_order_number?: string | null;
  work_type?: WorkType;
  status?: WorkOrderStatus;
  crew_id?: string | null;
  subcontractor_name?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  site_name?: string | null;
  site_address_line1?: string | null;
  site_address_line2?: string | null;
  site_city?: string | null;
  site_state?: string | null;
  site_postal_code?: string | null;
  site_contact_name?: string | null;
  site_contact_phone?: string | null;
  /** Dock hours, elevator reservation, COI — what sinks an install day. */
  access_notes?: string | null;
  notes?: string | null;
}

export interface WorkOrderLineInput {
  order_line_id: string;
  quantity: number;
  notes?: string | null;
}

/** Raised when the database refuses a booking because the crew is already out. */
export class CrewDoubleBookedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrewDoubleBookedError';
  }
}

/**
 * Create a work order and the lines it covers, atomically.
 *
 * Throws CrewDoubleBookedError when the crew is already booked over any part of
 * the window. That check lives in the database, so it holds even when two people
 * schedule at the same moment.
 */
export async function createWorkOrder(
  workOrder: CreateWorkOrderInput,
  lines: WorkOrderLineInput[]
): Promise<string> {
  if (workOrder.crew_id && workOrder.subcontractor_name) {
    throw new Error('A work order is performed by a crew or a subcontractor, not both.');
  }

  const { data, error } = await supabase.rpc('create_work_order_with_lines', {
    p_work_order: workOrder as unknown as Json,
    p_lines: lines as unknown as Json,
  });

  if (error) {
    console.error('[workOrdersService] createWorkOrder failed:', error);
    if (error.message.includes(DOUBLE_BOOKING_CONSTRAINT)) {
      throw new CrewDoubleBookedError(
        'That crew is already booked during this window. Pick another crew or another time.'
      );
    }
    if (error.message.includes('work_orders_scheduled_is_complete')) {
      throw new Error(
        'A scheduled work order needs a start, an end, and a crew or subcontractor.'
      );
    }
    if (error.code === '23505') {
      throw new Error(
        `Work order number "${workOrder.work_order_number}" is already in use.`
      );
    }
    throw new Error(`Failed to create work order: ${error.message}`);
  }

  if (!data) throw new Error('Work order was not created.');

  return data;
}

export async function updateWorkOrder(
  workOrderId: string,
  patch: Partial<CreateWorkOrderInput> & {
    actual_start?: string | null;
    actual_end?: string | null;
  }
): Promise<WorkOrder> {
  const { data, error } = await supabase
    .from('work_orders')
    .update(patch)
    .eq('id', workOrderId)
    .select()
    .single();

  if (error) {
    console.error('[workOrdersService] updateWorkOrder failed:', error);
    if (error.message.includes(DOUBLE_BOOKING_CONSTRAINT)) {
      throw new CrewDoubleBookedError(
        'That crew is already booked during this window. Pick another crew or another time.'
      );
    }
    throw new Error(`Failed to update work order: ${error.message}`);
  }

  return data;
}

// ============================================================================
// Queries
// ============================================================================

export async function getWorkOrdersForProject(
  projectId: string
): Promise<WorkOrder[]> {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('project_id', projectId)
    .order('scheduled_start', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[workOrdersService] getWorkOrdersForProject failed:', error);
    throw new Error(`Failed to load work orders: ${error.message}`);
  }

  return data ?? [];
}

export async function getWorkOrderLines(
  workOrderId: string
): Promise<WorkOrderLine[]> {
  const { data, error } = await supabase
    .from('work_order_lines')
    .select('*')
    .eq('work_order_id', workOrderId);

  if (error) {
    console.error('[workOrdersService] getWorkOrderLines failed:', error);
    throw new Error(`Failed to load work order lines: ${error.message}`);
  }

  return data ?? [];
}

/**
 * The scheduling board for a date window.
 *
 * Overlaps the window rather than starting inside it, so a multi-day install
 * still appears on every day it runs.
 */
export async function getSchedule(
  organizationId: string,
  from: string,
  to: string
): Promise<ScheduledWorkOrder[]> {
  const { data, error } = await supabase
    .from('work_order_schedule')
    .select('*')
    .eq('organization_id', organizationId)
    .lte('scheduled_start', to)
    .gte('scheduled_end', from)
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('[workOrdersService] getSchedule failed:', error);
    throw new Error(`Failed to load schedule: ${error.message}`);
  }

  return data ?? [];
}

// ============================================================================
// Completion
// ============================================================================

export interface LineCompletion {
  work_order_line_id: string;
  completed_quantity: number;
}

/**
 * Close out a work order.
 *
 * Pass completions only for lines the crew did not finish as planned; anything
 * omitted completes at its planned quantity. Writes 'installed' fulfillment
 * events, so installed quantities stay derived rather than stored.
 */
export async function completeWorkOrder(
  workOrderId: string,
  completions?: LineCompletion[]
): Promise<void> {
  const { error } = await supabase.rpc('complete_work_order', {
    p_work_order_id: workOrderId,
    p_completions: (completions ?? null) as unknown as Json,
  });

  if (error) {
    console.error('[workOrdersService] completeWorkOrder failed:', error);
    throw new Error(`Failed to complete work order: ${error.message}`);
  }
}
