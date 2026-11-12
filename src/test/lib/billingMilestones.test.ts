/**
 * Billing milestone tests
 *
 * What this must never do, in order of how much it costs:
 *
 *   1. Invoice for something that has not happened. That is the one mistake
 *      in this system a *customer* notices.
 *   2. Bill the same phase twice.
 *   3. Hold a delivery payment until the last carton arrives — that finances
 *      a manufacturer's back-order out of the dealer's working capital.
 */

import { describe, it, expect } from 'vitest';
import {
  isMilestoneReached,
  billablePhases,
  unbilledValue,
  phaseValue,
  DEFAULT_MILESTONE_SCHEDULE,
  type PhaseLike,
  type ProgressSnapshot,
} from '@/lib/billing/milestones';

const progress = (over: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  qty_total: 100,
  qty_ordered: 0,
  qty_received: 0,
  qty_installed: 0,
  ...over,
});

const phase = (over: Partial<PhaseLike> = {}): PhaseLike => ({
  id: 'p1',
  name: 'Deposit',
  sequence: 0,
  status: 'Draft',
  trigger_type: 'milestone',
  trigger_milestone_key: 'order_placed',
  due_date: null,
  amount_type: 'percent',
  amount_value: 10,
  resolved_amount: 1000,
  ...over,
});

describe('isMilestoneReached', () => {
  it('earns the deposit once anything is ordered', () => {
    expect(isMilestoneReached('order_placed', progress({ qty_ordered: 1 }))).toBe(true);
    expect(isMilestoneReached('order_placed', progress())).toBe(false);
  });

  it('earns the delivery payment on the FIRST delivery', () => {
    // Waiting for the last carton finances the manufacturer's back-order out
    // of the dealer's own cash.
    expect(isMilestoneReached('delivered', progress({ qty_received: 1 }))).toBe(true);
  });

  it('requires everything installed before the job is complete', () => {
    expect(isMilestoneReached('complete', progress({ qty_installed: 99 }))).toBe(false);
    expect(isMilestoneReached('complete', progress({ qty_installed: 100 }))).toBe(true);
  });

  it('is not complete when there is nothing on the job', () => {
    // An empty order must not read as finished.
    expect(isMilestoneReached('complete', progress({ qty_total: 0 }))).toBe(false);
  });
});

describe('billablePhases', () => {
  it('holds a phase whose milestone has not happened', () => {
    const out = billablePhases([phase({ trigger_milestone_key: 'delivered' })], progress());
    expect(out).toHaveLength(0);
  });

  it('releases a phase once its milestone lands', () => {
    const out = billablePhases(
      [phase({ trigger_milestone_key: 'delivered' })],
      progress({ qty_received: 10 })
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.reason).toMatch(/delivered/i);
  });

  it('never bills the same phase twice', () => {
    for (const status of ['Invoiced', 'Sent', 'Paid', 'Void']) {
      const out = billablePhases([phase({ status })], progress({ qty_ordered: 1 }));
      expect(out).toHaveLength(0);
    }
  });

  it('still offers an overdue phase, because it is still owed', () => {
    const out = billablePhases([phase({ status: 'Overdue' })], progress({ qty_ordered: 1 }));
    expect(out).toHaveLength(1);
  });

  it('refuses an unrecognised milestone key rather than guessing', () => {
    // Guessing invoices a customer for something that may not have happened.
    const out = billablePhases(
      [phase({ trigger_milestone_key: 'shipped_maybe' })],
      progress({ qty_ordered: 1, qty_received: 1, qty_installed: 1 })
    );
    expect(out).toHaveLength(0);
  });

  it('refuses a milestone phase with no key at all', () => {
    const out = billablePhases(
      [phase({ trigger_milestone_key: null })],
      progress({ qty_ordered: 1 })
    );
    expect(out).toHaveLength(0);
  });

  it('releases a date phase only once the date has arrived', () => {
    const p = phase({ trigger_type: 'date', due_date: '2026-09-01' });
    expect(billablePhases([p], progress(), '2026-08-31')).toHaveLength(0);
    expect(billablePhases([p], progress(), '2026-09-01')).toHaveLength(1);
  });

  it('always offers a manual phase', () => {
    const out = billablePhases(
      [phase({ trigger_type: 'manual', trigger_milestone_key: null })],
      progress()
    );
    expect(out[0]!.reason).toMatch(/whenever/i);
  });

  it('returns them in schedule order, not the order given', () => {
    const out = billablePhases(
      [
        phase({ id: 'c', sequence: 2, trigger_type: 'manual' }),
        phase({ id: 'a', sequence: 0, trigger_type: 'manual' }),
        phase({ id: 'b', sequence: 1, trigger_type: 'manual' }),
      ],
      progress()
    );
    expect(out.map(b => b.phase.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('phaseValue', () => {
  it('resolves a percent phase against the contract total', () => {
    const v = phaseValue(
      phase({ amount_type: 'percent', amount_value: 50, resolved_amount: null }),
      525800
    );
    expect(v).toBe(262900);
  });

  it('takes a fixed phase at face value', () => {
    const v = phaseValue(
      phase({ amount_type: 'fixed', amount_value: 7500, resolved_amount: null }),
      525800
    );
    expect(v).toBe(7500);
  });

  it('keeps the figure an invoiced phase was billed at', () => {
    // The contract can move afterwards through a change order; an issued
    // invoice must not silently restate itself.
    const v = phaseValue(
      phase({ amount_type: 'percent', amount_value: 50, resolved_amount: 100000 }),
      525800
    );
    expect(v).toBe(100000);
  });
});

describe('unbilledValue', () => {
  it('totals what can be invoiced now, resolving percentages', () => {
    const out = unbilledValue(
      [
        { phase: phase({ amount_type: 'percent', amount_value: 50, resolved_amount: null }), reason: '' },
        { phase: phase({ amount_type: 'percent', amount_value: 40, resolved_amount: null }), reason: '' },
      ],
      525800
    );
    expect(out.total).toBe(473220);
    expect(out.unpriced).toBe(0);
  });

  it('counts a genuinely valueless phase separately rather than as zero', () => {
    // An unpriced phase is not a free one.
    const out = unbilledValue(
      [
        { phase: phase({ amount_type: 'fixed', amount_value: 0, resolved_amount: null }), reason: '' },
        { phase: phase({ amount_type: 'fixed', amount_value: 400, resolved_amount: null }), reason: '' },
      ],
      525800
    );
    expect(out.total).toBe(400);
    expect(out.unpriced).toBe(1);
  });
});

describe('DEFAULT_MILESTONE_SCHEDULE', () => {
  it('adds up to the whole contract', () => {
    const total = DEFAULT_MILESTONE_SCHEDULE.reduce((s, p) => s + p.amount_value, 0);
    expect(total).toBe(100);
  });

  it('is triggered by milestones, not dates', () => {
    // A deposit is earned when the order is placed, not on the 15th.
    expect(DEFAULT_MILESTONE_SCHEDULE.every(p => !!p.trigger_milestone_key)).toBe(true);
  });

  it('releases nothing before the order is placed', () => {
    const phases = DEFAULT_MILESTONE_SCHEDULE.map((p, i) =>
      phase({
        id: String(i),
        sequence: i,
        trigger_milestone_key: p.trigger_milestone_key,
      })
    );
    expect(billablePhases(phases, progress())).toHaveLength(0);
  });

  it('releases the deposit and nothing else once ordered', () => {
    const phases = DEFAULT_MILESTONE_SCHEDULE.map((p, i) =>
      phase({
        id: String(i),
        sequence: i,
        trigger_milestone_key: p.trigger_milestone_key,
      })
    );
    const out = billablePhases(phases, progress({ qty_ordered: 100 }));
    expect(out).toHaveLength(1);
    expect(out[0]!.phase.sequence).toBe(0);
  });

  it('releases everything once the job is fully installed', () => {
    const phases = DEFAULT_MILESTONE_SCHEDULE.map((p, i) =>
      phase({
        id: String(i),
        sequence: i,
        trigger_milestone_key: p.trigger_milestone_key,
      })
    );
    const out = billablePhases(
      phases,
      progress({ qty_ordered: 100, qty_received: 100, qty_installed: 100 })
    );
    expect(out).toHaveLength(3);
  });
});
