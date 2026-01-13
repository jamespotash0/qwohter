/**
 * useGoogleConnection Hook
 *
 * React Query hook for checking Google connection status.
 * Now checks org-level connection (admin connects once for entire org).
 */

import { useQuery } from '@tanstack/react-query';
import { getGoogleConnectionStatus } from '@/services/googleDocsIntegrationService';

/**
 * Hook for checking if organization has Google connected (admin connects once for all users)
 */
export function useGoogleConnection(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['google-connection', organizationId],
    queryFn: async () => {
      if (!organizationId) return { isConnected: false };
      return getGoogleConnectionStatus(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export default useGoogleConnection;
