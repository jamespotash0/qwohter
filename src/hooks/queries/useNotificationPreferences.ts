/**
 * React Query Hooks for Notification Preferences
 *
 * Hooks for fetching and updating user notification preferences
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  fetchNotificationPreferences,
  getOrCreateNotificationPreferences,
  upsertNotificationPreferences,
} from '@/services/notificationPreferencesService';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@/lib/types/notifications';

/**
 * Hook: Fetch notification preferences
 *
 * Returns existing preferences or null if not set
 */
export function useNotificationPreferences(
  userId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.notificationPreferences.byUserOrg(userId || '', organizationId || ''),
    queryFn: () => fetchNotificationPreferences(userId!, organizationId!),
    enabled: !!userId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes - preferences don't change often
  });
}

/**
 * Hook: Get or create notification preferences
 *
 * Automatically creates defaults if user has no preferences
 */
export function useNotificationPreferencesWithDefaults(
  userId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.notificationPreferences.byUserOrg(userId || '', organizationId || ''),
    queryFn: () => getOrCreateNotificationPreferences(userId!, organizationId!),
    enabled: !!userId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Update notification preferences
 *
 * Mutation hook with optimistic updates for smooth UX
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      upsertNotificationPreferences(input),

    onMutate: async (newPrefs) => {
      const queryKey = queryKeys.notificationPreferences.byUserOrg(
        newPrefs.user_id,
        newPrefs.organization_id
      );

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousPrefs = queryClient.getQueryData<NotificationPreferences>(queryKey);

      // Optimistically update to the new value
      if (previousPrefs) {
        queryClient.setQueryData<NotificationPreferences>(queryKey, {
          ...previousPrefs,
          ...newPrefs,
        });
      }

      return { previousPrefs, queryKey };
    },

    onError: (_err, _newPrefs, context) => {
      // Rollback on error
      if (context?.previousPrefs && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousPrefs);
      }
    },

    onSettled: (_data, _error, variables) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences.byUserOrg(
          variables.user_id,
          variables.organization_id
        ),
      });
    },
  });
}
