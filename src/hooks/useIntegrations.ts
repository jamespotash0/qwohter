/**
 * Integrations Hooks
 *
 * React Query hooks for managing integrations data with automatic caching
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  getAvailableIntegrations,
  getIntegrations,
  type AvailableIntegration,
} from '@/services/integrationsService';

/**
 * Hook to fetch available integrations (catalog)
 *
 * Features:
 * - Automatic caching (5 minutes via React Query defaults)
 * - Automatic refetch on window focus
 * - Stale-while-revalidate pattern
 * - Deduplication of concurrent requests
 *
 * @param organizationPlan - Optional plan filter
 */
export function useAvailableIntegrations(organizationPlan?: string) {
  return useQuery({
    queryKey: queryKeys.integrations.available(organizationPlan),
    queryFn: () => getAvailableIntegrations(organizationPlan),
    staleTime: 30 * 1000, // 30 seconds - faster updates for admin changes
    gcTime: 60 * 1000, // 1 minute cache
  });
}

/**
 * Hook to fetch connected integrations for an organization
 *
 * Features:
 * - Automatic caching (30 seconds via React Query defaults)
 * - Automatic refetch when integration connected/disconnected
 * - Real-time updates when cache is invalidated
 *
 * @param organizationId - Organization ID
 */
export function useConnectedIntegrations(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.integrations.connected(organizationId),
    queryFn: () => getIntegrations(organizationId),
    enabled: !!organizationId, // Only run query if organizationId exists
    staleTime: 30 * 1000, // 30 seconds - connection status changes more frequently
  });
}

/**
 * Combined hook for integrations tab
 *
 * Fetches both available integrations and connection status
 * Returns combined data for easy rendering
 *
 * @param organizationId - Organization ID
 * @param organizationPlan - Optional plan filter
 */
export function useIntegrationsData(
  organizationId: string,
  organizationPlan?: string
) {
  const {
    data: availableIntegrations = [],
    isLoading: isLoadingAvailable,
    error: availableError,
  } = useAvailableIntegrations(organizationPlan);

  const {
    data: connectedIntegrations = [],
    isLoading: isLoadingConnected,
    error: connectedError,
  } = useConnectedIntegrations(organizationId);

  // Combine data for display
  const integrationsWithStatus = availableIntegrations.map((available) => {
    const connected = connectedIntegrations.find(
      (i) => i.integration_type === available.type
    );

    return {
      ...available,
      isConnected: connected?.is_connected || false,
      connectionStatus: connected?.connection_status || 'Disconnected',
      lastSync: connected?.last_connection_check_at,
    };
  });

  return {
    integrations: integrationsWithStatus,
    isLoading: isLoadingAvailable || isLoadingConnected,
    error: availableError || connectedError,
    availableIntegrations,
    connectedIntegrations,
  };
}
