/**
 * Scheduled Notifications Service
 *
 * Handles CRUD operations for scheduled notifications (task reminders).
 * Uses the scheduled_notifications table for better architecture.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ScheduledNotification,
  ScheduledNotificationRecurrence,
} from '@/lib/types/scheduledNotifications';
import { normalizeRecurrenceType, normalizeNotificationEntityType } from '@/utils/statusHelpers';

// =============================================================================
// Types
// =============================================================================

export interface TaskReminder {
  id: string;
  taskId: string;
  userId: string;
  organizationId: string;
  scheduledFor: string;
  recurrence: ScheduledNotificationRecurrence;
  recurrenceEndDate: string | null;
  status: 'Pending' | 'Sent' | 'Cancelled' | 'Failed';
  sentAt: string | null;
  lastSentAt: string | null;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
}

interface ScheduleTaskReminderInput {
  taskId: string;
  userId: string;
  organizationId: string;
  scheduledFor: string;
  recurrence?: ScheduledNotificationRecurrence;
  dueDate?: string | null;
  taskTitle: string;
  taskReference?: string | null;
  priority?: string;
  proposalId?: string | null;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get the current reminder for a task (if any)
 */
export async function getTaskReminder(taskId: string): Promise<TaskReminder | null> {
  const { data, error } = await (supabase
    .from('scheduled_notifications') as any)
    .select('*')
    .eq('entity_type', 'Task')
    .eq('entity_id', taskId)
    .in('status', ['Pending', 'Sent'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching task reminder:', error);
    return null;
  }

  if (!data) return null;

  return mapToTaskReminder(data);
}

/**
 * Schedule a reminder for a task
 * Cancels any existing pending reminders for the same task/user
 */
export async function scheduleTaskReminder(input: ScheduleTaskReminderInput): Promise<TaskReminder | null> {
  const {
    taskId,
    userId,
    organizationId,
    scheduledFor,
    recurrence: rawRecurrence,
    dueDate,
    taskTitle,
    taskReference,
    priority,
    proposalId,
  } = input;

  // Normalize recurrence type (accepts any case: "once", "DAILY", "Weekly" -> "Once", "Daily", "Weekly")
  const recurrence = normalizeRecurrenceType(rawRecurrence) || 'Once';
  const entityType = normalizeNotificationEntityType('Task') || 'Task';

  // First, cancel any existing pending reminders for this task/user
  await (supabase
    .from('scheduled_notifications') as any)
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('entity_type', entityType)
    .eq('entity_id', taskId)
    .eq('user_id', userId)
    .eq('status', 'Pending');

  // Create the new reminder
  const { data, error } = await (supabase
    .from('scheduled_notifications') as any)
    .insert({
      entity_type: entityType,
      entity_id: taskId,
      user_id: userId,
      organization_id: organizationId,
      created_by: userId, // Same as user_id when setting own reminder
      scheduled_for: scheduledFor,
      recurrence,
      recurrence_end_date: dueDate || null,
      notification_type: 'Reminder',
      title: `Reminder: ${taskTitle}`,
      message: buildReminderMessage(taskTitle, taskReference),
      link: `/task-board?task=${taskReference || taskId}`,
      metadata: {
        task_reference: taskReference,
        due_date: dueDate,
        priority,
        proposal_id: proposalId,
      },
      status: 'Pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error scheduling task reminder:', error);
    throw new Error(`Failed to schedule reminder: ${error.message}`);
  }

  return mapToTaskReminder(data);
}

/**
 * Cancel a task reminder
 */
export async function cancelTaskReminder(taskId: string, userId?: string): Promise<boolean> {
  let query = (supabase
    .from('scheduled_notifications') as any)
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('entity_type', 'Task')
    .eq('entity_id', taskId)
    .eq('status', 'Pending');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error cancelling task reminder:', error);
    return false;
  }

  return true;
}

/**
 * Get all reminders for a user
 */
export async function getUserReminders(
  userId: string,
  status?: 'Pending' | 'Sent' | 'Cancelled',
  options?: { upcomingOnly?: boolean }
): Promise<TaskReminder[]> {
  let query = (supabase
    .from('scheduled_notifications') as any)
    .select('*')
    .eq('entity_type', 'Task')
    .eq('notification_type', 'Reminder')
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  if (options?.upcomingOnly) {
    query = query.gte('scheduled_for', new Date().toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user reminders:', error);
    return [];
  }

  return (data || []).map(mapToTaskReminder);
}

/**
 * Get reminders for multiple tasks (for TaskBoard display)
 * Returns a map of taskId -> TaskReminder
 */
export async function getTaskReminders(taskIds: string[]): Promise<Map<string, TaskReminder>> {
  if (taskIds.length === 0) return new Map();

  const { data, error } = await (supabase
    .from('scheduled_notifications') as any)
    .select('*')
    .eq('entity_type', 'Task')
    .in('entity_id', taskIds)
    .in('status', ['Pending', 'Sent'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching task reminders:', error);
    return new Map();
  }

  // Group by entity_id (taskId), keeping only the most recent for each task
  const reminderMap = new Map<string, TaskReminder>();
  for (const item of data || []) {
    if (!reminderMap.has(item.entity_id)) {
      reminderMap.set(item.entity_id, mapToTaskReminder(item));
    }
  }

  return reminderMap;
}

// =============================================================================
// Helper Functions
// =============================================================================

function mapToTaskReminder(data: ScheduledNotification): TaskReminder {
  return {
    id: data.id,
    taskId: data.entity_id,
    userId: data.user_id,
    organizationId: data.organization_id,
    scheduledFor: data.scheduled_for,
    recurrence: data.recurrence,
    recurrenceEndDate: data.recurrence_end_date,
    status: data.status,
    sentAt: data.sent_at,
    lastSentAt: data.last_sent_at,
    title: data.title || 'Task Reminder',
    message: data.message || '',
    metadata: data.metadata,
  };
}

function buildReminderMessage(taskTitle: string, taskReference?: string | null): string {
  const formattedName = taskReference ? `${taskTitle} [${taskReference}]` : taskTitle;
  return `Reminder on ${formattedName}`;
}
