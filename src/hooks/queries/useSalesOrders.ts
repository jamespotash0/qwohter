/**
 * React Query hooks for sales orders, their lines, and the manufacturer
 * order fan-out.
 *
 * Fulfillment quantities come from the order_line_fulfillment view, never from a
 * column, so anything that records an event invalidates the whole namespace
 * rather than patching a row.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getSalesOrdersForOrganization,
  getSalesOrdersForProject,
  getSalesOrderById,
  getOrderLines,
  getOrderFulfillment,
  previewOrderFromProposal,
  createOrderFromProposal,
  updateSalesOrder,
  getProjectIdForProposal,
  getOrderProgress,
  getLinesForDiff,
  applySpecRevision,
  type SalesOrder,
  type OrderLine,
  type CreateSalesOrderInput,
} from '@/services/salesOrdersService';
import {
  planFanOut,
  fanOutPurchaseOrders,
  getVendorPOs,
  type FanOutPlan,
  type CreateVendorPOInput,
} from '@/services/vendorPOService';
import { varianceQueryKeys } from './useVarianceQueue';

export type { SalesOrder, OrderLine } from '@/services/salesOrdersService';
export type { FanOutPlan, FanOutGroup } from '@/services/vendorPOService';

export const salesOrderKeys = {
  all: ['sales-orders'] as const,
  list: (organizationId: string) => [...salesOrderKeys.all, 'list', organizationId] as const,
  forProject: (projectId: string) => [...salesOrderKeys.all, 'project', projectId] as const,
  detail: (salesOrderId: string) => [...salesOrderKeys.all, 'detail', salesOrderId] as const,
  lines: (salesOrderId: string) => [...salesOrderKeys.all, 'lines', salesOrderId] as const,
  fulfillment: (salesOrderId: string) =>
    [...salesOrderKeys.all, 'fulfillment', salesOrderId] as const,
  fanOut: (salesOrderId: string) => [...salesOrderKeys.all, 'fan-out', salesOrderId] as const,
  pos: (salesOrderId: string) => [...salesOrderKeys.all, 'pos', salesOrderId] as const,
  preview: (proposalId: string) => [...salesOrderKeys.all, 'preview', proposalId] as const,
  linesForDiff: (salesOrderId: string) =>
    [...salesOrderKeys.all, 'lines-for-diff', salesOrderId] as const,
  progress: (organizationId: string) =>
    [...salesOrderKeys.all, 'progress', organizationId] as const,
  projectFor: (proposalId: string) =>
    [...salesOrderKeys.all, 'project-for', proposalId] as const,
};

/**
 * The project a won proposal was promoted to. Null means it was never sent to
 * the board, so there is nothing for an order to hang off yet.
 */
export function useProjectIdForProposal(proposalId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.projectFor(proposalId ?? '__pending__'),
    enabled: !!proposalId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!proposalId) return null;
      return getProjectIdForProposal(proposalId);
    },
  });
}

export function useSalesOrders(organizationId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.list(organizationId ?? '__pending__'),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SalesOrder[]> => {
      if (!organizationId) return [];
      return getSalesOrdersForOrganization(organizationId);
    },
  });
}

/**
 * Where each order has actually got to, derived from events rather than read
 * from the stored status column. Short stale time: recording anything at all
 * changes the answer.
 */
export function useOrderProgress(organizationId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.progress(organizationId ?? '__pending__'),
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!organizationId) return {};
      return getOrderProgress(organizationId);
    },
  });
}

export function useSalesOrdersForProject(projectId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.forProject(projectId ?? '__pending__'),
    enabled: !!projectId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SalesOrder[]> => {
      if (!projectId) return [];
      return getSalesOrdersForProject(projectId);
    },
  });
}

export function useSalesOrder(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.detail(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SalesOrder | null> => {
      if (!salesOrderId) return null;
      return getSalesOrderById(salesOrderId);
    },
  });
}

export function useOrderLines(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.lines(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<OrderLine[]> => {
      if (!salesOrderId) return [];
      return getOrderLines(salesOrderId);
    },
  });
}

/** Derived quantities per line. There is no stored counter to read instead. */
export function useOrderFulfillment(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.fulfillment(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!salesOrderId) return {};
      return getOrderFulfillment(salesOrderId);
    },
  });
}

/**
 * What this order still needs to buy, grouped by manufacturer.
 *
 * Short stale time: recording an order changes the answer, and a stale plan
 * would offer to buy product that was just bought.
 */
export function useFanOutPlan(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.fanOut(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 15 * 1000,
    queryFn: async (): Promise<FanOutPlan> => {
      if (!salesOrderId) {
        return { groups: [], unassignedLines: [], unroutedLines: [], notPurchased: [] };
      }
      return planFanOut(salesOrderId);
    },
  });
}

export function useVendorPOs(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.pos(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!salesOrderId) return [];
      return getVendorPOs(salesOrderId);
    },
  });
}

/**
 * What creating an order from this proposal would produce, without writing.
 *
 * Deliberately a query rather than something the create path does silently: a
 * dealer should see what the order contains before it exists, not after.
 */
export function useOrderPreview(proposalId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.preview(proposalId ?? '__pending__'),
    enabled: !!proposalId,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      if (!proposalId) return null;
      return previewOrderFromProposal(proposalId);
    },
  });
}

export function useCreateOrderFromProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      input,
    }: {
      proposalId: string;
      input: Omit<CreateSalesOrderInput, 'proposal_id'>;
    }) => createOrderFromProposal(proposalId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      toast.success('Sales order created');
    },
    onError: (error: unknown) =>
      toast.error('Could not create the order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      salesOrderId,
      patch,
    }: {
      salesOrderId: string;
      patch: Partial<CreateSalesOrderInput>;
    }) => updateSalesOrder(salesOrderId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      toast.success('Order updated');
    },
    onError: (error: unknown) =>
      toast.error('Could not update the order', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/**
 * Record an order for every manufacturer group in a plan.
 *
 * Each manufacturer is independent, so a partial result is normal and is
 * reported rather than hidden — the toast names any that was not recorded.
 */
export function useFanOutPurchaseOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      plan,
      base,
      poNumbers,
    }: {
      plan: FanOutPlan;
      base: Omit<CreateVendorPOInput, 'manufacturer_name' | 'po_number'>;
      poNumbers?: Record<string, string>;
    }) => fanOutPurchaseOrders(plan, base, poNumbers),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: varianceQueryKeys.all });

      if (result.created.length > 0) {
        toast.success(
          `${result.created.length} order${result.created.length === 1 ? '' : 's'} recorded`,
          { description: result.created.map(c => c.manufacturerName).join(', ') }
        );
      }
      if (result.failed.length > 0) {
        toast.error(
          `${result.failed.length} order${result.failed.length === 1 ? '' : 's'} could not be recorded`,
          {
            description: result.failed
              .map(f => `${f.manufacturerName}: ${f.error}`)
              .join(' · '),
          }
        );
      }
    },
    onError: (error: unknown) =>
      toast.error('Could not record the orders', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}


/**
 * Order lines paired with how much of each is already on a manufacturer order.
 *
 * The fulfillment figure is what makes a revision safe to review: without it
 * every line looks free to change, including the ones a factory has already
 * been told to build.
 */
export function useLinesForDiff(salesOrderId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.linesForDiff(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!salesOrderId) return [];
      return getLinesForDiff(salesOrderId);
    },
  });
}

export function useApplyRevision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      salesOrderId,
      payload,
    }: {
      salesOrderId: string;
      payload: Parameters<typeof applySpecRevision>[1];
    }) => applySpecRevision(salesOrderId, payload),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: varianceQueryKeys.all });

      const parts = [
        result.added > 0 && `${result.added} added`,
        result.updated > 0 && `${result.updated} changed`,
        result.removed > 0 && `${result.removed} cancelled`,
      ].filter(Boolean);

      toast.success('Revision applied', {
        description: parts.length > 0 ? parts.join(', ') : 'Nothing to change',
      });

      // Refusals are not an error — they are the guard doing its job — but the
      // person needs to know those lines still need a change order.
      if (result.refused > 0) {
        toast.warning(
          `${result.refused} line${result.refused === 1 ? '' : 's'} left alone`,
          { description: 'Already on a manufacturer order — raise a change order instead.' }
        );
      }
    },
    onError: (error: unknown) =>
      toast.error('Could not apply the revision', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
