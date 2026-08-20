/**
 * Variance Summary Tests
 *
 * summarizeVariance produces the headline a PM reads first — "12 awaiting
 * acknowledgment, 4 with variances totalling $8,400". Getting the arithmetic or
 * the exclusions wrong here misreports money.
 */

import { describe, it, expect } from 'vitest';
import { summarizeVariance, sortVarianceQueue, type VarianceLine } from '@/lib/pricing';

const row = (o: Partial<VarianceLine> = {}): VarianceLine =>
  ({
    po_line_id: 'p1',
    organization_id: 'org',
    vendor_po_id: 'po1',
    po_number: 'PO-1001',
    vendor_id: 'v1',
    sales_order_id: 'so1',
    order_line_id: 'ol1',
    description: 'Task chair',
    model_number: null,
    ordered_quantity: 10,
    ordered_unit_cost: 100,
    acked_quantity: 10,
    acked_unit_cost: 100,
    cost_variance: 0,
    requested_ship_date: '2026-10-01',
    acked_ship_date: '2026-10-01',
    ship_date_slip_days: 0,
    variance_status: 'match',
    ...o,
  }) as VarianceLine;

describe('summarizeVariance', () => {
  it('counts lines still awaiting an acknowledgment separately from variances', () => {
    const s = summarizeVariance([
      row({ variance_status: 'awaiting_ack', cost_variance: null }),
      row({ variance_status: 'awaiting_ack', cost_variance: null }),
      row({ variance_status: 'price', cost_variance: 270 }),
    ]);
    expect(s.awaitingAck).toBe(2);
    expect(s.withVariance).toBe(1);
  });

  it('excludes matched lines from every figure', () => {
    const s = summarizeVariance([row(), row(), row()]);
    expect(s).toMatchObject({ awaitingAck: 0, withVariance: 0, totalExposure: 0, worstSlipDays: 0 });
  });

  it('sums exposure across variance lines', () => {
    const s = summarizeVariance([
      row({ variance_status: 'price', cost_variance: 270 }),
      row({ variance_status: 'price_and_date', cost_variance: 1430.5, ship_date_slip_days: 21 }),
      row(),
    ]);
    expect(s.totalExposure).toBe(1700.5);
    expect(s.withVariance).toBe(2);
  });

  it('nets a credit against an overcharge rather than counting its magnitude', () => {
    // A vendor honouring a lower price is real money back; exposure is the net.
    const s = summarizeVariance([
      row({ variance_status: 'price', cost_variance: 500 }),
      row({ variance_status: 'price', cost_variance: -200 }),
    ]);
    expect(s.totalExposure).toBe(300);
    expect(s.withVariance).toBe(2);
  });

  it('reports the worst schedule slip, not the sum', () => {
    const s = summarizeVariance([
      row({ variance_status: 'date', cost_variance: 0, ship_date_slip_days: 7 }),
      row({ variance_status: 'date', cost_variance: 0, ship_date_slip_days: 35 }),
      row({ variance_status: 'date', cost_variance: 0, ship_date_slip_days: 14 }),
    ]);
    expect(s.worstSlipDays).toBe(35);
  });

  it('ignores an early ship date when reporting the worst slip', () => {
    const s = summarizeVariance([
      row({ variance_status: 'date', cost_variance: 0, ship_date_slip_days: -10 }),
    ]);
    expect(s.worstSlipDays).toBe(0);
  });

  it('handles an empty queue', () => {
    expect(summarizeVariance([])).toEqual({
      awaitingAck: 0,
      withVariance: 0,
      totalExposure: 0,
      worstSlipDays: 0,
    });
  });

  it('does not let float error leak into the money figure', () => {
    const s = summarizeVariance([
      row({ variance_status: 'price', cost_variance: 0.1 }),
      row({ variance_status: 'price', cost_variance: 0.2 }),
    ]);
    expect(s.totalExposure).toBe(0.3);
  });
});

describe('sortVarianceQueue', () => {
  it('puts lines awaiting an acknowledgment first', () => {
    const sorted = sortVarianceQueue([
      row({ variance_status: 'price', cost_variance: 9999 }),
      row({ variance_status: 'awaiting_ack', cost_variance: null }),
    ]);
    expect(sorted[0]!.variance_status).toBe('awaiting_ack');
  });

  it('then orders by exposure, largest first', () => {
    const sorted = sortVarianceQueue([
      row({ variance_status: 'price', cost_variance: 100 }),
      row({ variance_status: 'price', cost_variance: 900 }),
      row({ variance_status: 'price', cost_variance: 400 }),
    ]);
    expect(sorted.map(r => r.cost_variance)).toEqual([900, 400, 100]);
  });

  it('ranks a large credit as prominently as a large overcharge', () => {
    // Both are money moving unexpectedly; both deserve a look.
    const sorted = sortVarianceQueue([
      row({ variance_status: 'price', cost_variance: 50 }),
      row({ variance_status: 'price', cost_variance: -800 }),
    ]);
    expect(sorted[0]!.cost_variance).toBe(-800);
  });

  it('does not mutate its input', () => {
    const input = [
      row({ variance_status: 'price', cost_variance: 1 }),
      row({ variance_status: 'price', cost_variance: 2 }),
    ];
    sortVarianceQueue(input);
    expect(input[0]!.cost_variance).toBe(1);
  });
});
