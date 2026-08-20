/**
 * React Query hooks for the acknowledgment variance queue.
 *
 * The queue is what a project manager opens in the morning: purchase order
 * lines a manufacturer has not answered yet, and lines they answered at a
 * different price or date than was ordered.
 *
 * Kept short-lived — acknowledgments arrive by email throughout the day, and a
 * stale queue is one that quietly stops being the reason to open the app.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getVarianceQueue,
  acknowledgePOLines,
  getVendorPOs,
  getPOLines,
  type POLineVariance,
  type AcknowledgeLineInput,
} from '@/services/vendorPOService';
import { summarizeVariance, type VarianceSummary } from '@/lib/pricing';

export type { POLineVariance } from '@/services/vendorPOService';
export type { VarianceSummary } from '@/lib/pricing';

export const varianceQueryKeys = {
  all: ['variance'] as const,
  queue: (organizationId: string, includeMatched: boolean) =>
    [...varianceQueryKeys.all, 'queue', organizationId, includeMatched] as const,
  posForOrder: (salesOrderId: string) =>
    [...varianceQueryKeys.all, 'pos', salesOrderId] as const,
  poLines: (vendorPOId: string) =>
    [...varianceQueryKeys.all, 'po-lines', vendorPOId] as const,
};

export interface VarianceQueueResult {
  lines: POLineVariance[];
  summary: VarianceSummary;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * The variance queue for an organization, with its headline figures.
 *
 * `includeMatched` shows lines the vendor confirmed exactly as ordered. Off by
 * default — they are the healthy majority and including them buries the
 * exceptions, which is the entire reason this screen exists.
 */
export function useVarianceQueue(
  organizationId?: string,
  includeMatched = false
): VarianceQueueResult {
  const query = useQuery({
    queryKey: varianceQueryKeys.queue(organizationId ?? '__pending__', includeMatched),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<POLineVariance[]> => {
      if (!organizationId) return [];
      return getVarianceQueue(organizationId, { includeMatched });
    },
  });

  const lines = useMemo(() => query.data ?? [], [query.data]);
  const summary = useMemo(() => summarizeVariance(lines), [lines]);

  return {
    lines,
    summary,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: () => void query.refetch(),
  };
}

/** Purchase orders raised against one sales order. */
export function useVendorPOsForOrder(salesOrderId?: string) {
  return useQuery({
    queryKey: varianceQueryKeys.posForOrder(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!salesOrderId) return [];
      return getVendorPOs(salesOrderId);
    },
  });
}

export function usePOLines(vendorPOId?: string) {
  return useQuery({
    queryKey: varianceQueryKeys.poLines(vendorPOId ?? '__pending__'),
    enabled: !!vendorPOId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!vendorPOId) return [];
      return getPOLines(vendorPOId);
    },
  });
}

/**
 * Record what a manufacturer came back with.
 *
 * Invalidates the whole variance namespace: acknowledging one line changes the
 * queue's counts and totals, not just that row.
 */
export function useAcknowledgePOLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendorPOId,
      lines,
      header,
    }: {
      vendorPOId: string;
      lines: AcknowledgeLineInput[];
      header?: { vendorAckNumber?: string | null; acknowledgedShipDate?: string | null };
    }) => acknowledgePOLines(vendorPOId, lines, header),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: varianceQueryKeys.all });
      const count = variables.lines.length;
      toast.success(
        `Acknowledgment recorded for ${count} line${count === 1 ? '' : 's'}`
      );
    },
    onError: (error: unknown) =>
      toast.error('Could not record acknowledgment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
