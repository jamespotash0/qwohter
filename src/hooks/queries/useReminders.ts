/**
 * React Query Hooks for Reminders
 *
 * Replaces manual reminder state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  reminderService,
  type Reminder,
  type CreateReminderParams,
  type UpdateReminderParams,
  type CompleteReminderParams,
} from '@/services/reminderService';

/**
 * Fetch reminders query function
 */
async function fetchReminders(organizationId: string, includeCompleted: boolean = false): Promise<Reminder[]> {
  const { data, error } = await reminderService.getReminders({
    organizationId,
    includeCompleted,
  });

  if (error) throw new Error(error);
  return data || [];
}

/**
 * Fetch upcoming reminders query function
 */
async function fetchUpcomingReminders(organizationId: string, daysAhead: number = 7): Promise<Reminder[]> {
  const { data, error } = await reminderService.getUpcomingReminders({
    organizationId,
    daysAhead,
  });

  if (error) throw new Error(error);
  return data || [];
}

/**
 * Hook: Use Reminders
 *
 * Fetches all reminders for an organization
 * Updates via mutation cache invalidation (no realtime polling)
 */
export function useReminders(organizationId?: string, includeCompleted: boolean = false, enabled: boolean = true) {
  const queryKey = queryKeys.reminders.list(organizationId || '');

  return useQuery({
    queryKey,
    queryFn: () => fetchReminders(organizationId!, includeCompleted),
    enabled: !!organizationId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
}

/**
 * Hook: Use Upcoming Reminders
 *
 * Fetches upcoming reminders for an organization
 */
export function useUpcomingReminders(organizationId: string, daysAhead: number = 7, enabled: boolean = true) {
  return useQuery({
    queryKey: [...queryKeys.reminders.list(organizationId), 'upcoming', daysAhead],
    queryFn: () => fetchUpcomingReminders(organizationId, daysAhead),
    enabled: !!organizationId && enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook: Create Reminder
 *
 * Creates a new reminder with optimistic updates
 */
export function useCreateReminder(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateReminderParams) => {
      const { data, error } = await reminderService.createReminder(params);

      if (error) throw new Error(error);
      if (!data) throw new Error('No data returned');

      return data;
    },
    onMutate: async (newReminderData) => {
      // Cancel outgoing refetches
      const queryKey = queryKeys.reminders.list(organizationId);
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousReminders = queryClient.getQueryData<Reminder[]>(queryKey);

      // Optimistically update cache
      const tempReminder: Reminder = {
        id: `temp-${Date.now()}`,
        ...newReminderData,
        completed_at: undefined,
        completed_by: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Reminder;

      queryClient.setQueryData<Reminder[]>(queryKey, (old = []) => [tempReminder, ...old]);

      return { previousReminders };
    },
    onSuccess: (newReminder) => {
      // Invalidate reminders list
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.list(organizationId) });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousReminders) {
        queryClient.setQueryData(queryKeys.reminders.list(organizationId), context.previousReminders);
      }
    },
  });
}

/**
 * Hook: Update Reminder
 *
 * Updates a reminder with optimistic updates
 */
export function useUpdateReminder(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, params }: { id: string; params: UpdateReminderParams }) => {
      const { data, error } = await reminderService.updateReminder(id, params);

      if (error) throw new Error(error);
      if (!data) throw new Error('No data returned');

      return data;
    },
    onMutate: async ({ id, params }) => {
      const queryKey = queryKeys.reminders.list(organizationId);
      await queryClient.cancelQueries({ queryKey });

      const previousReminders = queryClient.getQueryData<Reminder[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<Reminder[]>(queryKey, (old = []) =>
        old.map((reminder) =>
          reminder.id === id
            ? { ...reminder, ...params, updated_at: new Date().toISOString() }
            : reminder
        )
      );

      return { previousReminders };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.list(organizationId) });
    },
    onError: (error, variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(queryKeys.reminders.list(organizationId), context.previousReminders);
      }
    },
  });
}

/**
 * Hook: Complete Reminder
 *
 * Marks a reminder as completed or dismissed
 */
export function useCompleteReminder(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, params }: { id: string; params: CompleteReminderParams }) => {
      const { data, error } = await reminderService.completeReminder(id, params);

      if (error) throw new Error(error);
      if (!data) throw new Error('No data returned');

      return data;
    },
    onMutate: async ({ id, params }) => {
      const queryKey = queryKeys.reminders.list(organizationId);
      await queryClient.cancelQueries({ queryKey });

      const previousReminders = queryClient.getQueryData<Reminder[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<Reminder[]>(queryKey, (old = []) =>
        old.map((reminder) =>
          reminder.id === id
            ? {
                ...reminder,
                reminder_status: params.status, //reminder_status formerly status
                completed_at: new Date().toISOString(),
                completed_by: params.completed_by,
                updated_at: new Date().toISOString(),
              }
            : reminder
        )
      );

      return { previousReminders };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.list(organizationId) });
    },
    onError: (error, variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(queryKeys.reminders.list(organizationId), context.previousReminders);
      }
    },
  });
}

/**
 * Hook: Delete Reminder
 *
 * Deletes a reminder with optimistic updates
 */
export function useDeleteReminder(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { success, error } = await reminderService.deleteReminder(id);

      if (error) throw new Error(error);
      if (!success) throw new Error('Failed to delete reminder');

      return true;
    },
    onMutate: async (id) => {
      const queryKey = queryKeys.reminders.list(organizationId);
      await queryClient.cancelQueries({ queryKey });

      const previousReminders = queryClient.getQueryData<Reminder[]>(queryKey);

      // Optimistically remove from cache
      queryClient.setQueryData<Reminder[]>(queryKey, (old = []) =>
        old.filter((reminder) => reminder.id !== id)
      );

      return { previousReminders };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reminders.list(organizationId) });
    },
    onError: (error, variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(queryKeys.reminders.list(organizationId), context.previousReminders);
      }
    },
  });
}
