/**
 * Payments Service
 *
 * Phased billing for won projects:
 *   project → payment_job → billing_phase(s) → invoice (QuickBooks)
 *
 * Payment jobs group billing phases for a project; each phase bills a slice of
 * the contract (a percentage of the total or a fixed amount) and is the unit
 * that becomes a QuickBooks invoice. Reconciliation helpers resolve phase
 * amounts against the contract total so the UI can flag under/over-allocation.
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchProposalById } from '@/services/proposalsService';
import { generatePhaseInvoiceQBXML } from '@/lib/qbxml/generators';
import { checkQBDesktopConnection } from '@/services/quickbooksDesktopService';
import { checkQBOnlineConnection } from '@/services/quickbooksOnlineService';

// ============================================================================
// Types
// ============================================================================

export type PaymentJobStatus = 'Active' | 'Complete' | 'Cancelled';

export interface PaymentJob {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  contract_total: number;
  billing_email: string | null;
  status: PaymentJobStatus;
  created_at: string;
  updated_at: string;
}

export type AmountType = 'percent' | 'fixed';
export type TriggerType = 'manual' | 'milestone' | 'date';
export type BillingPhaseStatus =
  | 'Draft'
  | 'Invoiced'
  | 'Sent'
  | 'Paid'
  | 'Overdue'
  | 'Void';

export interface BillingPhase {
  id: string;
  organization_id: string;
  payment_job_id: string;
  sequence: number;
  name: string;
  amount_type: AmountType;
  amount_value: number;
  resolved_amount: number | null;
  trigger_type: TriggerType;
  trigger_milestone_key: string | null;
  due_date: string | null;
  billing_email: string | null;
  status: BillingPhaseStatus;
  invoiced_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentJobInput {
  organization_id: string;
  project_id: string;
  name?: string;
  contract_total?: number;
  billing_email?: string | null;
}

export interface CreateBillingPhaseInput {
  organization_id: string;
  payment_job_id: string;
  sequence: number;
  name: string;
  amount_type: AmountType;
  amount_value: number;
  trigger_type?: TriggerType;
  trigger_milestone_key?: string | null;
  due_date?: string | null;
  billing_email?: string | null;
}

// ============================================================================
// Reconciliation (pure helpers — no DB)
// ============================================================================

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Resolve a phase to a dollar amount against the contract total.
 * percent → contract_total * value / 100; fixed → value as-is.
 */
export function resolvePhaseAmount(
  phase: Pick<BillingPhase, 'amount_type' | 'amount_value'>,
  contractTotal: number
): number {
  if (phase.amount_type === 'percent') {
    return round2((contractTotal * phase.amount_value) / 100);
  }
  return round2(phase.amount_value);
}

export interface AllocationSummary {
  /** Sum of all phases resolved to dollars. */
  allocated: number;
  /** contract_total − allocated (negative when over-allocated). */
  remaining: number;
  /** allocated equals the contract total (within a cent). */
  isBalanced: boolean;
  /** Phases bill more than the contract total. */
  isOverAllocated: boolean;
}

/**
 * Summarize how much of the contract the phases bill, for the
 * "$X unallocated" / "over-billed" warnings in the Payments tab.
 */
export function summarizeAllocation(
  phases: Pick<BillingPhase, 'amount_type' | 'amount_value'>[],
  contractTotal: number
): AllocationSummary {
  const allocated = round2(
    phases.reduce((sum, p) => sum + resolvePhaseAmount(p, contractTotal), 0)
  );
  const remaining = round2(contractTotal - allocated);
  return {
    allocated,
    remaining,
    isBalanced: Math.abs(remaining) < 0.01,
    isOverAllocated: remaining < -0.01,
  };
}

/**
 * The default 3-phase template seeded for a new job (sums to 100%).
 */
export const DEFAULT_PHASE_TEMPLATE: Array<
  Pick<CreateBillingPhaseInput, 'name' | 'amount_type' | 'amount_value'>
> = [
  { name: 'Deposit', amount_type: 'percent', amount_value: 40 },
  { name: 'Progress', amount_type: 'percent', amount_value: 30 },
  { name: 'Final', amount_type: 'percent', amount_value: 30 },
];

// ============================================================================
// Payment jobs
// ============================================================================

export async function getPaymentJobsForProject(
  projectId: string
): Promise<PaymentJob[]> {
  const { data, error } = await supabase
    .from('payment_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as PaymentJob[];
}

export async function createPaymentJob(
  input: CreatePaymentJobInput
): Promise<PaymentJob> {
  const { data, error } = await supabase
    .from('payment_jobs')
    .insert({
      organization_id: input.organization_id,
      project_id: input.project_id,
      name: input.name ?? 'Main Contract',
      contract_total: input.contract_total ?? 0,
      billing_email: input.billing_email ?? null,
    } as any)
    .select('*')
    .single();

  if (error) throw error;
  return data as PaymentJob;
}

export async function updatePaymentJob(
  id: string,
  patch: Partial<Pick<PaymentJob, 'name' | 'contract_total' | 'billing_email' | 'status'>>
): Promise<PaymentJob> {
  const { data, error } = await supabase
    .from('payment_jobs')
    .update(patch as any)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as PaymentJob;
}

export async function deletePaymentJob(id: string): Promise<void> {
  const { error } = await supabase.from('payment_jobs').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================================
// Billing phases
// ============================================================================

export async function getBillingPhases(
  paymentJobId: string
): Promise<BillingPhase[]> {
  const { data, error } = await supabase
    .from('billing_phases')
    .select('*')
    .eq('payment_job_id', paymentJobId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return (data ?? []) as BillingPhase[];
}

export async function createBillingPhase(
  input: CreateBillingPhaseInput
): Promise<BillingPhase> {
  const { data, error } = await supabase
    .from('billing_phases')
    .insert({
      organization_id: input.organization_id,
      payment_job_id: input.payment_job_id,
      sequence: input.sequence,
      name: input.name,
      amount_type: input.amount_type,
      amount_value: input.amount_value,
      trigger_type: input.trigger_type ?? 'manual',
      trigger_milestone_key: input.trigger_milestone_key ?? null,
      due_date: input.due_date ?? null,
      billing_email: input.billing_email ?? null,
    } as any)
    .select('*')
    .single();

  if (error) throw error;
  return data as BillingPhase;
}

export async function updateBillingPhase(
  id: string,
  patch: Partial<
    Pick<
      BillingPhase,
      | 'name'
      | 'sequence'
      | 'amount_type'
      | 'amount_value'
      | 'resolved_amount'
      | 'trigger_type'
      | 'trigger_milestone_key'
      | 'due_date'
      | 'billing_email'
      | 'status'
      | 'invoiced_at'
      | 'paid_at'
    >
  >
): Promise<BillingPhase> {
  const { data, error } = await supabase
    .from('billing_phases')
    .update(patch as any)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as BillingPhase;
}

export async function deleteBillingPhase(id: string): Promise<void> {
  const { error } = await supabase.from('billing_phases').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Seed the default 3-phase template under a freshly created job.
 */
export async function seedDefaultPhases(job: PaymentJob): Promise<BillingPhase[]> {
  const phases = await Promise.all(
    DEFAULT_PHASE_TEMPLATE.map((tpl, index) =>
      createBillingPhase({
        organization_id: job.organization_id,
        payment_job_id: job.id,
        sequence: index,
        name: tpl.name,
        amount_type: tpl.amount_type,
        amount_value: tpl.amount_value,
      })
    )
  );
  return phases;
}

/**
 * Mark a phase Paid (manual for now; a QuickBooks paid-status pull replaces
 * this later without changing the shape).
 */
export async function markPhasePaid(id: string): Promise<BillingPhase> {
  return updateBillingPhase(id, {
    status: 'Paid',
    paid_at: new Date().toISOString(),
  });
}

// ============================================================================
// Invoice send (per phase → QuickBooks Desktop)
// ============================================================================

/**
 * Push a billing phase to QuickBooks Desktop as its own invoice.
 *
 * Resolves the phase → job → project → proposal chain for the customer/address,
 * generates a single-line qbXML invoice for the phase amount, queues it for the
 * Web Connector, links the invoice_sync row to the phase, and advances the phase
 * to "Invoiced" (the Web Connector flips it to "Sent" once QuickBooks confirms).
 *
 * QuickBooks Online phased billing is not supported yet — it uses a separate
 * per-proposal sync table and a server-built invoice.
 */
export async function sendPhaseInvoice(
  phase: BillingPhase,
  job: PaymentJob
): Promise<void> {
  if (phase.status === 'Invoiced' || phase.status === 'Sent' || phase.status === 'Paid') {
    throw new Error('This phase has already been invoiced');
  }

  // Provider must be Desktop.
  const desktop = await checkQBDesktopConnection(job.organization_id);
  if (!desktop) {
    const online = await checkQBOnlineConnection(job.organization_id);
    if (online) {
      throw new Error(
        'Phased billing currently supports QuickBooks Desktop only. Online phased invoicing is coming soon.'
      );
    }
    throw new Error('QuickBooks Desktop is not connected');
  }

  // Resolve project → proposal for the customer details.
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('proposal_id')
    .eq('id', job.project_id)
    .single();
  if (projectError) throw projectError;
  const proposalId = (project as { proposal_id: string | null })?.proposal_id;
  if (!proposalId) throw new Error('Project is not linked to a proposal');

  const proposal = await fetchProposalById(proposalId);

  const amount = resolvePhaseAmount(phase, job.contract_total);
  const refNumber = `${proposal.proposal_number || 'INV'}-${phase.sequence + 1}`;
  const qbxml = generatePhaseInvoiceQBXML(proposal, {
    name: phase.name,
    refNumber,
    amount,
  });

  // Queue the qbXML for the Web Connector to drain. source_record_type tells the
  // response handler to link the result back by billing_phase_id, not proposal_id.
  const { error: queueError } = await supabase
    .from('quickbooks_request_queue')
    .insert({
      organization_id: job.organization_id,
      request_type: 'InvoiceAdd',
      qbxml_request: qbxml,
      priority: 5,
      source_record_type: 'BillingPhase',
      source_record_id: phase.id,
    } as any);
  if (queueError) throw queueError;

  // One sync row per phase (partial-unique on billing_phase_id).
  const { data: existingSync } = await supabase
    .from('quickbooks_desktop_invoice_sync')
    .select('id')
    .eq('billing_phase_id', phase.id)
    .maybeSingle();

  if (existingSync) {
    await supabase
      .from('quickbooks_desktop_invoice_sync')
      .update({ sync_status: 'Pending', sync_error: null } as any)
      .eq('billing_phase_id', phase.id);
  } else {
    await supabase
      .from('quickbooks_desktop_invoice_sync')
      .insert({
        proposal_id: proposalId,
        billing_phase_id: phase.id,
        organization_id: job.organization_id,
        sync_status: 'Pending',
      } as any);
  }

  // Snapshot the billed amount and advance the phase.
  await updateBillingPhase(phase.id, {
    status: 'Invoiced',
    resolved_amount: amount,
    invoiced_at: new Date().toISOString(),
  });
}
