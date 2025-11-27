/**
 * useProjectTasks Hook
 *
 * React Query hooks for project tasks management
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
} from '@/services/projectTasksService';
import type {
  ProjectTask,
  CreateProjectTaskInput,
  UpdateProjectTaskInput,
  TaskStatus,
  TaskPriority,
} from '@/lib/types/projectTasks';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'project-tasks';
const ORG_TASKS_KEY = 'organization-tasks';

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, projectId],
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
  return useQuery({
    queryKey: [ORG_TASKS_KEY, organizationId],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      toast({
        title: 'Task created',
        description: 'The task has been added to the project.',
      });
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

export function useUpdateProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateProjectTaskInput }) =>
      updateProjectTask(taskId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
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

export function useDeleteProjectTask(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId: string) => deleteProjectTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
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

export function useAssignTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string | null }) =>
      assignTask(taskId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
  });
}

export function useUpdateTaskStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
  });
}

export function useUpdateTaskPriority(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, priority }: { taskId: string; priority: TaskPriority }) =>
      updateTaskPriority(taskId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
  });
}
