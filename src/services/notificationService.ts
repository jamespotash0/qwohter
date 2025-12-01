/**
 * Notification Service
 *
 * Service for managing user notifications
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Notification,
  CreateNotificationInput,
} from '@/lib/types/notifications';

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as unknown as Notification[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      organization_id: input.organization_id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Notification;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Create a task assignment notification
 */
export async function notifyTaskAssigned(params: {
  assigneeId: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  assignedByName: string;
}): Promise<Notification> {
  return createNotification({
    user_id: params.assigneeId,
    organization_id: params.organizationId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${params.assignedByName} assigned you a task: "${params.taskTitle}" in ${params.projectName}`,
    link: `/board?project=${params.projectId}`,
    metadata: {
      task_id: params.taskId,
      project_id: params.projectId,
      assigned_by_name: params.assignedByName,
    },
  });
}
