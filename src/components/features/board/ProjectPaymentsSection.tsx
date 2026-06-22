/**
 * ProjectPaymentsSection
 *
 * Phased-billing UI for a project, rendered inside the project overlay.
 * Shows the payment job(s) and their billing phases, with inline editing,
 * an allocation summary (so the phases reconcile to the contract total),
 * and per-phase mark-paid. Invoice data is admin-only, so this only renders
 * when the viewer can manage payments.
 */

import { Plus, Trash2, CheckCircle2, Send } from 'lucide-react';
import {
  useProjectPayments,
  useProjectPaymentMutations,
  resolvePhaseAmount,
  summarizeAllocation,
  type PaymentJobWithPhases,
  type PaymentJob,
  type BillingPhase,
} from '@/hooks/queries/useProjectPayments';

interface ProjectPaymentsSectionProps {
  projectId: string;
  organizationId: string;
  /** Default contract total for a new job (the linked proposal's value). */
  contractDefault?: number;
}

const fmtCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const PHASE_STATUS_COLORS: Record<BillingPhase['status'], string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Invoiced: 'bg-blue-100 text-blue-700',
  Sent: 'bg-purple-100 text-purple-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Overdue: 'bg-red-100 text-red-700',
  Void: 'bg-gray-100 text-gray-400 line-through',
};

export function ProjectPaymentsSection({
  projectId,
  organizationId,
  contractDefault = 0,
}: ProjectPaymentsSectionProps) {
  const { data: jobs = [], isLoading } = useProjectPayments(projectId);
  const m = useProjectPaymentMutations(projectId);

  if (isLoading) {
    return <p className="text-xs text-gray-400">Loading…</p>;
  }

  if (jobs.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500">
          No payment plan yet. Create one to bill this project in phases.
        </p>
        <button
          onClick={() =>
            m.createJob.mutate({
              organization_id: organizationId,
              project_id: projectId,
              contract_total: contractDefault,
              seedPhases: true,
            })
          }
          disabled={m.createJob.isPending}
          className="h-7 px-2.5 text-[11px] rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          Create payment plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <PaymentJobCard key={job.id} job={job} mutations={m} />
      ))}
    </div>
  );
}

function PaymentJobCard({
  job,
  mutations: m,
}: {
  job: PaymentJobWithPhases;
  mutations: ReturnType<typeof useProjectPaymentMutations>;
}) {
  const alloc = summarizeAllocation(job.phases, job.contract_total);
  const nextSequence =
    job.phases.reduce((max, p) => Math.max(max, p.sequence), -1) + 1;

  return (
    <div className="rounded-lg border border-gray-100 p-3 space-y-2">
      {/* Job header: name + contract total (editable) */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-700 truncate">{job.name}</span>
        <label className="flex items-center gap-1 text-[11px] text-gray-400">
          Contract
          <input
            type="number"
            defaultValue={job.contract_total}
            onBlur={(e) => {
              const v = parseFloat(e.target.value) || 0;
              if (v !== job.contract_total) m.updateJob.mutate({ id: job.id, patch: { contract_total: v } });
            }}
            className="w-24 h-6 px-1.5 text-right text-[11px] rounded border border-gray-200 bg-gray-50"
          />
        </label>
      </div>

      {/* Phases */}
      <div className="space-y-1.5">
        {job.phases.map((phase) => (
          <PhaseRow
            key={phase.id}
            phase={phase}
            job={job}
            mutations={m}
          />
        ))}
      </div>

      {/* Allocation summary */}
      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[11px]">
        <span className="text-gray-400">
          Allocated {fmtCurrency(alloc.allocated)} of {fmtCurrency(job.contract_total)}
        </span>
        {alloc.isBalanced ? (
          <span className="text-emerald-600">Balanced ✓</span>
        ) : alloc.isOverAllocated ? (
          <span className="text-red-600">Over by {fmtCurrency(Math.abs(alloc.remaining))}</span>
        ) : (
          <span className="text-amber-600">{fmtCurrency(alloc.remaining)} unallocated</span>
        )}
      </div>

      {/* Add phase */}
      <button
        onClick={() =>
          m.createPhase.mutate({
            organization_id: job.organization_id,
            payment_job_id: job.id,
            sequence: nextSequence,
            name: `Phase ${nextSequence + 1}`,
            amount_type: 'percent',
            amount_value: 0,
          })
        }
        disabled={m.createPhase.isPending}
        className="h-6 px-2 text-[11px] rounded-md text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 disabled:opacity-50"
      >
        <Plus className="w-3 h-3" />
        Add phase
      </button>
    </div>
  );
}

function PhaseRow({
  phase,
  job,
  mutations: m,
}: {
  phase: BillingPhase;
  job: PaymentJob;
  mutations: ReturnType<typeof useProjectPaymentMutations>;
}) {
  const resolved = resolvePhaseAmount(phase, job.contract_total);
  const isPaid = phase.status === 'Paid';
  const canSend = phase.status === 'Draft';

  return (
    <div className="flex items-center gap-1.5">
      {/* Name */}
      <input
        defaultValue={phase.name}
        onBlur={(e) => {
          if (e.target.value !== phase.name) m.updatePhase.mutate({ id: phase.id, patch: { name: e.target.value } });
        }}
        className="flex-1 min-w-0 h-6 px-1.5 text-[11px] rounded border border-transparent hover:border-gray-200 bg-transparent"
      />

      {/* Amount type */}
      <select
        value={phase.amount_type}
        onChange={(e) => m.updatePhase.mutate({ id: phase.id, patch: { amount_type: e.target.value as BillingPhase['amount_type'] } })}
        className="h-6 text-[11px] px-1 rounded border border-gray-200 bg-gray-50"
      >
        <option value="percent">%</option>
        <option value="fixed">$</option>
      </select>

      {/* Amount value */}
      <input
        type="number"
        defaultValue={phase.amount_value}
        onBlur={(e) => {
          const v = parseFloat(e.target.value) || 0;
          if (v !== phase.amount_value) m.updatePhase.mutate({ id: phase.id, patch: { amount_value: v } });
        }}
        className="w-16 h-6 px-1.5 text-right text-[11px] rounded border border-gray-200 bg-gray-50"
      />

      {/* Resolved $ */}
      <span className="w-16 text-right text-[11px] text-gray-500 tabular-nums">{fmtCurrency(resolved)}</span>

      {/* Status */}
      <span className={`px-1.5 py-0.5 rounded text-[10px] ${PHASE_STATUS_COLORS[phase.status]}`}>
        {phase.status}
      </span>

      {/* Send invoice to QuickBooks (Draft phases only) */}
      {canSend && (
        <button
          onClick={() => m.sendInvoice.mutate({ phase, job })}
          disabled={m.sendInvoice.isPending}
          title="Send invoice to QuickBooks"
          className="p-0.5 text-gray-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Mark paid */}
      {!isPaid && (
        <button
          onClick={() => m.markPaid.mutate(phase.id)}
          title="Mark paid"
          className="p-0.5 text-gray-300 hover:text-emerald-600 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => m.deletePhase.mutate(phase.id)}
        title="Delete phase"
        className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default ProjectPaymentsSection;
