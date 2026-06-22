/**
 * useQuickBooksInvoicing
 *
 * Detects which QuickBooks product an organization has connected (Online or
 * Desktop) and exposes a single createInvoice action that routes to the right
 * one. Invoices are not surfaced in-app — they flow to QuickBooks — so this
 * hook only needs to answer "can we invoice, and how" plus fire the request.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import type { Proposal } from '@/services/proposalsService';
import {
  checkQBOnlineConnection,
  createInvoiceInQBOnline,
} from '@/services/quickbooksOnlineService';
import {
  checkQBDesktopConnection,
  createInvoiceInQBDesktop,
} from '@/services/quickbooksDesktopService';

export type QBProvider = 'online' | 'desktop' | null;

/**
 * Thrown by the create-invoice services when the proposal has already been
 * synced. Surfaced distinctly so the UI can say "already sent" rather than
 * "failed".
 */
export function isAlreadySyncedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /already (synced|sent)|already synced to quickbooks/i.test(error.message)
  );
}

export function useQuickBooksInvoicing(organizationId: string | undefined) {
  const providerQuery = useQuery<QBProvider>({
    queryKey: ['quickbooks', 'provider', organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!organizationId) return null;
      // Online takes precedence if both somehow exist.
      const online = await checkQBOnlineConnection(organizationId);
      if (online) return 'online';
      const desktop = await checkQBDesktopConnection(organizationId);
      if (desktop) return 'desktop';
      return null;
    },
  });

  const provider = providerQuery.data ?? null;

  const createInvoice = useMutation({
    mutationFn: async (proposal: Proposal) => {
      if (!organizationId) throw new Error('No organization selected');
      if (provider === 'online') {
        return createInvoiceInQBOnline(proposal, organizationId);
      }
      if (provider === 'desktop') {
        return createInvoiceInQBDesktop(proposal, organizationId);
      }
      throw new Error('QuickBooks is not connected');
    },
  });

  return {
    provider,
    isConnected: provider !== null,
    isLoading: providerQuery.isLoading,
    createInvoice,
  };
}
