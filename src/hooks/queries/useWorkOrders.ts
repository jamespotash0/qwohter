/**
 * React Query hooks for crews, work orders, and the schedule.
 *
 * Completing a work order writes `installed` events, so it invalidates the
 * sales order and project namespaces as well as its own — fulfillment
 * quantities, order status, project stage, and the activity feed are all
 * derived from those events and every one of them changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getCrews,
  createCrew,
  updateCrew,
  planSchedulableLines,
  createWorkOrder,
  updateWorkOrder,
  getWorkOrdersForProject,
  getWorkOrderLines,
  getSchedule,
  completeWorkOrder,
  CrewDoubleBookedError,
  type Crew,
  type WorkOrder,
  type WorkOrderLine,
  type ScheduledWorkOrder,
  type SchedulableLine,
  type CreateWorkOrderInput,
  type WorkOrderLineInput,
  type LineCompletion,
} from '@/services/workOrdersService';
import { salesOrderKeys } from './useSalesOrders';
import { projectHubKeys } from './useProjectHub';

export type {
  Crew,
  WorkOrder,
  WorkOrderLine,
  ScheduledWorkOrder,
  SchedulableLine,
  WorkType,
  WorkOrderStatus,
} from '@/services/workOrdersService';

export const workOrderKeys = {
  all: ['work-orders'] as const,
  crews: (organizationId: string, includeInactive: boolean) =>
    [...workOrderKeys.all, 'crews', organizationId, includeInactive] as const,
  schedulable: (salesOrderId: string) =>
    [...workOrderKeys.all, 'schedulable', salesOrderId] as const,
  forProject: (projectId: string) =>
    [...workOrderKeys.all, 'project', projectId] as const,
  lines: (workOrderId: string) => [...workOrderKeys.all, 'lines', workOrderId] as const,
  schedule: (organizationId: string, from: string, to: string) =>
    [...workOrderKeys.all, 'schedule', organizationId, from, to] as const,
};

// ============================================================================
// Crews
// ============================================================================

export function useCrews(organizationId?: string, includeInactive = false) {
  return useQuery({
    queryKey: workOrderKeys.crews(organizationId ?? '__pending__', includeInactive),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Crew[]> => {
      if (!organizationId) return [];
      return getCrews(organizationId, includeInactive);
    },
  });
}

export function useCreateCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCrew>[0]) => createCrew(input),
    onSuccess: crew => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      toast.success('Crew added', { description: crew.name });
    },
    onError: (error: unknown) =>
      toast.error('Could not add the crew', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateCrew() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      crewId,
      patch,
    }: {
      crewId: string;
      patch: Parameters<typeof updateCrew>[1];
    }) => updateCrew(crewId, patch),
    onSuccess: crew => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      toast.success('Crew updated', { description: crew.name });
    },
    onError: (error: unknown) =>
      toast.error('Could not update the crew', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

// ============================================================================
// Work orders
// ============================================================================

/** Lines this order still needs crewing — self-performed and subcontracted. */
export function useSchedulableLines(salesOrderId?: string) {
  return useQuery({
    queryKey: workOrderKeys.schedulable(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<SchedulableLine[]> => {
      if (!salesOrderId) return [];
      return planSchedulableLines(salesOrderId);
    },
  });
}

export function useWorkOrdersForProject(projectId?: string) {
  return useQuery({
    queryKey: workOrderKeys.forProject(projectId ?? '__pending__'),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<WorkOrder[]> => {
      if (!projectId) return [];
      return getWorkOrdersForProject(projectId);
    },
  });
}

export function useWorkOrderLines(workOrderId?: string) {
  return useQuery({
    queryKey: workOrderKeys.lines(workOrderId ?? '__pending__'),
    enabled: !!workOrderId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<WorkOrderLine[]> => {
      if (!workOrderId) return [];
      return getWorkOrderLines(workOrderId);
    },
  });
}

/** Everything crewed in a window, for the schedule board. */
export function useSchedule(organizationId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: workOrderKeys.schedule(
      organizationId ?? '__pending__',
      from ?? '',
      to ?? ''
    ),
    enabled: !!organizationId && !!from && !!to,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ScheduledWorkOrder[]> => {
      if (!organizationId || !from || !to) return [];
      return getSchedule(organizationId, from, to);
    },
  });
}

/**
 * Create a work order.
 *
 * A double-booking is rejected by the database, not by a check the UI remembers
 * to run, and it surfaces here as its own error so the dialog can say which
 * crew is unavailable rather than showing a constraint name.
 */
export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrder,
      lines,
    }: {
      workOrder: CreateWorkOrderInput;
      lines: WorkOrderLineInput[];
    }) => createWorkOrder(workOrder, lines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: projectHubKeys.all });
      toast.success('Work order created');
    },
    onError: (error: unknown) => {
      if (error instanceof CrewDoubleBookedError) {
        toast.error('That crew is already booked', { description: error.message });
        return;
      }
      toast.error('Could not create the work order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      patch,
    }: {
      workOrderId: string;
      patch: Parameters<typeof updateWorkOrder>[1];
    }) => updateWorkOrder(workOrderId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: projectHubKeys.all });
      toast.success('Work order updated');
    },
    onError: (error: unknown) => {
      if (error instanceof CrewDoubleBookedError) {
        toast.error('That crew is already booked', { description: error.message });
        return;
      }
      toast.error('Could not update the work order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/** Completing writes `installed` events, so everything derived from them moves. */
export function useCompleteWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      lines,
    }: {
      workOrderId: string;
      lines: LineCompletion[];
    }) => completeWorkOrder(workOrderId, lines),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: projectHubKeys.all });
      toast.success('Work order completed');
    },
    onError: (error: unknown) =>
      toast.error('Could not complete the work order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
