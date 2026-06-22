/**
 * React Query hooks for phased billing (payment jobs + billing phases).
 *
 * One query loads every payment job for a project with its phases embedded, so
 * the Payments tab renders the whole plan from a single cache entry. Mutations
 * invalidate that entry.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getPaymentJobsForProject,
  getBillingPhases,
  createPaymentJob,
  updatePaymentJob,
  deletePaymentJob,
  createBillingPhase,
  updateBillingPhase,
  deleteBillingPhase,
  seedDefaultPhases,
  markPhasePaid,
  type PaymentJob,
  type BillingPhase,
  type CreatePaymentJobInput,
  type CreateBillingPhaseInput,
} from '@/services/paymentsService';

export type { PaymentJob, BillingPhase } from '@/services/paymentsService';
export {
  resolvePhaseAmount,
  summarizeAllocation,
  DEFAULT_PHASE_TEMPLATE,
} from '@/services/paymentsService';

export interface PaymentJobWithPhases extends PaymentJob {
  phases: BillingPhase[];
}

export const paymentsQueryKeys = {
  all: ['payments'] as const,
  project: (projectId: string) =>
    [...paymentsQueryKeys.all, 'project', projectId] as const,
};

/**
 * Load all payment jobs (with their phases) for a project.
 */
export function useProjectPayments(projectId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: paymentsQueryKeys.project(projectId || '__pending__'),
    enabled: !!projectId && enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PaymentJobWithPhases[]> => {
      if (!projectId) return [];
      const jobs = await getPaymentJobsForProject(projectId);
      const withPhases = await Promise.all(
        jobs.map(async (job) => ({
          ...job,
          phases: await getBillingPhases(job.id),
        }))
      );
      return withPhases;
    },
  });
}

/**
 * Mutations for a project's payments. Pass the projectId so every mutation
 * invalidates the right cache entry.
 */
export function useProjectPaymentMutations(projectId: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: paymentsQueryKeys.project(projectId),
    });

  const createJob = useMutation({
    mutationFn: async (
      input: CreatePaymentJobInput & { seedPhases?: boolean }
    ) => {
      const job = await createPaymentJob(input);
      if (input.seedPhases) await seedDefaultPhases(job);
      return job;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Payment job created');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to create payment job'),
  });

  const updateJob = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updatePaymentJob>[1] }) =>
      updatePaymentJob(id, patch),
    onSuccess: invalidate,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to update payment job'),
  });

  const deleteJob = useMutation({
    mutationFn: (id: string) => deletePaymentJob(id),
    onSuccess: () => {
      invalidate();
      toast.success('Payment job deleted');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to delete payment job'),
  });

  const createPhase = useMutation({
    mutationFn: (input: CreateBillingPhaseInput) => createBillingPhase(input),
    onSuccess: invalidate,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to add phase'),
  });

  const updatePhase = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateBillingPhase>[1] }) =>
      updateBillingPhase(id, patch),
    onSuccess: invalidate,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to update phase'),
  });

  const deletePhase = useMutation({
    mutationFn: (id: string) => deleteBillingPhase(id),
    onSuccess: invalidate,
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to delete phase'),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => markPhasePaid(id),
    onSuccess: () => {
      invalidate();
      toast.success('Phase marked paid');
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to mark phase paid'),
  });

  return {
    createJob,
    updateJob,
    deleteJob,
    createPhase,
    updatePhase,
    deletePhase,
    markPaid,
  };
}
