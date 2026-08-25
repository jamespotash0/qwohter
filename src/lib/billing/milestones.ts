/**
 * Billing milestones
 *
 * Which billing phases a job has actually earned the right to invoice.
 *
 * A billing schedule is normally a list of dates somebody typed, and it goes
 * wrong in both directions: a dealer invoices a deposit against product that
 * never shipped, or finishes an install in March and gets round to the final
 * invoice in May. Both cost real money, and neither is visible on a calendar.
 *
 * These milestones are read from the same event log everything else derives
 * from, so "delivered" means product was received, not that a date passed.
 *
 * Pure. The reconciliation this feeds already lives in paymentsService; this
 * only answers whether a phase's trigger has been met.
 */

/** What a billing phase can wait on. Ordered by when it happens on a job. */
export const BILLING_MILESTONES = [
  'order_placed',
  'delivered',
  'installed',
  'complete',
] as const;

export type BillingMilestone = (typeof BILLING_MILESTONES)[number];

export const MILESTONE_LABELS: Record<BillingMilestone, string> = {
  order_placed: 'Order placed with the manufacturer',
  delivered: 'Product delivered',
  installed: 'Installation started',
  complete: 'Job complete',
};

/**
 * The quantities a milestone check needs, as `project_progress` reports them.
 * Structural rather than the view's row type so this stays testable.
 */
export interface ProgressSnapshot {
  qty_total: number;
  qty_ordered: number;
  qty_received: number;
  qty_installed: number;
}

/**
 * Whether a milestone has been reached.
 *
 * `complete` requires everything installed. The others require *something* —
 * a first delivery earns a delivery payment, and waiting for the last carton
 * is how a dealer finances a manufacturer's back-order out of their own
 * working capital.
 */
export function isMilestoneReached(
  milestone: BillingMilestone,
  progress: ProgressSnapshot
): boolean {
  switch (milestone) {
    case 'order_placed':
      return progress.qty_ordered > 0;
    case 'delivered':
      return progress.qty_received > 0;
    case 'installed':
      return progress.qty_installed > 0;
    case 'complete':
      return progress.qty_total > 0 && progress.qty_installed >= progress.qty_total;
    default:
      return false;
  }
}

/** The subset of a billing phase this needs. */
export interface PhaseLike {
  id: string;
  name: string;
  sequence: number;
  status: string;
  trigger_type: string;
  trigger_milestone_key: string | null;
  due_date: string | null;
  amount_type: 'percent' | 'fixed';
  amount_value: number;
  /**
   * The dollar figure SNAPSHOTTED when the phase was invoiced. Null before
   * that, which is not the same as unpriced — a percent phase is priced by its
   * percentage and the contract total, and only becomes fixed once billed.
   */
  resolved_amount: number | null;
}

export interface BillablePhase {
  phase: PhaseLike;
  /** Why it is billable, in words a person can act on. */
  reason: string;
}

/** Statuses meaning the money has already been asked for or received. */
const ALREADY_BILLED = new Set(['Invoiced', 'Sent', 'Paid', 'Void']);

/**
 * Phases that can be invoiced now, in schedule order.
 *
 * A phase qualifies when its trigger has been met and it has not already been
 * billed:
 *
 *   milestone  the job reached it
 *   date       the due date has arrived
 *   manual     always — somebody decides
 *
 * An unrecognised milestone key never qualifies. Guessing would invoice a
 * customer for something that may not have happened, which is the one mistake
 * in this whole system a customer notices.
 */
export function billablePhases(
  phases: PhaseLike[],
  progress: ProgressSnapshot,
  today: string = new Date().toISOString().slice(0, 10)
): BillablePhase[] {
  const out: BillablePhase[] = [];

  for (const phase of phases) {
    if (ALREADY_BILLED.has(phase.status)) continue;

    if (phase.trigger_type === 'milestone') {
      const key = phase.trigger_milestone_key as BillingMilestone | null;
      if (!key || !BILLING_MILESTONES.includes(key)) continue;
      if (!isMilestoneReached(key, progress)) continue;
      out.push({ phase, reason: MILESTONE_LABELS[key] });
      continue;
    }

    if (phase.trigger_type === 'date') {
      if (!phase.due_date || phase.due_date > today) continue;
      out.push({ phase, reason: `Due ${phase.due_date}` });
      continue;
    }

    if (phase.trigger_type === 'manual') {
      out.push({ phase, reason: 'Ready whenever you are' });
    }
  }

  return out.sort((a, b) => a.phase.sequence - b.phase.sequence);
}

/**
 * What one phase is worth right now.
 *
 * An invoiced phase keeps the figure it was billed at — the contract total can
 * move afterwards through a change order, and an issued invoice must not
 * silently restate itself. Everything else resolves from its percentage.
 */
export function phaseValue(phase: PhaseLike, contractTotal: number): number {
  if (phase.resolved_amount !== null && phase.resolved_amount !== undefined) {
    return Math.round(Number(phase.resolved_amount) * 100) / 100;
  }
  if (phase.amount_type === 'percent') {
    return Math.round(((contractTotal * phase.amount_value) / 100) * 100) / 100;
  }
  return Math.round(phase.amount_value * 100) / 100;
}

/**
 * Money sitting on the table: billable, not yet invoiced.
 *
 * `unpriced` counts phases that genuinely have no amount — a fixed phase set to
 * zero, or a percent phase on a contract with no value. Those are reported
 * separately rather than folded into the total, because an unpriced phase is
 * not a free one.
 */
export function unbilledValue(
  billable: BillablePhase[],
  contractTotal: number
): { total: number; unpriced: number } {
  let total = 0;
  let unpriced = 0;
  for (const { phase } of billable) {
    const value = phaseValue(phase, contractTotal);
    if (value <= 0) {
      unpriced += 1;
      continue;
    }
    total += value;
  }
  return { total: Math.round(total * 100) / 100, unpriced };
}

/**
 * A billing schedule for a furniture job, as most dealers actually run one.
 *
 * Milestone-triggered rather than date-triggered on purpose: a deposit is
 * earned when the order is placed, not on the 15th.
 */
export const DEFAULT_MILESTONE_SCHEDULE: {
  name: string;
  amount_type: 'percent' | 'fixed';
  amount_value: number;
  trigger_milestone_key: BillingMilestone;
}[] = [
  {
    name: 'Deposit on order',
    amount_type: 'percent',
    amount_value: 50,
    trigger_milestone_key: 'order_placed',
  },
  {
    name: 'On delivery',
    amount_type: 'percent',
    amount_value: 40,
    trigger_milestone_key: 'delivered',
  },
  {
    name: 'Final on completion',
    amount_type: 'percent',
    amount_value: 10,
    trigger_milestone_key: 'complete',
  },
];
