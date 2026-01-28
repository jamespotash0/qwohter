/**
 * Custom Hook for Project Attachments
 *
 * React Query hook for fetching and managing project attachments.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectAttachmentsService } from '@/services/projectAttachmentsService';

/**
 * Hook to fetch project attachments
 */
export function useProjectAttachments(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['project-attachments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await ProjectAttachmentsService.getProjectAttachments(projectId);
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['project-attachments', projectId] });
  };

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch,
  };
}
