/**
 * Job model
 *
 * The header's reading of `project_progress`: what is wrong, what the money is
 * doing, and which stages carry a badge.
 */

import { describe, it, expect } from 'vitest';
import {
  jobAttention,
  jobMoney,
  stageCounts,
  STAGE_ACTION_KEYS,
  type ProgressLike,
} from '@/components/features/projects/job/jobModel';
import {
  JOB_STAGES,
  asJobStage,
  isJobStage,
  stageIndex,
  stagePosition,
} from '@/components/common/backoffice/stages';

describe('stages', () => {
  it('orders the rail the way a job actually moves', () => {
    expect(stageIndex('Quoted')).toBeLessThan(stageIndex('Ordering'));
    expect(stageIndex('Ordering')).toBeLessThan(stageIndex('Receiving'));
    expect(stageIndex('Receiving')).toBeLessThan(stageIndex('Ready to bill'));
  });

  it('treats an unrecognised stage as Quoted rather than throwing', () => {
    // The view is the authority on stage names; a value this file has not been
    // taught about must still render a page.
    expect(asJobStage('Renegotiating')).toBe('Quoted');
    expect(asJobStage(null)).toBe('Quoted');
    expect(asJobStage(undefined)).toBe('Quoted');
    expect(isJobStage('Renegotiating')).toBe(false);
  });

  it('places every stage relative to where the job is', () => {
    expect(stagePosition('Quoted', 'Receiving')).toBe('done');
    expect(stagePosition('Receiving', 'Receiving')).toBe('current');
    expect(stagePosition('Installing', 'Receiving')).toBe('upcoming');
  });

  it('gives every stage a primary action', () => {
    // A stage with no action is a dead end on the rail.
    for (const stage of JOB_STAGES) {
      expect(STAGE_ACTION_KEYS[stage]).toBeTruthy();
    }
  });
});

describe('jobAttention', () => {
  it('says nothing when nothing is wrong', () => {
    expect(jobAttention(null)).toEqual([]);
    expect(jobAttention({})).toEqual([]);
    expect(
      jobAttention({ qty_damaged: 0, lines_awaiting_ack: 0, open_change_orders: 0 })
    ).toEqual([]);
  });

  it('ranks money already lost above money about to be', () => {
    const items = jobAttention({
      open_change_orders: 2,
      lines_awaiting_ack: 5,
      qty_damaged: 3,
    });
    expect(items[0]).toContain('damaged');
    expect(items[1]).toContain('not acknowledged');
    expect(items[2]).toContain('change order');
  });

  it('pluralises', () => {
    expect(jobAttention({ qty_damaged: 1 })[0]).toBe('1 unit damaged and still owed');
    expect(jobAttention({ qty_damaged: 2 })[0]).toBe('2 units damaged and still owed');
    expect(jobAttention({ open_change_orders: 1 })[0]).toBe(
      '1 change order awaiting an answer'
    );
    expect(jobAttention({ open_change_orders: 2 })[0]).toBe(
      '2 change orders awaiting an answer'
    );
  });

  it('reads numbers that arrive as strings', () => {
    // Postgres numerics come back as strings through PostgREST.
    expect(jobAttention({ qty_damaged: '4' } as ProgressLike)).toEqual([
      '4 units damaged and still owed',
    ]);
  });
});

describe('jobMoney', () => {
  it('derives quoted margin from sell and cost', () => {
    const money = jobMoney({ sell_total: 100_000, quoted_cost_total: 65_000 });
    expect(money.quotedMargin).toBe(35_000);
  });

  it('reports an unacknowledged job as null rather than as unchanged', () => {
    // Nothing acknowledged is not the same as acknowledged at exactly the quote,
    // and showing 0 there would claim a confirmation nobody gave.
    const money = jobMoney({
      sell_total: 100_000,
      quoted_cost_total: 65_000,
      acknowledged_cost_variance: null,
    });
    expect(money.realMargin).toBeNull();
    expect(money.marginDelta).toBeNull();
  });

  it('takes acknowledged cost variance off the margin', () => {
    const money = jobMoney({
      sell_total: 100_000,
      quoted_cost_total: 65_000,
      acknowledged_cost_variance: 4_000,
    });
    expect(money.realMargin).toBe(31_000);
    expect(money.marginDelta).toBe(-4_000);
  });

  it('handles a variance in the dealer’s favour', () => {
    const money = jobMoney({
      sell_total: 100_000,
      quoted_cost_total: 65_000,
      acknowledged_cost_variance: -1_500,
    });
    expect(money.realMargin).toBe(36_500);
    expect(money.marginDelta).toBe(1_500);
  });

  it('distinguishes a zero variance from no variance', () => {
    const confirmed = jobMoney({
      sell_total: 10,
      quoted_cost_total: 4,
      acknowledged_cost_variance: 0,
    });
    expect(confirmed.realMargin).toBe(6);
    expect(confirmed.marginDelta).toBe(0);
  });

  it('treats a missing row as zeroes rather than NaN', () => {
    const money = jobMoney(null);
    expect(money.sell).toBe(0);
    expect(money.quotedMargin).toBe(0);
    expect(money.realMargin).toBeNull();
  });
});

describe('stageCounts', () => {
  it('badges only the stages a person can act on', () => {
    const counts = stageCounts({ lines_awaiting_ack: 7, qty_damaged: 2 });
    expect(counts.Ordering).toBe(7);
    expect(counts.Receiving).toBe(2);
    expect(counts.Quoted).toBeUndefined();
    expect(counts['Ready to bill']).toBeUndefined();
  });

  it('returns zeroes, which the rail declines to draw', () => {
    // A zero badge is noise that teaches people to stop reading badges, so the
    // rail drops it — this only has to avoid inventing one.
    expect(stageCounts({}).Ordering).toBe(0);
    expect(stageCounts(null)).toEqual({});
  });
});
