/**
 * Scheduled Notifications Types
 *
 * Type definitions for the scheduled notifications system.
 * Supports reminders for tasks, proposals, invoices, etc.
 */

export type ScheduledNotificationEntityType = 'task' | 'proposal' | 'invoice' | 'project';

export type ScheduledNotificationRecurrence = 'once' | 'daily' | 'weekly';

export type ScheduledNotificationStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

export type ScheduledNotificationType = 'reminder' | 'follow_up' | 'due_date';

// Reminder preset types for quick selection in UI
export type ReminderPreset = 'none' | 'day_of' | '1_day' | '2_days' | '1_week' | 'custom';

export interface ScheduledNotification {
  id: string;
  entity_type: ScheduledNotificationEntityType;
  entity_id: string;
  user_id: string;
  organization_id: string;
  scheduled_for: string; // ISO 8601 timestamp
  recurrence: ScheduledNotificationRecurrence;
  recurrence_end_date: string | null;
  notification_type: ScheduledNotificationType;
  title: string;
  message: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  status: ScheduledNotificationStatus;
  sent_at: string | null;
  last_sent_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateScheduledNotificationInput {
  entity_type: ScheduledNotificationEntityType;
  entity_id: string;
  user_id: string;
  organization_id: string;
  scheduled_for: string;
  recurrence?: ScheduledNotificationRecurrence;
  recurrence_end_date?: string | null;
  notification_type?: ScheduledNotificationType;
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateScheduledNotificationInput {
  scheduled_for?: string;
  recurrence?: ScheduledNotificationRecurrence;
  recurrence_end_date?: string | null;
  title?: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  status?: ScheduledNotificationStatus;
}

/**
 * Helper type for task reminders specifically
 */
export interface TaskReminderInput {
  taskId: string;
  userId: string;
  organizationId: string;
  scheduledFor: string;
  recurrence?: ScheduledNotificationRecurrence;
  dueDate?: string | null; // Used as recurrence_end_date
  taskTitle: string;
  taskReference?: string | null;
  priority?: string;
  proposalId?: string | null;
}
