/**
 * useProjectTasks Hook
 *
 * React Query hooks for project tasks management
 * Includes realtime subscriptions for automatic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjectTasks,
  fetchOrganizationTasks,
  createProjectTask,
  updateProjectTask,
  deleteProjectTask,
  assignTask,
  updateTaskStatus,
  updateTaskPriority,
  reorderTask,
} from '@/services/projectTasksService';
import type {
  CreateProjectTaskInput,
  UpdateProjectTaskInput,
  TaskStatus,
  TaskPriority,
} from '@/lib/types/projectTasks';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import { trackEvent } from '@/lib/analytics';

const QUERY_KEY = 'project-tasks';
const ORG_TASKS_KEY = 'organization-tasks';

export function useProjectTasks(projectId: string | undefined) {
  const queryKey = [QUERY_KEY, projectId] as const;

  // Set up realtime subscription for this project's tasks
  useRealtimeSubscription(
    'project_tasks',
    queryKey,
    {
      filter: `project_id=eq.${projectId}`,
    },
    !!projectId
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchProjectTasks(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds - show cached data, refetch in background
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
  });
}

/**
 * Fetch all tasks for an organization (for Task Board)
 */
export function useOrganizationTasks(organizationId: string | undefined) {
  const queryKey = [ORG_TASKS_KEY, organizationId] as const;

  // Set up realtime subscription for this organization's tasks
  useRealtimeSubscription(
    'project_tasks',
    queryKey,
    {
      filter: `organization_id=eq.${organizationId}`,
    },
    !!organizationId
  );

  return useQuery({
    queryKey,
    queryFn: () => fetchOrganizationTasks(organizationId!),
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds - show cached data, refetch in background
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
  });
}

export function useCreateProjectTask(organizationId: string, projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateProjectTaskInput) =>
      createProjectTask(organizationId, input),
    onSuccess: (_data, input) => {
      trackEvent('task_created', {
        has_due_date: !!input.due_date,
        has_assignee: !!input.assigned_to,
        priority: input.priority || 'Medium',
      });
      // Invalidate both project-specific and organization-wide task queries
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProjectTask(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateProjectTaskInput }) =>
      updateProjectTask(taskId, input),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProjectTask(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId: string) => deleteProjectTask(taskId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
      toast({
        title: 'Task deleted',
        description: 'The task has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });
}

export function useAssignTask(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string | null }) =>
      assignTask(taskId, userId),
    onSuccess: () => {
      trackEvent('task_assigned');
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
    },
  });
}

export function useUpdateTaskStatus(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onSuccess: (_data, { status }) => {
      if (status === 'Done') trackEvent('task_completed');
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
    },
  });
}

export function useUpdateTaskPriority(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, priority }: { taskId: string; priority: TaskPriority }) =>
      updateTaskPriority(taskId, priority),
    onSuccess: (_data, { priority }) => {
      trackEvent('task_priority_changed', { priority });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
    },
  });
}

/**
 * Reorder a task within or across columns (drag and drop)
 */
export function useReorderTask(organizationId: string, projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      newStatus,
      newPosition,
    }: {
      taskId: string;
      newStatus: string;
      newPosition: number;
    }) => reorderTask(organizationId, taskId, newStatus, newPosition),
    onSuccess: (_data, { newStatus }) => {
      trackEvent('task_moved', { to_column: newStatus });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      }
      queryClient.invalidateQueries({ queryKey: [ORG_TASKS_KEY, organizationId] });
    },
  });
}
