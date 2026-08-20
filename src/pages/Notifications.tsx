/**
 * Notifications Page
 *
 * Full list of the current user's notifications — the "View all" destination
 * from the top bar bell dropdown.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Trash, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/auth';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from '@/hooks/useNotifications';
import { getNotificationIcon } from '@/lib/notificationDisplay';
import type { Notification } from '@/lib/types/notifications';

type Filter = 'all' | 'unread';

const Notifications = () => {
  const navigate = useNavigate();
  const user = useUser();
  const userId = user?.id;
  const [filter, setFilter] = useState<Filter>('all');

  const { data: notifications = [], isLoading } = useNotifications(userId);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);
  const markAsRead = useMarkNotificationAsRead(userId || '');
  const markAllAsRead = useMarkAllNotificationsAsRead(userId || '');
  const deleteNotification = useDeleteNotification(userId || '');
  const clearAll = useClearAllNotifications(userId || '');

  const visibleNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, filter]
  );

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--content-header-text)]">Notifications</h1>
          <p className="text-sm text-[var(--content-muted-text)] mt-2">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
              <Check size={14} className="mr-1.5" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => clearAll.mutate()}>
              <Trash size={14} className="mr-1.5" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 inline-flex bg-[var(--content-card-bg)] rounded-lg p-1 gap-0.5">
        {(['all', 'unread'] as Filter[]).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
              filter === value
                ? 'bg-[var(--content-bg)] text-[var(--content-header-text)] shadow-sm'
                : 'text-[var(--content-muted-text)] hover:text-[var(--content-header-text)]'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-xl border border-[var(--content-card-border)] overflow-hidden bg-[var(--content-bg)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--content-muted-text)]">Loading...</div>
        ) : visibleNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={40} className="mx-auto mb-3 text-[var(--content-muted-text)] opacity-40" />
            <p className="text-[var(--content-muted-text)]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`group flex items-start gap-3 px-5 py-4 border-b border-[var(--content-card-border)] last:border-b-0 cursor-pointer transition-colors hover:bg-[var(--content-table-row-hover)] ${
                !notification.is_read ? 'bg-[var(--content-table-row-selected)]' : ''
              }`}
            >
              <span className="text-xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-[var(--content-body-text)] ${!notification.is_read ? 'font-semibold' : ''}`}>
                  {notification.title}
                </p>
                <p className="text-sm text-[var(--content-muted-text)] mt-0.5">{notification.message}</p>
                <p className="text-xs text-[var(--content-muted-text)] opacity-70 mt-1.5">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification.mutate(notification.id);
                }}
                aria-label="Dismiss notification"
                className="p-1.5 rounded-md hover:bg-[var(--content-button-secondary-hover)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} className="text-[var(--content-muted-text)]" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
