/**
 * useDriveFiles Hook
 *
 * React Query hook for fetching Google Drive files (Google Docs).
 * Used by the template picker to show available templates.
 */

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  modifiedTime: string;
  createdTime: string;
}

export interface DriveFilesResponse {
  files: DriveFile[];
  nextPageToken?: string;
  folderId?: string;
}

interface UseDriveFilesOptions {
  organizationId: string | undefined;
  searchQuery?: string;
  enabled?: boolean;
}

/**
 * Fetch Google Drive files from the connected folder
 */
async function fetchDriveFiles(
  organizationId: string,
  searchQuery?: string,
  pageToken?: string
): Promise<DriveFilesResponse> {
  const { data, error } = await supabase.functions.invoke('google-list-drive-files', {
    body: {
      organizationId,
      searchQuery: searchQuery?.trim() || undefined,
      pageToken,
      pageSize: 25,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to fetch Drive files');
  }

  return data as DriveFilesResponse;
}

/**
 * Hook for fetching Google Drive files with search
 */
export function useDriveFiles({ organizationId, searchQuery, enabled = true }: UseDriveFilesOptions) {
  return useQuery({
    queryKey: ['drive-files', organizationId, searchQuery],
    queryFn: () => fetchDriveFiles(organizationId!, searchQuery),
    enabled: enabled && !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook for infinite scrolling through Drive files
 */
export function useDriveFilesInfinite({ organizationId, searchQuery, enabled = true }: UseDriveFilesOptions) {
  return useInfiniteQuery({
    queryKey: ['drive-files-infinite', organizationId, searchQuery],
    queryFn: ({ pageParam }) => fetchDriveFiles(organizationId!, searchQuery, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled: enabled && !!organizationId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export default useDriveFiles;
