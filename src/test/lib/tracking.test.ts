/**
 * Tracking Tests
 *
 * The contract this module has to hold: a carrier's word is never allowed to
 * close a line by itself, a status nobody has checked in a day is not presented
 * as current, and the one thing that actually needs a human — freight that
 * landed and was never counted — outranks everything quieter.
 */

import { describe, it, expect } from 'vitest';
import {
  describeTracking,
  describeLastChecked,
  summarizeShipment,
  buildShipmentLines,
  canSaveShipment,
  carrierName,
  isManualCarrierCode,
  type TrackableShipment,
} from '@/lib/tracking';

const NOW = new Date('2026-08-24T12:00:00Z');
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3600_000).toISOString();

const shipment = (over: Partial<TrackableShipment> = {}): TrackableShipment => ({
  tracking_status: 'in_transit',
  tracking_provider: 'aftership',
  tracking_active: true,
  last_checked_at: hoursAgo(1),
  ...over,
});

describe('describeTracking — attention', () => {
  it('flags freight that landed with nobody counting it', () => {
    // The reason tracking exists rather than just watching: a claim window
    // starts at the delivery scan, not at the receipt.
    const summary = describeTracking(
      shipment({ tracking_status: 'delivered', delivered_at: hoursAgo(6) }),
      { hasReceipt: false, now: NOW }
    );
    expect(summary.attention).toBe('uncounted');
  });

  it('says nothing about a delivered shipment that has been counted', () => {
    const summary = describeTracking(
      shipment({ tracking_status: 'delivered' }),
      { hasReceipt: true, now: NOW }
    );
    expect(summary.attention).toBeNull();
  });

  it('ranks a carrier exception above an uncounted delivery', () => {
    const summary = describeTracking(
      shipment({ tracking_status: 'exception' }),
      { hasReceipt: false, now: NOW }
    );
    expect(summary.attention).toBe('exception');
  });

  it('treats a failed delivery attempt as an exception, not as progress', () => {
    const summary = describeTracking(
      shipment({ tracking_status: 'attempt_failed' }),
      { hasReceipt: false, now: NOW }
    );
    expect(summary.attention).toBe('exception');
  });

  it('flags a shipment past its ETA that has not been delivered', () => {
    const summary = describeTracking(
      shipment({ estimated_delivery_date: '2026-08-20' }),
      { now: NOW }
    );
    expect(summary.attention).toBe('late');
  });

  it('does not call a shipment late on the ETA day itself', () => {
    // The carrier has until the end of the day it promised.
    const summary = describeTracking(
      shipment({ estimated_delivery_date: '2026-08-24' }),
      { now: NOW }
    );
    expect(summary.attention).toBeNull();
  });

  it('does not call a delivered shipment late', () => {
    const summary = describeTracking(
      shipment({ tracking_status: 'delivered', estimated_delivery_date: '2026-08-20' }),
      { hasReceipt: true, now: NOW }
    );
    expect(summary.attention).toBeNull();
  });

  it('reports a failed lookup rather than presenting it as quiet', () => {
    const summary = describeTracking(
      shipment({ tracking_error: 'Carrier returned 404' }),
      { now: NOW }
    );
    expect(summary.attention).toBe('unreachable');
  });
});

describe('describeTracking — a carrier with nobody to ask', () => {
  const ownTruck = (over: Partial<TrackableShipment> = {}) =>
    shipment({ tracking_provider: 'manual', last_checked_at: null, ...over });

  it('raises "landed, not counted" on an own truck once delivery is recorded', () => {
    // The point of allowing a hand-set delivery at all. Before it existed, the
    // deliveries a dealer controls most directly were the only ones that could
    // never raise this.
    const summary = describeTracking(
      ownTruck({ tracking_status: 'delivered', delivered_at: hoursAgo(3) }),
      { hasReceipt: false, now: NOW }
    );
    expect(summary.attention).toBe('uncounted');
  });

  it('stops calling an own truck late once it has been marked delivered', () => {
    // It used to go late the day after its ETA and stay there forever, because
    // nothing could move a manual shipment out of that state.
    const overdue = { estimated_delivery_date: '2026-08-20' };

    expect(describeTracking(ownTruck(overdue), { hasReceipt: false, now: NOW }).attention)
      .toBe('late');

    expect(
      describeTracking(
        ownTruck({ ...overdue, tracking_status: 'delivered', delivered_at: hoursAgo(2) }),
        { hasReceipt: true, now: NOW }
      ).attention
    ).toBeNull();
  });

  it('goes quiet again when a mis-clicked delivery is undone', () => {
    const summary = describeTracking(
      ownTruck({ tracking_status: 'pending', delivered_at: null }),
      { hasReceipt: false, now: NOW }
    );
    expect(summary.attention).toBeNull();
    // Not "awaiting first scan" — no scan is coming for an own truck.
    expect(summary.label).toBe('Awaiting delivery');
  });
});

describe('describeTracking — staleness', () => {
  it('marks a status nobody has checked in over a day as stale', () => {
    expect(describeTracking(shipment({ last_checked_at: hoursAgo(30) }), { now: NOW }).isStale)
      .toBe(true);
  });

  it('does not mark a recently checked status stale', () => {
    expect(describeTracking(shipment({ last_checked_at: hoursAgo(2) }), { now: NOW }).isStale)
      .toBe(false);
  });

  it('never calls a manual carrier stale — there is nobody to ask', () => {
    const summary = describeTracking(
      shipment({ tracking_provider: 'manual', last_checked_at: null }),
      { now: NOW }
    );
    expect(summary.isStale).toBe(false);
  });

  it('does not chase a number that has gone cold', () => {
    const summary = describeTracking(
      shipment({ tracking_status: 'expired', last_checked_at: hoursAgo(200) }),
      { now: NOW }
    );
    expect(summary.isStale).toBe(false);
  });
});

describe('describeTracking — presentation', () => {
  it('falls back to unknown for a status it does not recognize', () => {
    const summary = describeTracking(shipment({ tracking_status: 'teleported' }), { now: NOW });
    expect(summary.status).toBe('unknown');
    expect(summary.label).toBe('Unknown');
  });

  it("keeps the carrier's own wording", () => {
    const summary = describeTracking(
      shipment({ tracking_status_detail: 'Delayed due to weather in Memphis' }),
      { now: NOW }
    );
    expect(summary.detail).toBe('Delayed due to weather in Memphis');
  });
});

describe('describeLastChecked', () => {
  it('says so plainly when nothing has ever been checked', () => {
    expect(describeLastChecked(null, NOW)).toBe('never checked');
  });

  it('reads in minutes, hours, then days', () => {
    expect(describeLastChecked(hoursAgo(0.5), NOW)).toBe('checked 30 minutes ago');
    expect(describeLastChecked(hoursAgo(5), NOW)).toBe('checked 5 hours ago');
    expect(describeLastChecked(hoursAgo(72), NOW)).toBe('checked 3 days ago');
  });
});

describe('summarizeShipment', () => {
  it('ignores entries whose line is no longer visible', () => {
    // Same failure the receiving dialog had: the scope narrows as the
    // manufacturer's lines load, while the entry map only grows.
    const totals = summarizeShipment(
      { a: { shipped: '10' }, b: { shipped: '5' }, stale: { shipped: '99' } },
      ['a', 'b']
    );
    expect(totals.shipped).toBe(15);
    expect(totals.lineCount).toBe(2);
  });

  it('treats blanks and junk as nothing shipped', () => {
    const totals = summarizeShipment({ a: { shipped: '' }, b: { shipped: 'ten' } }, ['a', 'b']);
    expect(totals).toEqual({ shipped: 0, lineCount: 0 });
  });
});

describe('buildShipmentLines', () => {
  it('drops lines with nothing on them rather than sending zeroes', () => {
    const payload = buildShipmentLines(
      { a: { shipped: '4' }, b: { shipped: '0' }, c: { shipped: '' } },
      ['a', 'b', 'c']
    );
    expect(payload).toEqual([{ order_line_id: 'a', quantity_shipped: 4 }]);
  });
});

describe('canSaveShipment', () => {
  const base = { carrierCode: 'estes-express', trackingNumber: '', proNumber: '', isManual: false };

  it('refuses a tracked carrier with no number to watch', () => {
    expect(canSaveShipment(base)).toBe(false);
  });

  it('accepts a PRO number alone — that is what freight lines answer to', () => {
    expect(canSaveShipment({ ...base, proNumber: '0123456789' })).toBe(true);
  });

  it('accepts a parcel tracking number alone', () => {
    expect(canSaveShipment({ ...base, carrierCode: 'fedex', trackingNumber: '7712' })).toBe(true);
  });

  it('accepts an own truck with no number at all', () => {
    // There is nothing to give, and demanding a number is how "N/A" ends up in
    // a tracking field.
    expect(canSaveShipment({ ...base, carrierCode: 'own-truck', isManual: true })).toBe(true);
  });

  it('refuses a shipment with no carrier', () => {
    expect(canSaveShipment({ ...base, carrierCode: null, proNumber: '0123456789' })).toBe(false);
  });
});

describe('carriers', () => {
  it('knows which carriers have nobody to ask', () => {
    expect(isManualCarrierCode('own-truck')).toBe(true);
    expect(isManualCarrierCode('delivery-agent')).toBe(true);
    expect(isManualCarrierCode('estes-express')).toBe(false);
    expect(isManualCarrierCode(null)).toBe(false);
  });

  it('prefers the recorded name over a bare code it does not know', () => {
    expect(carrierName('old-dominion-freight')).toBe('Old Dominion (ODFL)');
    expect(carrierName('some-regional-line', 'Some Regional Line')).toBe('Some Regional Line');
  });
});
