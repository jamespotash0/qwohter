/**
 * Presentation helpers shared by the notification bell and the notifications page.
 */

import type { Notification } from '@/lib/types/notifications';

export function getNotificationIcon(type: Notification['type']): string {
  switch (type) {
    case 'task_assigned':
      return '📋';
    case 'task_due':
      return '⏰';
    case 'update_mention':
      return '@';
    case 'update_reply':
      return '💬';
    default:
      return '🔔';
  }
}
