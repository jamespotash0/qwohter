/**
 * React Query Hooks for Calendar Events
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';
import {
  fetchAllCalendarItems,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/services/calendarService';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/lib/types/calendarEvents';

// =============================================================================
// Query Keys
// =============================================================================

export const calendarQueryKeys = {
  all: ['calendar'] as const,
  events: (organizationId: string, month: string) =>
    [...calendarQueryKeys.all, 'events', organizationId, month] as const,
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Fetch all unified calendar items for a given month
 */
export function useCalendarItems(
  organizationId: string | undefined,
  month: Date,
  enabled: boolean = true,
) {
  const startDate = startOfMonth(month).toISOString();
  const endDate = endOfMonth(month).toISOString();
  const monthKey = format(month, 'yyyy-MM');

  const queryKey = calendarQueryKeys.events(organizationId || '', monthKey);

  useRealtimeSubscription(
    'calendar_events',
    queryKey,
    { filter: organizationId ? `organization_id=eq.${organizationId}` : undefined },
    !!organizationId && enabled,
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchAllCalendarItems(organizationId!, startDate, endDate),
    enabled: !!organizationId && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateCalendarEvent(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) =>
      createCalendarEvent(organizationId, input),
    onSuccess: () => {
      toast.success('Event created');
      queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create event');
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCalendarEventInput }) =>
      updateCalendarEvent(id, input),
    onSuccess: () => {
      toast.success('Event updated');
      queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update event');
    },
  });
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => {
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete event');
    },
  });
}
