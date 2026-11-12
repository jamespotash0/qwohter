/**
 * Observed Discount Rate Tests
 *
 * These replace the hand-entered discount schedule. Rates are inferred from
 * ACKNOWLEDGED cost, not quoted cost -- inferring from the quote would be
 * circular, reading back the dealer's own configured multiplier. The contracts
 * that matter: never invent a rate, never cry wolf off thin evidence, and never
 * confuse "no discount inferable" with "bought at list".
 */

import { describe, it, expect } from 'vitest';
import {
  lineDiscountPercent,
  findObservedRate,
  detectDiscountAnomaly,
  findDriftingRates,
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

describe('findDriftingRates', () => {
  const drifting = (o: Partial<ObservedRate> = {}) =>
    rate({
      seriesName: 'Series 1',
      discountPercent: 48,      // what factories actually acknowledge
      assumedDiscountPercent: 55, // what the spec tool quotes
      driftPercent: 7,
      minDiscountPercent: 47,
      maxDiscountPercent: 49,
      lineCount: 14,
      ...o,
    });

  it('reports a series whose config has gone stale', () => {
    const [d] = findDriftingRates([drifting()]);
    expect(d?.direction).toBe('optimistic');
    expect(d?.assumedPercent).toBe(55);
    expect(d?.acknowledgedPercent).toBe(48);
    expect(d?.driftPercent).toBe(7);
    expect(d?.lineCount).toBe(14);
  });

  it('stays quiet when assumption and reality agree', () => {
    expect(
      findDriftingRates([
        drifting({ discountPercent: 55, assumedDiscountPercent: 55, driftPercent: 0 }),
      ])
    ).toEqual([]);
  });

  it('ignores drift too small to act on', () => {
    // Freight-inclusive pricing and rounding move rates by fractions.
    expect(
      findDriftingRates([drifting({ driftPercent: 1.2 })])
    ).toEqual([]);
  });

  it('will not claim a systemic pattern from thin evidence', () => {
    expect(findDriftingRates([drifting({ lineCount: 3 })])).toEqual([]);
  });

  it('skips rows with no assumed rate rather than calling them zero drift', () => {
    // Absent evidence is not evidence of agreement.
    expect(
      findDriftingRates([
        drifting({ assumedDiscountPercent: null, driftPercent: null }),
      ])
    ).toEqual([]);
  });

  it('flags conservative drift too, and names it correctly', () => {
    // Quoting a smaller discount than you get is money left on the table.
    const [d] = findDriftingRates([
      drifting({ discountPercent: 60, assumedDiscountPercent: 55, driftPercent: -5 }),
    ]);
    expect(d?.direction).toBe('conservative');
    expect(d?.driftPercent).toBe(-5);
  });

  it('ranks by magnitude, worst first, credits alongside overcharges', () => {
    const found = findDriftingRates([
      drifting({ seriesName: 'A', driftPercent: 3 }),
      drifting({ seriesName: 'B', driftPercent: -11 }),
      drifting({ seriesName: 'C', driftPercent: 6 }),
    ]);
    expect(found.map(d => d.seriesName)).toEqual(['B', 'C', 'A']);
  });

  it('derives drift when the view did not supply it', () => {
    const [d] = findDriftingRates([
      drifting({ driftPercent: undefined, discountPercent: 45, assumedDiscountPercent: 55 }),
    ]);
    expect(d?.driftPercent).toBe(10);
  });

  it('honours a caller-supplied threshold and sample floor', () => {
    const found = findDriftingRates([drifting({ driftPercent: 1.5, lineCount: 2 })], {
      thresholdPercent: 1,
      minLineCount: 1,
    });
    expect(found).toHaveLength(1);
  });
});
