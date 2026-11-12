/**
 * Calendar Service
 *
 * CRUD for calendar_events + aggregation from proposals, tasks, and reminders.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  UnifiedCalendarItem,
} from '@/lib/types/calendarEvents';
import {
  CALENDAR_SOURCE_COLORS,
  CALENDAR_EVENT_TYPE_COLORS,
} from '@/lib/types/calendarEvents';

// =============================================================================
// Fetch Functions (Aggregation)
// =============================================================================

/**
 * Fetch custom calendar events for a date range
 */
export async function fetchCalendarEvents(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('calendar_events') as any)
    .select('*')
    .eq('organization_id', organizationId)
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[calendarService] fetchCalendarEvents error:', error);
    return [];
  }

  return (data || []).map((evt: CalendarEvent): UnifiedCalendarItem => ({
    id: `event-${evt.id}`,
    source: 'calendar_event',
    title: evt.title,
    description: evt.description,
    date: evt.start_date,
    endDate: evt.end_date,
    allDay: evt.all_day,
    color: evt.color || CALENDAR_EVENT_TYPE_COLORS[evt.event_type] || CALENDAR_SOURCE_COLORS.calendar_event,
    sourceId: evt.id,
    linkedProposalId: evt.linked_proposal_id,
    linkedTaskId: evt.linked_task_id,
    calendarEvent: evt,
  }));
}

/**
 * Fetch proposal dates (submitted_at, won_at) as calendar items
 */
export async function fetchProposalDates(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('proposals') as any)
    .select('id, project_name, proposal_number, status, submitted_at, won_at, created_at')
    .eq('organization_id', organizationId)
    .eq('is_main_version', true)
    .or(`submitted_at.gte.${startDate},won_at.gte.${startDate}`)
    .or(`submitted_at.lte.${endDate},won_at.lte.${endDate}`);

  if (error) {
    console.error('[calendarService] fetchProposalDates error:', error);
    return [];
  }

  const items: UnifiedCalendarItem[] = [];
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  for (const p of data || []) {
    if (p.submitted_at) {
      const d = new Date(p.submitted_at).getTime();
      if (d >= start && d <= end) {
        items.push({
          id: `proposal-submitted-${p.id}`,
          source: 'proposal',
          title: `Submitted: ${p.project_name || p.proposal_number || 'Proposal'}`,
          description: p.proposal_number ? `#${p.proposal_number}` : null,
          date: p.submitted_at,
          endDate: null,
          allDay: true,
          color: CALENDAR_SOURCE_COLORS.proposal,
          status: p.status || 'Submitted',
          sourceId: p.id,
          linkedProposalId: p.id,
          linkUrl: '/proposals',
        });
      }
    }
    if (p.won_at) {
      const d = new Date(p.won_at).getTime();
      if (d >= start && d <= end) {
        items.push({
          id: `proposal-won-${p.id}`,
          source: 'proposal',
          title: `Won: ${p.project_name || p.proposal_number || 'Proposal'}`,
          description: p.proposal_number ? `#${p.proposal_number}` : null,
          date: p.won_at,
          endDate: null,
          allDay: true,
          color: CALENDAR_SOURCE_COLORS.proposal,
          status: 'Won',
          sourceId: p.id,
          linkedProposalId: p.id,
          linkUrl: '/proposals',
        });
      }
    }
  }

  return items;
}

/**
 * Fetch scheduled notification reminders as calendar items
 */
export async function fetchReminderDates(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('scheduled_notifications') as any)
    .select('id, title, message, scheduled_for, status, entity_type, entity_id, notification_type')
    .eq('organization_id', organizationId)
    .in('status', ['Pending', 'Sent'])
    .gte('scheduled_for', startDate)
    .lte('scheduled_for', endDate)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('[calendarService] fetchReminderDates error:', error);
    return [];
  }

  return (data || []).map((r: any): UnifiedCalendarItem => ({
    id: `reminder-${r.id}`,
    source: 'reminder',
    title: r.title || 'Reminder',
    description: r.message || null,
    date: r.scheduled_for,
    endDate: null,
    allDay: false,
    color: CALENDAR_SOURCE_COLORS.reminder,
    status: r.status,
    sourceId: r.id,
    linkedTaskId: r.entity_type === 'Task' ? r.entity_id : null,
    linkUrl: r.entity_type === 'Task' ? '/task-board' : undefined,
  }));
}

/**
 * Fetch task deadlines as calendar items
 */
export async function fetchTaskDeadlines(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('project_tasks') as any)
    .select('id, title, reference, status, due_date, assigned_to')
    .eq('organization_id', organizationId)
    .not('due_date', 'is', null)
    .gte('due_date', startDate.split('T')[0])
    .lte('due_date', endDate.split('T')[0])
    .order('due_date', { ascending: true });

  if (error) {
    console.error('[calendarService] fetchTaskDeadlines error:', error);
    return [];
  }

  return (data || []).map((t: any): UnifiedCalendarItem => ({
    id: `task-${t.id}`,
    source: 'task_deadline',
    title: t.title || 'Task',
    description: t.reference ? `${t.reference}` : null,
    date: t.due_date,
    endDate: null,
    allDay: true,
    color: CALENDAR_SOURCE_COLORS.task_deadline,
    status: t.status || 'To Do',
    sourceId: t.id,
    linkedTaskId: t.id,
    linkUrl: '/task-board',
  }));
}

/**
 * First value that is actually written in, else the fallback.
 *
 * A work order may carry a blank site name rather than a null one, and `??`
 * keeps an empty string — which renders as an untitled bar on the calendar.
 */
const firstNonEmpty = (
  values: (string | null | undefined)[],
  fallback: string
): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }
  return fallback;
};

/**
 * Site work: crews booked onto days.
 *
 * The labour half of a job, on the same surface as the freight it waits for.
 */
export async function fetchWorkOrderDates(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('work_orders') as any)
    .select('id, work_order_number, work_type, status, scheduled_start, scheduled_end, site_name, project_id')
    .eq('organization_id', organizationId)
    .not('scheduled_start', 'is', null)
    .neq('status', 'Cancelled')
    .gte('scheduled_start', startDate)
    .lte('scheduled_start', endDate)
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('[calendarService] fetchWorkOrderDates error:', error);
    return [];
  }

  return (data ?? []).map((w: any): UnifiedCalendarItem => ({
    id: `work-order-${w.id}`,
    source: 'work_order',
    title: firstNonEmpty([w.site_name, w.work_order_number, w.work_type], 'Site work'),
    description: w.work_type ?? null,
    date: w.scheduled_start,
    endDate: w.scheduled_end ?? null,
    // Site work has real hours; a crew booked 8am-noon is not an all-day event.
    allDay: false,
    color: CALENDAR_SOURCE_COLORS.work_order,
    status: w.status ?? 'Scheduled',
    sourceId: w.id,
    linkUrl: w.project_id ? `/projects/${w.project_id}` : '/schedule',
  }));
}

/**
 * Freight arriving, as the carrier currently estimates it.
 *
 * Delivered shipments are excluded: an ETA that has already happened is history,
 * and leaving it on the calendar makes a busy week look busier than it is.
 */
export async function fetchShipmentETAs(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('shipments') as any)
    .select('id, estimated_delivery_date, tracking_status, carrier_name, carrier_code, tracking_number, sales_order_id, delivered_at')
    .eq('organization_id', organizationId)
    .is('delivered_at', null)
    .not('estimated_delivery_date', 'is', null)
    .gte('estimated_delivery_date', startDate.split('T')[0])
    .lte('estimated_delivery_date', endDate.split('T')[0])
    .order('estimated_delivery_date', { ascending: true });

  if (error) {
    console.error('[calendarService] fetchShipmentETAs error:', error);
    return [];
  }

  return (data ?? []).map((s: any): UnifiedCalendarItem => ({
    id: `shipment-${s.id}`,
    source: 'shipment_eta',
    title: `Delivery — ${firstNonEmpty([s.carrier_name, s.carrier_code], 'freight')}`,
    description: s.tracking_number ?? null,
    date: s.estimated_delivery_date,
    endDate: null,
    allDay: true,
    color: CALENDAR_SOURCE_COLORS.shipment_eta,
    status: s.tracking_status ?? 'unknown',
    sourceId: s.id,
    linkUrl: s.sales_order_id ? `/orders/${s.sales_order_id}` : undefined,
  }));
}

/**
 * The date a factory said it would ship.
 *
 * Distinct from a delivery ETA and shown separately on purpose: this is a
 * commitment somebody made, not an observation a carrier reported, and the gap
 * between the two is where a schedule goes wrong.
 */
export async function fetchAcknowledgedShipDates(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const { data, error } = await (supabase
    .from('vendor_pos') as any)
    .select('id, po_number, manufacturer_name, acknowledged_ship_date, status, sales_order_id')
    .eq('organization_id', organizationId)
    .not('acknowledged_ship_date', 'is', null)
    .gte('acknowledged_ship_date', startDate.split('T')[0])
    .lte('acknowledged_ship_date', endDate.split('T')[0])
    .order('acknowledged_ship_date', { ascending: true });

  if (error) {
    console.error('[calendarService] fetchAcknowledgedShipDates error:', error);
    return [];
  }

  return (data ?? []).map((p: any): UnifiedCalendarItem => ({
    id: `ack-ship-${p.id}`,
    source: 'ack_ship_date',
    title: `${firstNonEmpty([p.manufacturer_name], 'Factory')} ships`,
    description: p.po_number ?? null,
    date: p.acknowledged_ship_date,
    endDate: null,
    allDay: true,
    color: CALENDAR_SOURCE_COLORS.ack_ship_date,
    status: p.status ?? undefined,
    sourceId: p.id,
    linkUrl: p.sales_order_id ? `/orders/${p.sales_order_id}` : undefined,
  }));
}

/**
 * Fetch all calendar items for a date range (unified view)
 */
export async function fetchAllCalendarItems(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  // Each source already swallows its own error and returns [], so one
  // unavailable table degrades that layer rather than emptying the calendar.
  const [events, proposals, reminders, tasks, workOrders, shipments, ackDates] =
    await Promise.all([
      fetchCalendarEvents(organizationId, startDate, endDate),
      fetchProposalDates(organizationId, startDate, endDate),
      fetchReminderDates(organizationId, startDate, endDate),
      fetchTaskDeadlines(organizationId, startDate, endDate),
      fetchWorkOrderDates(organizationId, startDate, endDate),
      fetchShipmentETAs(organizationId, startDate, endDate),
      fetchAcknowledgedShipDates(organizationId, startDate, endDate),
    ]);

  return [
    ...events,
    ...proposals,
    ...reminders,
    ...tasks,
    ...workOrders,
    ...shipments,
    ...ackDates,
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// =============================================================================
// CRUD Operations
// =============================================================================

export async function createCalendarEvent(
  organizationId: string,
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data, error } = await (supabase
    .from('calendar_events') as any)
    .insert({
      organization_id: organizationId,
      created_by: userData.user.id,
      title: input.title,
      description: input.description || null,
      start_date: input.start_date,
      end_date: input.end_date || null,
      all_day: input.all_day ?? false,
      event_type: input.event_type || 'Custom',
      color: CALENDAR_EVENT_TYPE_COLORS[input.event_type || 'Custom'],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCalendarEvent(
  eventId: string,
  input: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const { data, error } = await (supabase
    .from('calendar_events') as any)
    .update(input)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const { error } = await (supabase
    .from('calendar_events') as any)
    .delete()
    .eq('id', eventId);

  if (error) throw new Error(error.message);
}
