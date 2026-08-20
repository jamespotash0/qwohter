/**
 * React Query hooks for companies (customer accounts).
 *
 * One cache entry per organization holds the active company list, which is what
 * the company picker reads. Mutations invalidate that entry rather than patching
 * it, because the org-scoped unique name index means the server is the
 * authority on whether a write landed.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getCompanies,
  getCompanyById,
  searchCompanies,
  createCompany,
  updateCompany,
  deactivateCompany,
  deleteCompany,
  type Company,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from '@/services/companiesService';

export type { Company } from '@/services/companiesService';
export {
  getBillingAddress,
  getShippingAddress,
  formatAddress,
} from '@/services/companiesService';

export const companiesQueryKeys = {
  all: ['companies'] as const,
  list: (organizationId: string, includeInactive: boolean) =>
    [...companiesQueryKeys.all, 'list', organizationId, includeInactive] as const,
  detail: (companyId: string) =>
    [...companiesQueryKeys.all, 'detail', companyId] as const,
  search: (organizationId: string, term: string) =>
    [...companiesQueryKeys.all, 'search', organizationId, term] as const,
};

/** Companies for an organization, alphabetical. Active only unless asked. */
export function useCompanies(organizationId?: string, includeInactive = false) {
  return useQuery({
    queryKey: companiesQueryKeys.list(organizationId ?? '__pending__', includeInactive),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Company[]> => {
      if (!organizationId) return [];
      return getCompanies(organizationId, includeInactive);
    },
  });
}

export function useCompany(companyId?: string) {
  return useQuery({
    queryKey: companiesQueryKeys.detail(companyId ?? '__pending__'),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Company | null> => {
      if (!companyId) return null;
      return getCompanyById(companyId);
    },
  });
}

/**
 * Server-side company search. Only runs once the term is worth a round trip;
 * below that the caller should filter the already-cached list locally.
 */
export function useCompanySearch(organizationId?: string, term = '') {
  const trimmed = term.trim();
  return useQuery({
    queryKey: companiesQueryKeys.search(organizationId ?? '__pending__', trimmed),
    enabled: !!organizationId && trimmed.length >= 2,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Company[]> => {
      if (!organizationId) return [];
      return searchCompanies(organizationId, trimmed);
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCompanyInput) => createCompany(input),
    onSuccess: company => {
      queryClient.invalidateQueries({ queryKey: companiesQueryKeys.all });
      toast.success('Company created', { description: company.name });
    },
    onError: (error: unknown) => {
      toast.error('Could not create company', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, patch }: { companyId: string; patch: UpdateCompanyInput }) =>
      updateCompany(companyId, patch),
    onSuccess: company => {
      queryClient.invalidateQueries({ queryKey: companiesQueryKeys.all });
      queryClient.setQueryData(companiesQueryKeys.detail(company.id), company);
      toast.success('Company updated', { description: company.name });
    },
    onError: (error: unknown) => {
      toast.error('Could not update company', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Deactivate rather than delete — the everyday way to retire an account that
 * order history still references.
 */
export function useDeactivateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => deactivateCompany(companyId),
    onSuccess: company => {
      queryClient.invalidateQueries({ queryKey: companiesQueryKeys.all });
      toast.success('Company deactivated', { description: company.name });
    },
    onError: (error: unknown) => {
      toast.error('Could not deactivate company', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => deleteCompany(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesQueryKeys.all });
      toast.success('Company deleted');
    },
    onError: (error: unknown) => {
      toast.error('Could not delete company', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
