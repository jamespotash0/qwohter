/**
 * React Query Hooks for Board (Projects & Workflow Columns)
 *
 * Replaces manual board state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import { toast } from 'sonner';
import type { Project, WorkflowColumn } from '@/stores/board/boardStore';
import {
  fetchBoardItems,
  fetchWorkflowColumns,
  createBoardItem,
  updateBoardItem,
  deleteBoardItem,
  moveBoardItem,
  createWorkflowColumn,
  updateWorkflowColumn,
  deleteWorkflowColumn,
  type CreateBoardItemData,
  type UpdateBoardItemData,
  type CreateWorkflowColumnData,
  type UpdateWorkflowColumnData,
} from '@/services/boardService';

/**
 * Hook: Use Projects (Board Items)
 *
 * Fetches board projects for an organization
 * Includes realtime subscriptions for automatic updates
 */
export function useProjects(organizationId?: string, enabled: boolean = true) {
  const queryKey = queryKeys.board.tasks(organizationId || '');

  // Set up realtime subscription for this organization's projects
  // Note: Realtime must be enabled in Supabase Dashboard for projects table
  useRealtimeSubscription(
    'projects',
    queryKey,
    {
      filter: `organization_id=eq.${organizationId}`,
    },
    false // Disabled for now - enable after configuring Supabase Realtime
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchBoardItems(organizationId!),
    enabled: !!organizationId && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - very dynamic
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Keep board fresh
  });
}

/**
 * Hook: Use Workflow Columns
 *
 * Fetches workflow columns for an organization
 */
export function useWorkflowColumns(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...queryKeys.board.all, 'columns', organizationId] as const,
    queryFn: () => fetchWorkflowColumns(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - columns don't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Update Project (Board Item)
 *
 * Updates a project with optimistic updates
 */
export function useUpdateProject(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateBoardItemData }) => {
      return updateBoardItem(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      const queryKey = queryKeys.board.tasks(organizationId);
      await queryClient.cancelQueries({ queryKey });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<Project[]>(queryKey, (old = []) =>
        old.map((project) =>
          project.id === id ? { ...project, ...updates } : project
        )
      );

      return { previousProjects };
    },
    onSuccess: () => {
      toast.success('Project updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(organizationId) });
    },
    onError: (error, variables, context) => {
      toast.error('Failed to update project');
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.board.tasks(organizationId), context.previousProjects);
      }
    },
  });
}

/**
 * Hook: Delete Project (Board Item)
 *
 * Deletes a project with optimistic updates
 */
export function useDeleteProject(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await deleteBoardItem(id);
      return id;
    },
    onMutate: async (id) => {
      const queryKey = queryKeys.board.tasks(organizationId);
      await queryClient.cancelQueries({ queryKey });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKey);

      // Optimistically remove
      queryClient.setQueryData<Project[]>(queryKey, (old = []) =>
        old.filter((project) => project.id !== id)
      );

      return { previousProjects };
    },
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(organizationId) });
    },
    onError: (error, variables, context) => {
      toast.error('Failed to delete project');
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.board.tasks(organizationId), context.previousProjects);
      }
    },
  });
}

/**
 * Hook: Create Workflow Column
 *
 * Creates a new workflow column with optimistic updates
 */
export function useCreateWorkflowColumn(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (column: CreateWorkflowColumnData) => {
      return createWorkflowColumn(organizationId, column);
    },
    onMutate: async (newColumn) => {
      const queryKey = [...queryKeys.board.all, 'columns', organizationId] as const;
      await queryClient.cancelQueries({ queryKey });

      const previousColumns = queryClient.getQueryData<WorkflowColumn[]>(queryKey);

      // Optimistically add
      const tempColumn: WorkflowColumn = {
        id: `temp-${Date.now()}`,
        organization_id: organizationId,
        ...newColumn,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<WorkflowColumn[]>(queryKey, (old = []) => [...old, tempColumn]);

      return { previousColumns };
    },
    onSuccess: () => {
      toast.success('Workflow column created successfully');
      queryClient.invalidateQueries({ queryKey: [...queryKeys.board.all, 'columns', organizationId] });
    },
    onError: (error, variables, context) => {
      toast.error('Failed to create workflow column');
      if (context?.previousColumns) {
        queryClient.setQueryData([...queryKeys.board.all, 'columns', organizationId], context.previousColumns);
      }
    },
  });
}

/**
 * Hook: Update Workflow Column
 *
 * Updates a workflow column with optimistic updates
 */
export function useUpdateWorkflowColumn(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateWorkflowColumnData }) => {
      return updateWorkflowColumn(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      const queryKey = [...queryKeys.board.all, 'columns', organizationId] as const;
      await queryClient.cancelQueries({ queryKey });

      const previousColumns = queryClient.getQueryData<WorkflowColumn[]>(queryKey);

      // Optimistically update
      queryClient.setQueryData<WorkflowColumn[]>(queryKey, (old = []) =>
        old.map((column) =>
          column.id === id ? { ...column, ...updates, updated_at: new Date().toISOString() } : column
        )
      );

      return { previousColumns };
    },
    onSuccess: () => {
      toast.success('Workflow column updated successfully');
      queryClient.invalidateQueries({ queryKey: [...queryKeys.board.all, 'columns', organizationId] });
    },
    onError: (error, variables, context) => {
      toast.error('Failed to update workflow column');
      if (context?.previousColumns) {
        queryClient.setQueryData([...queryKeys.board.all, 'columns', organizationId], context.previousColumns);
      }
    },
  });
}

/**
 * Hook: Delete Workflow Column
 *
 * Deletes a workflow column with optimistic updates
 */
export function useDeleteWorkflowColumn(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check if column is default
      const columns = queryClient.getQueryData<WorkflowColumn[]>([...queryKeys.board.all, 'columns', organizationId]);
      const column = columns?.find(c => c.id === id);

      if (column?.is_default) {
        throw new Error('Cannot delete default column. You can rename it instead.');
      }

      await deleteWorkflowColumn(id);
      return id;
    },
    onMutate: async (id) => {
      const queryKey = [...queryKeys.board.all, 'columns', organizationId] as const;
      await queryClient.cancelQueries({ queryKey });

      const previousColumns = queryClient.getQueryData<WorkflowColumn[]>(queryKey);

      // Optimistically remove
      queryClient.setQueryData<WorkflowColumn[]>(queryKey, (old = []) =>
        old.filter((column) => column.id !== id)
      );

      return { previousColumns };
    },
    onSuccess: () => {
      toast.success('Workflow column deleted successfully');
      queryClient.invalidateQueries({ queryKey: [...queryKeys.board.all, 'columns', organizationId] });
    },
    onError: (error, variables, context) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow column');
      if (context?.previousColumns) {
        queryClient.setQueryData([...queryKeys.board.all, 'columns', organizationId], context.previousColumns);
      }
    },
  });
}

/**
 * Hook: Move Board Item
 *
 * Moves a board item to a different workflow column
 */
export function useMoveBoardItem(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      newColumnStatus,
      newOrder
    }: {
      itemId: string;
      newColumnStatus: string;
      newOrder?: number
    }) => {
      return moveBoardItem(itemId, newColumnStatus, newOrder);
    },
    onSuccess: () => {
      toast.success('Item moved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.board.tasks(organizationId) });
    },
    onError: (error) => {
      toast.error('Failed to move item');
    },
  });
}
