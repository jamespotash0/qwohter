/**
 * useGoogleConnection Hook
 *
 * React Query hook for checking Google connection status.
 * Now checks org-level connection (admin connects once for entire org).
 * Proactively validates/refreshes tokens via the google-get-token edge function.
 */

import { useQuery } from '@tanstack/react-query';
import { getGoogleConnectionStatus } from '@/services/googleDocsIntegrationService';

/**
 * Hook for checking if organization has Google connected (admin connects once for all users)
 * Automatically triggers token refresh if the token is expired or marked invalid.
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
    // Retry once on failure — the edge function handles its own retries
    retry: 1,
  });
}

export default useGoogleConnection;
