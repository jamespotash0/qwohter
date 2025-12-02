/**
 * Notification Types
 *
 * Type definitions for the notifications system
 */

export type NotificationType =
  | 'task_assigned'
  | 'task_due'
  | 'update_mention'
  | 'update_reply'
  | 'general';

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  metadata: NotificationMetadata;
  created_at: string;
}

export interface NotificationMetadata {
  task_id?: string;
  project_id?: string;
  update_id?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  [key: string]: unknown;
}

export interface CreateNotificationInput {
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: NotificationMetadata;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_due: 'Task Due',
  update_mention: 'Mentioned',
  update_reply: 'Reply',
  general: 'Notification',
};
