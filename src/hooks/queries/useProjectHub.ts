/**
 * React Query hooks for the project hub.
 *
 * Anything that writes a note or moves a change order invalidates the activity
 * feed as well as its own list, because the feed is a view over both — it is
 * derived, so there is nothing to patch, only to refetch.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getProjectProgress,
  getAllProjectProgress,
  getProjectActivity,
  createProjectNote,
  setNotePinned,
  deleteProjectNote,
  getChangeOrders,
  createChangeOrder,
  updateChangeOrder,
  type CreateNoteInput,
  type CreateChangeOrderInput,
  type UpdateChangeOrderInput,
  type ProjectActivity,
  type ChangeOrder,
} from '@/services/projectHubService';

export type {
  ProjectNote,
  ChangeOrder,
  ChangeOrderStatus,
  ProjectActivity,
  ProjectProgress,
} from '@/services/projectHubService';
export { OPEN_CHANGE_ORDER_STATUSES } from '@/services/projectHubService';

export const projectHubKeys = {
  all: ['project-hub'] as const,
  progress: (projectId: string) => [...projectHubKeys.all, 'progress', projectId] as const,
  allProgress: (organizationId: string) =>
    [...projectHubKeys.all, 'progress-org', organizationId] as const,
  activity: (projectId: string) => [...projectHubKeys.all, 'activity', projectId] as const,
  changeOrders: (projectId: string) =>
    [...projectHubKeys.all, 'change-orders', projectId] as const,
};

export function useProjectProgress(projectId?: string) {
  return useQuery({
    queryKey: projectHubKeys.progress(projectId ?? '__pending__'),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!projectId) return null;
      return getProjectProgress(projectId);
    },
  });
}

/** Progress for every project — the backing query for badges on the board. */
export function useAllProjectProgress(organizationId?: string) {
  return useQuery({
    queryKey: projectHubKeys.allProgress(organizationId ?? '__pending__'),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!organizationId) return {};
      return getAllProjectProgress(organizationId);
    },
  });
}

export function useProjectActivity(projectId?: string) {
  return useQuery({
    queryKey: projectHubKeys.activity(projectId ?? '__pending__'),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ProjectActivity[]> => {
      if (!projectId) return [];
      return getProjectActivity(projectId);
    },
  });
}

export function useChangeOrders(projectId?: string) {
  return useQuery({
    queryKey: projectHubKeys.changeOrders(projectId ?? '__pending__'),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ChangeOrder[]> => {
      if (!projectId) return [];
      return getChangeOrders(projectId);
    },
  });
}

export function useCreateProjectNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => createProjectNote(input),
    onSuccess: note => {
      queryClient.invalidateQueries({ queryKey: projectHubKeys.activity(note.project_id) });
      toast.success(note.is_pinned ? 'Note pinned to the project' : 'Note added');
    },
    onError: (error: unknown) =>
      toast.error('Could not save the note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useSetNotePinned() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) =>
      setNotePinned(noteId, isPinned),
    onSuccess: note => {
      queryClient.invalidateQueries({ queryKey: projectHubKeys.activity(note.project_id) });
      toast.success(note.is_pinned ? 'Pinned' : 'Unpinned');
    },
    onError: (error: unknown) =>
      toast.error('Could not update the note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useDeleteProjectNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId }: { noteId: string; projectId: string }) =>
      deleteProjectNote(noteId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: projectHubKeys.activity(variables.projectId),
      });
      toast.success('Note deleted');
    },
    onError: (error: unknown) =>
      toast.error('Could not delete the note', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useCreateChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChangeOrderInput) => createChangeOrder(input),
    onSuccess: co => {
      queryClient.invalidateQueries({ queryKey: projectHubKeys.all });
      toast.success('Change order created', { description: co.title });
    },
    onError: (error: unknown) =>
      toast.error('Could not create the change order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateChangeOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      changeOrderId,
      patch,
    }: {
      changeOrderId: string;
      patch: UpdateChangeOrderInput;
    }) => updateChangeOrder(changeOrderId, patch),
    onSuccess: co => {
      queryClient.invalidateQueries({ queryKey: projectHubKeys.all });
      toast.success(`Change order ${co.status?.toLowerCase()}`, { description: co.title });
    },
    onError: (error: unknown) =>
      toast.error('Could not update the change order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
