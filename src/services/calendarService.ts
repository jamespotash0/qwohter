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
 * Fetch all calendar items for a date range (unified view)
 */
export async function fetchAllCalendarItems(
  organizationId: string,
  startDate: string,
  endDate: string,
): Promise<UnifiedCalendarItem[]> {
  const [events, proposals, reminders, tasks] = await Promise.all([
    fetchCalendarEvents(organizationId, startDate, endDate),
    fetchProposalDates(organizationId, startDate, endDate),
    fetchReminderDates(organizationId, startDate, endDate),
    fetchTaskDeadlines(organizationId, startDate, endDate),
  ]);

  return [...events, ...proposals, ...reminders, ...tasks].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
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
