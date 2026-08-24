/**
 * React Query hooks for deliveries.
 *
 * Recording a delivery writes `received` events, so it invalidates the sales
 * order namespace wholesale rather than patching a row — fulfillment
 * quantities, order status, and purchase order status are all derived from
 * those events and every one of them changes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  createReceipt,
  getReceipts,
  getReceiptLines,
  getPOProgress,
  getDamagedLines,
  type CreateReceiptInput,
  type CreateReceiptLineInput,
  type Receipt,
  type ReceiptLine,
} from '@/services/receiptsService';
import { salesOrderKeys } from './useSalesOrders';
import { varianceQueryKeys } from './useVarianceQueue';

export type { Receipt, ReceiptLine, VendorPOProgress } from '@/services/receiptsService';

export const receiptKeys = {
  all: ['receipts'] as const,
  forOrder: (salesOrderId: string) => [...receiptKeys.all, 'order', salesOrderId] as const,
  lines: (receiptId: string) => [...receiptKeys.all, 'lines', receiptId] as const,
  poProgress: (salesOrderId: string) =>
    [...receiptKeys.all, 'po-progress', salesOrderId] as const,
  damaged: (organizationId: string) =>
    [...receiptKeys.all, 'damaged', organizationId] as const,
};

export function useReceipts(salesOrderId?: string) {
  return useQuery({
    queryKey: receiptKeys.forOrder(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Receipt[]> => {
      if (!salesOrderId) return [];
      return getReceipts(salesOrderId);
    },
  });
}

export function useReceiptLines(receiptId?: string) {
  return useQuery({
    queryKey: receiptKeys.lines(receiptId ?? '__pending__'),
    enabled: !!receiptId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ReceiptLine[]> => {
      if (!receiptId) return [];
      return getReceiptLines(receiptId);
    },
  });
}

/** Derived receiving status per manufacturer order. */
export function usePOProgress(salesOrderId?: string) {
  return useQuery({
    queryKey: receiptKeys.poProgress(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!salesOrderId) return {};
      return getPOProgress(salesOrderId);
    },
  });
}

/**
 * Damaged product across the organization. The backing query for a freight
 * claim queue — this is money already paid for that cannot be installed.
 */
export function useDamagedLines(organizationId?: string) {
  return useQuery({
    queryKey: receiptKeys.damaged(organizationId ?? '__pending__'),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!organizationId) return [];
      return getDamagedLines(organizationId);
    },
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      receipt,
      lines,
    }: {
      receipt: CreateReceiptInput;
      lines: CreateReceiptLineInput[];
    }) => createReceipt(receipt, lines),
    onSuccess: (_id, variables) => {
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });
      // Fulfillment quantities and both derived statuses come from the events
      // this just wrote.
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: varianceQueryKeys.all });

      const damaged = variables.lines.reduce(
        (sum, line) => sum + (line.quantity_damaged ?? 0),
        0
      );
      const received = variables.lines.reduce(
        (sum, line) => sum + line.quantity_received,
        0
      );

      toast.success('Delivery recorded', {
        description:
          damaged > 0
            ? `${received} received, ${damaged} damaged and still owed`
            : `${received} received`,
      });
    },
    onError: (error: unknown) =>
      toast.error('Could not record the delivery', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
