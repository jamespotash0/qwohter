/**
 * Calendar Events Types
 */

export type CalendarEventType =
  | 'Custom'
  | 'Meeting'
  | 'Site Visit'
  | 'Follow Up'
  | 'Deadline'
  | 'Milestone'
  | 'Delivery'
  | 'Installation';

export interface CalendarEvent {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  event_type: CalendarEventType;
  color: string;
  linked_proposal_id: string | null;
  linked_project_id: string | null;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day?: boolean;
  event_type?: CalendarEventType;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string | null;
  all_day?: boolean;
  event_type?: CalendarEventType;
}

export type UnifiedCalendarItemSource =
  | 'calendar_event'
  | 'reminder'
  | 'proposal'
  | 'task_deadline'
  // The back office, on the same surface as everything else. An install date
  // depends on a delivery date which depends on a factory's confirmed ship
  // date, and reading those off three separate screens is how a crew gets
  // booked for a week when the product lands in the next one.
  | 'work_order'
  | 'shipment_eta'
  | 'ack_ship_date';

export interface UnifiedCalendarItem {
  id: string;
  source: UnifiedCalendarItemSource;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  allDay: boolean;
  color: string;
  status?: string;
  sourceId: string;
  linkedProposalId?: string | null;
  linkedTaskId?: string | null;
  linkUrl?: string;
  // Only set for calendar_event source — enables edit
  calendarEvent?: CalendarEvent;
}

export const CALENDAR_SOURCE_COLORS: Record<UnifiedCalendarItemSource, string> = {
  calendar_event: '#3B82F6', // Blue (fallback — events use their event_type color)
  reminder: '#EC4899',       // Pink
  proposal: '#0D9488',       // Teal
  task_deadline: '#84CC16',  // Lime
  work_order: '#6366F1',     // Indigo — matches the Installation event type
  shipment_eta: '#06B6D4',   // Cyan — matches the Delivery event type
  ack_ship_date: '#8B5CF6',  // Purple — a factory commitment, not yet freight
};


export const CALENDAR_EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  Custom: '#3B82F6',        // Blue
  Meeting: '#10B981',       // Emerald
  'Site Visit': '#F97316',  // Orange
  'Follow Up': '#F59E0B',   // Amber
  Deadline: '#EF4444',      // Red
  Milestone: '#8B5CF6',     // Purple
  Delivery: '#06B6D4',      // Cyan
  Installation: '#6366F1',  // Indigo
};

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  Custom: 'Custom',
  Meeting: 'Meeting',
  'Site Visit': 'Site Visit',
  'Follow Up': 'Follow Up',
  Deadline: 'Deadline',
  Milestone: 'Milestone',
  Delivery: 'Delivery',
  Installation: 'Installation',
};

export const CALENDAR_SOURCE_LABELS: Record<UnifiedCalendarItemSource, string> = {
  calendar_event: 'Event',
  reminder: 'Reminder',
  proposal: 'Proposal',
  task_deadline: 'Task',
  work_order: 'Site work',
  shipment_eta: 'Delivery',
  ack_ship_date: 'Factory ship date',
};
