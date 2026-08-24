/**
 * Receiving Tests
 *
 * The contract: totals and payloads follow the VISIBLE lines, never the
 * accumulated entry map. The first test below is the bug that caused this
 * module to exist — a stale entry inflating the footer after the scope
 * narrowed.
 */

import { describe, it, expect } from 'vitest';
import {
  summarizeReceipt,
  buildReceiptLines,
  type ReceiptEntry,
} from '@/lib/pricing/receiving';

const entry = (received: string, damaged = '', damageNotes = ''): ReceiptEntry => ({
  received,
  damaged,
  damageNotes,
});

describe('summarizeReceipt', () => {
  it('ignores entries whose line is no longer visible', () => {
    // The dialog seeds every outstanding line, then narrows to one
    // manufacturer's once its order lines load. The dropped line must not
    // still be counted.
    const entries = {
      steelcase: entry('380'),
      ology: entry('120'),
      haworth: entry('60'), // stale — seeded before the scope narrowed
    };
    const totals = summarizeReceipt(entries, ['steelcase', 'ology']);
    expect(totals.received).toBe(500);
  });

  it('sums received and damaged separately', () => {
    const totals = summarizeReceipt(
      { a: entry('380', '20'), b: entry('120') },
      ['a', 'b']
    );
    expect(totals).toEqual({ received: 500, damaged: 20, damagedLineCount: 1 });
  });

  it('counts how many lines carry damage, not how many units', () => {
    const totals = summarizeReceipt(
      { a: entry('1', '5'), b: entry('1', '90'), c: entry('4') },
      ['a', 'b', 'c']
    );
    expect(totals.damaged).toBe(95);
    expect(totals.damagedLineCount).toBe(2);
  });

  it('treats blank, whitespace, and junk as zero', () => {
    const totals = summarizeReceipt(
      { a: entry('', ''), b: entry('   '), c: entry('abc', 'NaN') },
      ['a', 'b', 'c']
    );
    expect(totals).toEqual({ received: 0, damaged: 0, damagedLineCount: 0 });
  });

  it('ignores negative input rather than subtracting', () => {
    // A negative correction is a compensating event, recorded elsewhere. A
    // receiving screen must never let one be typed into a delivery.
    const totals = summarizeReceipt({ a: entry('-50', '-10') }, ['a']);
    expect(totals).toEqual({ received: 0, damaged: 0, damagedLineCount: 0 });
  });

  it('is zero when nothing has been entered', () => {
    expect(summarizeReceipt({}, ['a', 'b'])).toEqual({
      received: 0,
      damaged: 0,
      damagedLineCount: 0,
    });
  });
});

describe('buildReceiptLines', () => {
  it('drops lines that record nothing', () => {
    // Everything outstanding is listed; only what arrived gets filled in.
    const payload = buildReceiptLines(
      { a: entry('10'), b: entry(''), c: entry('0', '0') },
      ['a', 'b', 'c']
    );
    expect(payload).toHaveLength(1);
    expect(payload[0]?.order_line_id).toBe('a');
  });

  it('keeps a line that is entirely damaged', () => {
    // Nothing usable arrived, but the delivery and the claim are both real.
    const payload = buildReceiptLines({ a: entry('0', '12', 'Forks through it') }, ['a']);
    expect(payload).toEqual([
      {
        order_line_id: 'a',
        quantity_received: 0,
        quantity_damaged: 12,
        damage_notes: 'Forks through it',
      },
    ]);
  });

  it('drops a damage note when the damage was zeroed out', () => {
    // Typed, then corrected. An orphan note would read as an open claim.
    const payload = buildReceiptLines({ a: entry('10', '0', 'scratched') }, ['a']);
    expect(payload[0]?.damage_notes).toBeNull();
  });

  it('nulls a blank or whitespace-only note', () => {
    const payload = buildReceiptLines({ a: entry('1', '1', '   ') }, ['a']);
    expect(payload[0]?.damage_notes).toBeNull();
  });

  it('excludes entries for lines that are not visible', () => {
    const payload = buildReceiptLines(
      { visible: entry('5'), stale: entry('99') },
      ['visible']
    );
    expect(payload.map(p => p.order_line_id)).toEqual(['visible']);
  });

  it('preserves the order the lines are displayed in', () => {
    const payload = buildReceiptLines(
      { c: entry('1'), a: entry('1'), b: entry('1') },
      ['a', 'b', 'c']
    );
    expect(payload.map(p => p.order_line_id)).toEqual(['a', 'b', 'c']);
  });

  it('allows an overage, because trucks arrive with more than was ordered', () => {
    const payload = buildReceiptLines({ a: entry('420') }, ['a']);
    expect(payload[0]?.quantity_received).toBe(420);
  });
});
