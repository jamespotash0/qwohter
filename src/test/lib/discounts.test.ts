/**
 * Discount Resolution Tests
 *
 * Quoting and purchasing both price through resolveDiscount, so specificity
 * ordering and the null-vs-zero distinction are contractual, not incidental.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDiscount,
  resolveDiscountPercent,
  isAgreementEffective,
  type DiscountAgreement,
} from '@/lib/pricing';

const SERIES_A = '11111111-1111-1111-1111-111111111111';
const SERIES_B = '22222222-2222-2222-2222-222222222222';

const agreement = (o: Partial<DiscountAgreement> = {}): DiscountAgreement => ({
  discount_percent: 50,
  ...o,
});

describe('isAgreementEffective', () => {
  it('accepts an agreement with no date bounds', () => {
    expect(isAgreementEffective(agreement(), '2026-08-19')).toBe(true);
  });

  it('rejects an agreement that has not started', () => {
    expect(
      isAgreementEffective(agreement({ effective_from: '2026-09-01' }), '2026-08-19')
    ).toBe(false);
  });

  it('rejects an expired agreement', () => {
    expect(
      isAgreementEffective(agreement({ effective_to: '2026-07-31' }), '2026-08-19')
    ).toBe(false);
  });

  it('is inclusive of both bounds', () => {
    const a = agreement({ effective_from: '2026-08-19', effective_to: '2026-08-19' });
    expect(isAgreementEffective(a, '2026-08-19')).toBe(true);
  });

  it('treats an open end date as unbounded', () => {
    expect(
      isAgreementEffective(agreement({ effective_from: '2020-01-01' }), '2099-01-01')
    ).toBe(true);
  });
});

describe('resolveDiscount specificity', () => {
  const agreements: DiscountAgreement[] = [
    agreement({ discount_percent: 40 }), // blanket
    agreement({ discount_percent: 45, contract_vehicle: 'Omnia' }), // contract
    agreement({ discount_percent: 50, series_id: SERIES_A }), // series
    agreement({ discount_percent: 55, series_id: SERIES_A, contract_vehicle: 'Omnia' }),
  ];

  it('prefers series + contract over everything', () => {
    const r = resolveDiscount(agreements, { seriesId: SERIES_A, contractVehicle: 'Omnia' });
    expect(r?.discountPercent).toBe(55);
    expect(r?.matchedOn).toBe('series+contract');
  });

  it('falls to series when the contract does not match', () => {
    const r = resolveDiscount(agreements, { seriesId: SERIES_A, contractVehicle: 'GSA' });
    expect(r?.discountPercent).toBe(50);
    expect(r?.matchedOn).toBe('series');
  });

  it('falls to contract when the series does not match', () => {
    const r = resolveDiscount(agreements, { seriesId: SERIES_B, contractVehicle: 'Omnia' });
    expect(r?.discountPercent).toBe(45);
    expect(r?.matchedOn).toBe('contract');
  });

  it('falls to the blanket agreement when nothing else matches', () => {
    const r = resolveDiscount(agreements, { seriesId: SERIES_B, contractVehicle: 'GSA' });
    expect(r?.discountPercent).toBe(40);
    expect(r?.matchedOn).toBe('blanket');
  });

  it('uses the blanket agreement when the query has no series or contract', () => {
    expect(resolveDiscount(agreements, {})?.discountPercent).toBe(40);
  });

  it('matches contract vehicles case-insensitively', () => {
    const r = resolveDiscount(agreements, { seriesId: SERIES_B, contractVehicle: 'omnia' });
    expect(r?.discountPercent).toBe(45);
  });
});

describe('resolveDiscount tie-breaking', () => {
  it('favours the dealer when two agreements are equally specific', () => {
    const r = resolveDiscount([
      agreement({ discount_percent: 50, series_id: SERIES_A }),
      agreement({ discount_percent: 58, series_id: SERIES_A }),
    ], { seriesId: SERIES_A });
    expect(r?.discountPercent).toBe(58);
  });

  it('still prefers a more specific but smaller discount', () => {
    // Specificity wins over size: a series agreement is the one the dealer
    // actually signed for that series, even if a blanket rate looks better.
    const r = resolveDiscount([
      agreement({ discount_percent: 60 }),
      agreement({ discount_percent: 50, series_id: SERIES_A }),
    ], { seriesId: SERIES_A });
    expect(r?.discountPercent).toBe(50);
    expect(r?.matchedOn).toBe('series');
  });
});

describe('resolveDiscount effectivity', () => {
  it('ignores expired agreements even when more specific', () => {
    const r = resolveDiscount([
      agreement({ discount_percent: 40 }),
      agreement({ discount_percent: 55, series_id: SERIES_A, effective_to: '2026-01-01' }),
    ], { seriesId: SERIES_A, asOf: '2026-08-19' });
    expect(r?.discountPercent).toBe(40);
  });

  it('picks up an agreement once it takes effect', () => {
    const agreements = [
      agreement({ discount_percent: 40 }),
      agreement({ discount_percent: 55, effective_from: '2026-09-01' }),
    ];
    expect(resolveDiscount(agreements, { asOf: '2026-08-31' })?.discountPercent).toBe(40);
    expect(resolveDiscount(agreements, { asOf: '2026-09-01' })?.discountPercent).toBe(55);
  });
});

describe('resolveDiscount absence', () => {
  it('returns null when there are no agreements at all', () => {
    expect(resolveDiscount([], { seriesId: SERIES_A })).toBeNull();
  });

  it('returns null when no agreement covers the query', () => {
    // Only a series-scoped agreement exists, for a different series.
    expect(
      resolveDiscount([agreement({ series_id: SERIES_A })], { seriesId: SERIES_B })
    ).toBeNull();
  });

  it('distinguishes no agreement from a genuine zero discount', () => {
    expect(resolveDiscount([], {})).toBeNull();
    expect(resolveDiscount([agreement({ discount_percent: 0 })], {})).toMatchObject({
      discountPercent: 0,
      matchedOn: 'blanket',
    });
  });

  it('returns every match with its originating agreement attached', () => {
    const a = agreement({ discount_percent: 55, series_id: SERIES_A, notes: 'FY26 rider' } as DiscountAgreement);
    expect(resolveDiscount([a], { seriesId: SERIES_A })?.agreement).toBe(a);
  });
});

describe('resolveDiscountPercent', () => {
  it('unwraps the percentage', () => {
    expect(resolveDiscountPercent([agreement({ discount_percent: 47.5 })], {})).toBe(47.5);
  });

  it('uses the default fallback of zero when nothing matches', () => {
    expect(resolveDiscountPercent([], {})).toBe(0);
  });

  it('honours an explicit fallback', () => {
    expect(resolveDiscountPercent([], {}, 35)).toBe(35);
  });
});
