/**
 * NotificationBell Component
 *
 * Bell icon in the app top bar with an unread badge and a dropdown of recent
 * notifications. "View all" links through to the full notifications page.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUser } from '@/auth';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import { getNotificationIcon } from '@/lib/notificationDisplay';
import type { Notification } from '@/lib/types/notifications';

/** How many notifications the dropdown shows before deferring to "View all" */
const PREVIEW_COUNT = 6;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const user = useUser();
  const userId = user?.id;

  const { data: notifications = [], isLoading } = useNotifications(userId);
  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId);
  const markAsRead = useMarkNotificationAsRead(userId || '');
  const markAllAsRead = useMarkAllNotificationsAsRead(userId || '');
  const deleteNotification = useDeleteNotification(userId || '');

  const previewNotifications = notifications.slice(0, PREVIEW_COUNT);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link) {
      setIsOpen(false);
      navigate(notification.link);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 rounded-full hover:bg-[var(--sidebar-nav-bg-hover)]"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        >
          <Bell size={20} weight={unreadCount > 0 ? 'fill' : 'regular'} className="text-[var(--content-body-text)]" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-medium text-white bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 rounded-xl overflow-hidden" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--content-card-border)]">
          <h3 className="font-semibold text-sm text-[var(--content-header-text)]">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsRead.mutate()}
            >
              <Check size={12} className="mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-[var(--content-muted-text)]">
              Loading...
            </div>
          ) : previewNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell size={32} className="mx-auto mb-2 text-[var(--content-muted-text)] opacity-50" />
              <p className="text-sm text-[var(--content-muted-text)]">No notifications yet</p>
            </div>
          ) : (
            previewNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`group flex items-start gap-3 px-4 py-3 border-b border-[var(--content-card-border)] last:border-b-0 hover:bg-[var(--content-table-row-hover)] cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-[var(--content-table-row-selected)]' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <span className="text-lg flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-[var(--content-body-text)] ${!notification.is_read ? 'font-medium' : ''}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-[var(--content-muted-text)] mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-[var(--content-muted-text)] opacity-70 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification.mutate(notification.id);
                  }}
                  aria-label="Dismiss notification"
                  className="p-1 rounded hover:bg-[var(--content-button-secondary-hover)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} className="text-[var(--content-muted-text)]" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--content-card-border)]">
          <button
            onClick={handleViewAll}
            className="w-full px-4 py-2.5 text-sm font-medium text-[var(--content-button-primary-bg)] hover:bg-[var(--content-table-row-hover)] transition-colors"
          >
            View all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
