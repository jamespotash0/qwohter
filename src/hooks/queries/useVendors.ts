/**
 * React Query hooks for vendors and their discount agreements.
 *
 * Discount rows are RLS-filtered on cost visibility, so a user without it gets
 * an empty list rather than an error. `useResolvedDiscount` returns null in that
 * case, which callers must render as "cannot price" — never as zero discount.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getVendors,
  getVendorById,
  getVendorForManufacturer,
  createVendor,
  updateVendor,
  deactivateVendor,
  deleteVendor,
  getVendorDiscounts,
  getAllVendorDiscounts,
  createVendorDiscount,
  updateVendorDiscount,
  deleteVendorDiscount,
  canViewCost,
  type Vendor,
  type VendorDiscount,
  type CreateVendorInput,
  type UpdateVendorInput,
  type CreateVendorDiscountInput,
  type UpdateVendorDiscountInput,
} from '@/services/vendorsService';
import { resolveDiscount, type ResolvedDiscount } from '@/lib/pricing';

export type { Vendor, VendorDiscount } from '@/services/vendorsService';
export {
  getOrderDestination,
  getAcknowledgmentEmail,
} from '@/services/vendorsService';

export const vendorsQueryKeys = {
  all: ['vendors'] as const,
  list: (organizationId: string, includeInactive: boolean) =>
    [...vendorsQueryKeys.all, 'list', organizationId, includeInactive] as const,
  detail: (vendorId: string) => [...vendorsQueryKeys.all, 'detail', vendorId] as const,
  forManufacturer: (organizationId: string, manufacturerName: string) =>
    [...vendorsQueryKeys.all, 'manufacturer', organizationId, manufacturerName] as const,
  discounts: (vendorId: string) =>
    [...vendorsQueryKeys.all, 'discounts', vendorId] as const,
  allDiscounts: (organizationId: string) =>
    [...vendorsQueryKeys.all, 'discounts', 'org', organizationId] as const,
  costAccess: (userId: string, organizationId: string) =>
    [...vendorsQueryKeys.all, 'cost-access', userId, organizationId] as const,
};

// ============================================================================
// Vendors
// ============================================================================

export function useVendors(organizationId?: string, includeInactive = false) {
  return useQuery({
    queryKey: vendorsQueryKeys.list(organizationId ?? '__pending__', includeInactive),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Vendor[]> => {
      if (!organizationId) return [];
      return getVendors(organizationId, includeInactive);
    },
  });
}

export function useVendor(vendorId?: string) {
  return useQuery({
    queryKey: vendorsQueryKeys.detail(vendorId ?? '__pending__'),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Vendor | null> => {
      if (!vendorId) return null;
      return getVendorById(vendorId);
    },
  });
}

/**
 * The vendor account backing a manufacturer name, as a specification export
 * spells it. Null means no account exists, so lines from that manufacturer
 * cannot be put on a purchase order yet.
 */
export function useVendorForManufacturer(
  organizationId?: string,
  manufacturerName?: string
) {
  return useQuery({
    queryKey: vendorsQueryKeys.forManufacturer(
      organizationId ?? '__pending__',
      manufacturerName ?? '__pending__'
    ),
    enabled: !!organizationId && !!manufacturerName,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Vendor | null> => {
      if (!organizationId || !manufacturerName) return null;
      return getVendorForManufacturer(organizationId, manufacturerName);
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorInput) => createVendor(input),
    onSuccess: vendor => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      toast.success('Vendor created', { description: vendor.name });
    },
    onError: (error: unknown) =>
      toast.error('Could not create vendor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, patch }: { vendorId: string; patch: UpdateVendorInput }) =>
      updateVendor(vendorId, patch),
    onSuccess: vendor => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      queryClient.setQueryData(vendorsQueryKeys.detail(vendor.id), vendor);
      toast.success('Vendor updated', { description: vendor.name });
    },
    onError: (error: unknown) =>
      toast.error('Could not update vendor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useDeactivateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => deactivateVendor(vendorId),
    onSuccess: vendor => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      toast.success('Vendor deactivated', { description: vendor.name });
    },
    onError: (error: unknown) =>
      toast.error('Could not deactivate vendor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) => deleteVendor(vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      toast.success('Vendor deleted');
    },
    onError: (error: unknown) =>
      toast.error('Could not delete vendor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

// ============================================================================
// Discount agreements
// ============================================================================

export function useVendorDiscounts(vendorId?: string) {
  return useQuery({
    queryKey: vendorsQueryKeys.discounts(vendorId ?? '__pending__'),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<VendorDiscount[]> => {
      if (!vendorId) return [];
      return getVendorDiscounts(vendorId);
    },
  });
}

export function useAllVendorDiscounts(organizationId?: string) {
  return useQuery({
    queryKey: vendorsQueryKeys.allDiscounts(organizationId ?? '__pending__'),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<VendorDiscount[]> => {
      if (!organizationId) return [];
      return getAllVendorDiscounts(organizationId);
    },
  });
}

export function useCreateVendorDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorDiscountInput) => createVendorDiscount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      toast.success('Discount added');
    },
    onError: (error: unknown) =>
      toast.error('Could not add discount', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateVendorDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      discountId,
      patch,
    }: {
      discountId: string;
      patch: UpdateVendorDiscountInput;
    }) => updateVendorDiscount(discountId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      toast.success('Discount updated');
    },
    onError: (error: unknown) =>
      toast.error('Could not update discount', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useDeleteVendorDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (discountId: string) => deleteVendorDiscount(discountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorsQueryKeys.all });
      toast.success('Discount removed');
    },
    onError: (error: unknown) =>
      toast.error('Could not remove discount', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/**
 * The discount that applies to one line from one vendor.
 *
 * Returns null when no agreement on file covers it — which is a different state
 * from a 0% discount and must be surfaced as "cannot price", not as list price.
 */
export function useResolvedDiscount(
  vendorId?: string,
  options: { seriesName?: string | null; contractVehicle?: string | null; asOf?: string } = {}
): { discount: ResolvedDiscount | null; isLoading: boolean } {
  const { data: agreements, isLoading } = useVendorDiscounts(vendorId);
  const { seriesName, contractVehicle, asOf } = options;

  const discount = useMemo(() => {
    if (!agreements || agreements.length === 0) return null;
    return resolveDiscount(agreements, { seriesName, contractVehicle, asOf });
  }, [agreements, seriesName, contractVehicle, asOf]);

  return { discount, isLoading };
}

// ============================================================================
// Cost visibility
// ============================================================================

/**
 * Whether the current user may see cost and margin. Mirrors the RLS predicate
 * so the UI can hide cost columns rather than render empty ones. Fails closed.
 */
export function useCanViewCost(userId?: string, organizationId?: string) {
  return useQuery({
    queryKey: vendorsQueryKeys.costAccess(
      userId ?? '__pending__',
      organizationId ?? '__pending__'
    ),
    enabled: !!userId && !!organizationId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      if (!userId || !organizationId) return false;
      return canViewCost(userId, organizationId);
    },
  });
}
