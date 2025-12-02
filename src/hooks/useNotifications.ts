/**
 * useNotifications Hook
 *
 * React Query hooks for notifications management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  notifyTaskAssigned,
} from '@/services/notificationService';
import type { Notification } from '@/lib/types/notifications';

const QUERY_KEY = 'notifications';

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'unread-count', userId],
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkNotificationAsRead(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', userId] });
    },
  });
}

export function useMarkAllNotificationsAsRead(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', userId] });
    },
  });
}

export function useDeleteNotification(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', userId] });
    },
  });
}

export function useClearAllNotifications(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllNotifications(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', userId] });
    },
  });
}

export function useNotifyTaskAssigned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notifyTaskAssigned,
    onSuccess: (_, variables) => {
      // Invalidate the assignee's notifications
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.assigneeId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', variables.assigneeId] });
    },
  });
}
