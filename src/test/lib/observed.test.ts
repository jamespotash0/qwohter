/**
 * Observed Discount Rate Tests
 *
 * These replace the hand-entered discount schedule. The rate is now inferred
 * from list price and cost on lines already imported, so the contract that
 * matters is: never invent a rate, never cry wolf off thin evidence, and never
 * confuse "no discount inferable" with "bought at list".
 */

import { describe, it, expect } from 'vitest';
import {
  lineDiscountPercent,
  findObservedRate,
  detectDiscountAnomaly,
  type ObservedRate,
} from '@/lib/pricing';

const rate = (o: Partial<ObservedRate> = {}): ObservedRate => ({
  manufacturerName: 'Steelcase',
  seriesName: null,
  contractVehicle: null,
  discountPercent: 55,
  minDiscountPercent: 54,
  maxDiscountPercent: 56,
  lineCount: 40,
  lastSeenAt: '2026-06-01T00:00:00Z',
  ...o,
});

describe('lineDiscountPercent', () => {
  it('derives the rate from list and cost', () => {
    expect(lineDiscountPercent(1000, 450)).toBe(55);
  });

  it('returns null without a list price, rather than zero', () => {
    // Labor, freight, and pass-through lines carry no list price. Reporting 0%
    // would claim they were bought at list, which is a different statement.
    expect(lineDiscountPercent(null, 400)).toBeNull();
    expect(lineDiscountPercent(0, 400)).toBeNull();
    expect(lineDiscountPercent(undefined, 400)).toBeNull();
  });

  it('returns null when the cost is unknown', () => {
    expect(lineDiscountPercent(1000, null)).toBeNull();
  });

  it('reports a genuine zero discount as zero', () => {
    expect(lineDiscountPercent(1000, 1000)).toBe(0);
  });

  it('handles a cost above list as a negative discount', () => {
    // Real, and worth seeing rather than clamping away: it usually means the
    // list price on the line is wrong.
    expect(lineDiscountPercent(1000, 1100)).toBe(-10);
  });

  it('rounds to two places', () => {
    expect(lineDiscountPercent(3, 1)).toBe(66.67);
  });
});

describe('findObservedRate', () => {
  it('requires the manufacturer to match', () => {
    // An observation about Steelcase says nothing about Haworth. Unlike a
    // hand-entered agreement there is no "any manufacturer" tier.
    const found = findObservedRate([rate()], { manufacturerName: 'Haworth' });
    expect(found).toBeNull();
  });

  it('returns null when nothing has been bought from them before', () => {
    expect(findObservedRate([], { manufacturerName: 'Steelcase' })).toBeNull();
  });

  it('returns null when the query names no manufacturer', () => {
    expect(findObservedRate([rate()], {})).toBeNull();
  });

  it('prefers series + contract over series alone', () => {
    const rates = [
      rate({ seriesName: 'Series 1', discountPercent: 55 }),
      rate({ seriesName: 'Series 1', contractVehicle: 'GSA', discountPercent: 62 }),
    ];
    const found = findObservedRate(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      contractVehicle: 'GSA',
    });
    expect(found?.discountPercent).toBe(62);
  });

  it('prefers series over contract', () => {
    const rates = [
      rate({ contractVehicle: 'GSA', discountPercent: 60 }),
      rate({ seriesName: 'Series 1', discountPercent: 55 }),
    ];
    const found = findObservedRate(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      contractVehicle: 'GSA',
    });
    expect(found?.discountPercent).toBe(55);
  });

  it('falls back to the manufacturer-wide rate', () => {
    const found = findObservedRate([rate({ discountPercent: 50 })], {
      manufacturerName: 'Steelcase',
      seriesName: 'Never Seen',
    });
    expect(found?.discountPercent).toBe(50);
  });

  it('does not apply a series rate to a different series', () => {
    const found = findObservedRate([rate({ seriesName: 'Series 1' })], {
      manufacturerName: 'Steelcase',
      seriesName: 'Answer',
    });
    expect(found).toBeNull();
  });

  it('matches text case- and whitespace-insensitively', () => {
    // Specification exports deliver these with inconsistent casing and stray
    // whitespace.
    const found = findObservedRate([rate({ seriesName: 'Series 1' })], {
      manufacturerName: '  steelcase ',
      seriesName: 'SERIES 1',
    });
    expect(found?.discountPercent).toBe(55);
  });

  it('breaks a tie on the larger sample', () => {
    const rates = [
      rate({ discountPercent: 50, lineCount: 3 }),
      rate({ discountPercent: 55, lineCount: 90 }),
    ];
    const found = findObservedRate(rates, { manufacturerName: 'Steelcase' });
    expect(found?.discountPercent).toBe(55);
  });
});

describe('detectDiscountAnomaly', () => {
  const rates = [rate({ seriesName: 'Series 1' })]; // 54–56%, 40 lines

  it('says nothing when the line sits inside the observed envelope', () => {
    const found = detectDiscountAnomaly(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      listPrice: 1000,
      unitCost: 450, // 55%
    });
    expect(found).toBeNull();
  });

  it('flags a line bought at a worse rate than ever seen', () => {
    const found = detectDiscountAnomaly(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      listPrice: 1000,
      unitCost: 520, // 48%
    });
    expect(found?.direction).toBe('worse');
    expect(found?.actualPercent).toBe(48);
    expect(found?.expectedPercent).toBe(55);
    expect(found?.deviationPercent).toBe(6); // 54 − 48
    expect(found?.lineCount).toBe(40);
  });

  it('flags an unusually good rate too', () => {
    // Usually a mis-keyed list price rather than a gift, and worth a look
    // before it becomes a quote.
    const found = detectDiscountAnomaly(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      listPrice: 1000,
      unitCost: 300, // 70%
    });
    expect(found?.direction).toBe('better');
    expect(found?.deviationPercent).toBe(14); // 70 − 56
  });

  it('tolerates small drift outside the envelope', () => {
    // Rounding and freight-inclusive pricing move rates by fractions
    // constantly; flagging those would train the warning away.
    const found = detectDiscountAnomaly(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      listPrice: 1000,
      unitCost: 465, // 53.5%, inside 54 − 1
    });
    expect(found).toBeNull();
  });

  it('stays quiet when the evidence is too thin', () => {
    // One previous order is a coincidence, not a pattern.
    const thin = [rate({ seriesName: 'Series 1', lineCount: 2 })];
    const found = detectDiscountAnomaly(thin, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      listPrice: 1000,
      unitCost: 900,
    });
    expect(found).toBeNull();
  });

  it('stays quiet when no discount can be inferred at all', () => {
    const found = detectDiscountAnomaly(rates, {
      manufacturerName: 'Steelcase',
      seriesName: 'Series 1',
      listPrice: null,
      unitCost: 4000, // install labor
    });
    expect(found).toBeNull();
  });

  it('stays quiet for a manufacturer never bought from before', () => {
    const found = detectDiscountAnomaly(rates, {
      manufacturerName: 'Brand New Co',
      listPrice: 1000,
      unitCost: 100,
    });
    expect(found).toBeNull();
  });

  it('honours a caller-supplied tolerance and sample floor', () => {
    const found = detectDiscountAnomaly(
      [rate({ seriesName: 'Series 1', lineCount: 2 })],
      {
        manufacturerName: 'Steelcase',
        seriesName: 'Series 1',
        listPrice: 1000,
        unitCost: 480, // 52%
      },
      { tolerancePercent: 0.5, minLineCount: 1 }
    );
    expect(found?.direction).toBe('worse');
  });
});
