/**
 * useTaskBoardColumns Hook
 *
 * React Query hooks for task board columns management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTaskBoardColumns,
  createTaskBoardColumn,
  updateTaskBoardColumn,
  deleteTaskBoardColumn,
  reorderTaskBoardColumns,
} from '@/services/taskBoardColumnsService';
import type {
  CreateTaskBoardColumnInput,
  UpdateTaskBoardColumnInput,
} from '@/lib/types/taskBoardColumns';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'task-board-columns';

export function useTaskBoardColumns(organizationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: () => fetchTaskBoardColumns(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - columns don't change often
  });
}

export function useCreateTaskBoardColumn(organizationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateTaskBoardColumnInput) =>
      createTaskBoardColumn(organizationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({
        title: 'Column created',
        description: 'New column has been added to the board.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create column',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTaskBoardColumn(organizationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ columnId, input }: { columnId: string; input: UpdateTaskBoardColumnInput }) =>
      updateTaskBoardColumn(columnId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update column',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTaskBoardColumn(organizationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (columnId: string) => deleteTaskBoardColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
      toast({
        title: 'Column deleted',
        description: 'Column has been removed from the board.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete column',
        variant: 'destructive',
      });
    },
  });
}

export function useReorderTaskBoardColumns(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnIds: string[]) => reorderTaskBoardColumns(organizationId, columnIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, organizationId] });
    },
  });
}
