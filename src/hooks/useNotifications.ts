/**
 * useNotifications Hook
 *
 * React Query hooks for notifications management with real-time updates
 */

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  notifyTaskAssigned,
} from '@/services/notificationService';

const QUERY_KEY = 'notifications';

/**
 * Hook for real-time notification subscription
 * Automatically invalidates queries when notifications change
 */
export function useNotificationRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[NotificationRealtime] Change received:', payload.eventType);
          // Invalidate all notification-related queries for this user
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'unread-count', userId] });
        }
      )
      .subscribe((status) => {
        console.log('[NotificationRealtime] Subscription status:', status);
      });

    return () => {
      console.log('[NotificationRealtime] Unsubscribing...');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

export function useNotifications(userId: string | undefined) {
  // Set up real-time subscription
  useNotificationRealtime(userId);

  return useQuery({
    queryKey: [QUERY_KEY, userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute (real-time handles updates)
  });
}

export function useUnreadNotificationCount(userId: string | undefined) {
  // Real-time is handled by useNotifications hook, no need to duplicate
  return useQuery({
    queryKey: [QUERY_KEY, 'unread-count', userId],
    queryFn: () => fetchUnreadCount(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute (real-time handles updates)
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
