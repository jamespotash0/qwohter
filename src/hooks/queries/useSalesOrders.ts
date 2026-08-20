/**
 * React Query hooks for sales orders, their lines, and the purchase order
 * fan-out.
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
  assignVendorToLines,
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
 * What purchase orders this order still needs, grouped by vendor.
 *
 * Short stale time: issuing a PO changes the answer, and a stale plan would
 * offer to buy product that was just bought.
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
 * dealer should see "3 manufacturers have no vendor account" before the order
 * exists, not after.
 */
export function useOrderPreview(proposalId?: string, organizationId?: string) {
  return useQuery({
    queryKey: salesOrderKeys.preview(proposalId ?? '__pending__'),
    enabled: !!proposalId && !!organizationId,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      if (!proposalId || !organizationId) return null;
      return previewOrderFromProposal(proposalId, organizationId);
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
 * Issue a purchase order for every vendor group in a plan.
 *
 * Each vendor is independent, so a partial result is normal and is reported
 * rather than hidden — the toast names any vendor that did not get an order.
 */
export function useFanOutPurchaseOrders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      plan,
      base,
    }: {
      plan: FanOutPlan;
      base: Omit<CreateVendorPOInput, 'vendor_id' | 'po_number'>;
    }) => fanOutPurchaseOrders(plan, base),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: varianceQueryKeys.all });

      if (result.created.length > 0) {
        toast.success(
          `${result.created.length} purchase order${result.created.length === 1 ? '' : 's'} created`,
          { description: result.created.map(c => c.vendorName).join(', ') }
        );
      }
      if (result.failed.length > 0) {
        toast.error(
          `${result.failed.length} vendor${result.failed.length === 1 ? '' : 's'} could not be ordered`,
          { description: result.failed.map(f => `${f.vendorName}: ${f.error}`).join(' · ') }
        );
      }
    },
    onError: (error: unknown) =>
      toast.error('Could not issue purchase orders', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/** Attach a newly created vendor to the lines that were waiting for one. */
export function useAssignVendorToLines() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      salesOrderId,
      manufacturerName,
      vendorId,
    }: {
      salesOrderId: string;
      manufacturerName: string;
      vendorId: string;
    }) => assignVendorToLines(salesOrderId, manufacturerName, vendorId),
    onSuccess: count => {
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });
      toast.success(`${count} line${count === 1 ? '' : 's'} assigned`);
    },
    onError: (error: unknown) =>
      toast.error('Could not assign the vendor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
