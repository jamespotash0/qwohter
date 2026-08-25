/**
 * Billing Handoff
 *
 * The last link in the chain: a job that has been sold, ordered, delivered and
 * installed becomes money owed.
 *
 * Creating the billing schedule is **prompted, never automatic**. The project's
 * stage is derived, and deriving a status is safe in a way that creating
 * financial records off one is not — a job that reads "Ready to bill" for a
 * moment because a quantity was corrected must not quietly produce an invoice
 * schedule somebody then has to unpick.
 *
 * Once it exists, which phases are billable is derived, from the same events
 * everything else uses. "Delivered" means product was received, not that a date
 * passed — which is the difference between invoicing on time and invoicing for
 * something that has not happened.
 */

import { useMemo, useState } from 'react';
import { Receipt, CheckCircle, Warning, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/pricing';
import {
  billablePhases,
  unbilledValue,
  phaseValue,
  MILESTONE_LABELS,
  DEFAULT_MILESTONE_SCHEDULE,
  type PhaseLike,
} from '@/lib/billing/milestones';
import { useProjectProgress } from '@/hooks/queries/useProjectHub';
import {
  useProjectPayments,
  useProjectPaymentMutations,
} from '@/hooks/queries/useProjectPayments';
import { cn } from '@/lib/utils';

interface BillingHandoffProps {
  organizationId: string;
  projectId: string;
}

export function BillingHandoff({ organizationId, projectId }: BillingHandoffProps) {
  const { data: progress } = useProjectProgress(projectId);
  const { data: jobs = [], isLoading } = useProjectPayments(projectId);
  const { createJob, createPhase } = useProjectPaymentMutations(projectId);
  const [creating, setCreating] = useState(false);

  const snapshot = useMemo(
    () => ({
      qty_total: Number(progress?.qty_total ?? 0),
      qty_ordered: Number(progress?.qty_ordered ?? 0),
      qty_received: Number(progress?.qty_received ?? 0),
      qty_installed: Number(progress?.qty_installed ?? 0),
    }),
    [progress]
  );

  // Phases arrive nested under their job; a project normally has one contract
  // but change orders can add another, so they are flattened.
  const phases = useMemo(
    () => jobs.flatMap(job => (job.phases ?? []) as unknown as PhaseLike[]),
    [jobs]
  );

  const billable = useMemo(
    () => billablePhases(phases, snapshot),
    [phases, snapshot]
  );
  const sellTotal = Number(progress?.sell_total ?? 0);
  const hasJob = jobs.length > 0;
  // The contract the schedule bills against, which a change order can move.
  const contractTotal = Number(jobs[0]?.contract_total ?? sellTotal);

  const value = useMemo(
    () => unbilledValue(billable, contractTotal),
    [billable, contractTotal]
  );

  const handleCreate = async () => {
    setCreating(true);
    try {
      const job = await createJob.mutateAsync({
        organization_id: organizationId,
        project_id: projectId,
        name: 'Contract',
        contract_total: sellTotal,
      });

      // Milestone-triggered rather than dated: a deposit is earned when the
      // order is placed, not on the 15th.
      for (const [index, tpl] of DEFAULT_MILESTONE_SCHEDULE.entries()) {
        await createPhase.mutateAsync({
          organization_id: organizationId,
          payment_job_id: job.id,
          sequence: index,
          name: tpl.name,
          amount_type: tpl.amount_type,
          amount_value: tpl.amount_value,
          trigger_type: 'milestone',
          trigger_milestone_key: tpl.trigger_milestone_key,
        });
      }
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) {
    return <div className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  }

  // Nothing billed yet — offer the handoff, sized from what was actually sold.
  if (!hasJob) {
    const ready = snapshot.qty_ordered > 0;
    return (
      <div
        className={cn(
          'rounded-xl border p-4',
          ready
            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-dashed border-gray-300 dark:border-gray-700'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Receipt
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
              )}
            />
            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  ready
                    ? 'text-emerald-900 dark:text-emerald-200'
                    : 'text-gray-900 dark:text-gray-100'
                )}
              >
                {ready ? 'This job is ready to bill' : 'No billing schedule yet'}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-sm',
                  ready
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : 'text-gray-500'
                )}
              >
                {ready
                  ? `A deposit is earned once product is on order. Contract value ${formatCurrency(sellTotal)}.`
                  : 'A schedule can be created once something has been ordered.'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!ready || creating || sellTotal <= 0}
            size="sm"
          >
            {creating ? 'Creating…' : 'Create billing schedule'}
            {!creating && <ArrowRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </div>

        {ready && (
          <ul className="mt-3 space-y-1 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-3">
            {DEFAULT_MILESTONE_SCHEDULE.map(tpl => (
              <li
                key={tpl.name}
                className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300"
              >
                <span>
                  {tpl.name}{' '}
                  <span className="text-emerald-700/70 dark:text-emerald-400/70">
                    — on {MILESTONE_LABELS[tpl.trigger_milestone_key].toLowerCase()}
                  </span>
                </span>
                <span className="tabular-nums font-medium">
                  {tpl.amount_value}% ·{' '}
                  {formatCurrency((sellTotal * tpl.amount_value) / 100)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // A schedule exists — say what can be invoiced now, and why.
  return (
    <div className="space-y-3">
      {billable.length === 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Nothing billable yet. Phases release as the job reaches each
            milestone — product on order, delivered, installed.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
              {billable.length} phase{billable.length === 1 ? '' : 's'} ready to
              invoice
            </p>
            <p className="tabular-nums text-lg font-semibold text-emerald-900 dark:text-emerald-200">
              {formatCurrency(value.total)}
            </p>
          </div>
          <ul className="mt-2 space-y-1 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2">
            {billable.map(({ phase, reason }) => (
              <li
                key={phase.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-emerald-800 dark:text-emerald-300"
              >
                <span>
                  {phase.name}
                  <span className="ml-2 text-xs text-emerald-700/70 dark:text-emerald-400/70">
                    {reason}
                  </span>
                </span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(phaseValue(phase, contractTotal))}
                </span>
              </li>
            ))}
          </ul>
          {value.unpriced > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Warning className="h-3.5 w-3.5" />
              {value.unpriced} phase{value.unpriced === 1 ? '' : 's'} carry no
              amount yet — an unpriced phase is not a free one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default BillingHandoff;
