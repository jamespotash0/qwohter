/**
 * Hook for fetching upcoming scheduled reminders
 *
 * Uses the scheduled_notifications table to show pending reminders
 * on the Dashboard.
 */

import { useQuery } from '@tanstack/react-query';
import { getUserReminders, type TaskReminder } from '@/services/scheduledNotificationsService';

interface UseUpcomingRemindersOptions {
  enabled?: boolean;
}

/**
 * Fetch upcoming (pending) reminders for a user
 */
export function useUpcomingReminders(
  userId: string | undefined,
  options: UseUpcomingRemindersOptions = {}
) {
  const { enabled = true } = options;

  return useQuery<TaskReminder[], Error>({
    queryKey: ['upcoming-reminders', userId],
    queryFn: async () => {
      if (!userId) return [];
      return getUserReminders(userId, 'Pending', { upcomingOnly: true });
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

export type { TaskReminder };
