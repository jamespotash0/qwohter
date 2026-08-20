/**
 * Fulfillment Routing Tests
 *
 * Decides whether a line can appear on a purchase order. Getting this wrong
 * either raises a PO for the dealer's own crew or silently drops product that
 * needed buying, so the null case matters as much as the resolved ones.
 */

import { describe, it, expect } from 'vitest';
import {
  inferFulfillmentType,
  resolveFulfillmentType,
  isPurchasable,
  isWorkOrderLine,
  FULFILLMENT_TYPES,
  FULFILLMENT_TYPE_LABELS,
} from '@/lib/pricing';

describe('inferFulfillmentType', () => {
  it('maps the built-in section categories', () => {
    expect(inferFulfillmentType('merchandise')).toBe('purchase');
    expect(inferFulfillmentType('delivery_install')).toBe('self_perform');
    expect(inferFulfillmentType('freight')).toBe('purchase');
    expect(inferFulfillmentType('tariffs')).toBe('pass_through');
  });

  it('refuses to guess for "other" and for user-added sections', () => {
    // The old builder stamped every user-added section 'other' with no way to
    // change it, so a guess here would be wrong at scale.
    expect(inferFulfillmentType('other')).toBeNull();
    expect(inferFulfillmentType('something_custom')).toBeNull();
    expect(inferFulfillmentType(undefined)).toBeNull();
  });
});

describe('resolveFulfillmentType', () => {
  it('prefers the line override above everything', () => {
    expect(
      resolveFulfillmentType(
        { fulfillmentType: 'subcontract' },
        { fulfillmentType: 'self_perform', type: 'delivery_install' }
      )
    ).toBe('subcontract');
  });

  it('falls back to the section setting', () => {
    expect(
      resolveFulfillmentType({}, { fulfillmentType: 'self_perform', type: 'other' })
    ).toBe('self_perform');
  });

  it('falls back to the legacy category when the section was never set', () => {
    expect(resolveFulfillmentType({}, { type: 'merchandise' })).toBe('purchase');
  });

  it('returns null when nothing decided, rather than guessing', () => {
    expect(resolveFulfillmentType({}, { type: 'other' })).toBeNull();
    expect(resolveFulfillmentType({})).toBeNull();
  });

  it('lets one line be subcontracted out of a self-performed section', () => {
    const section = { fulfillmentType: 'self_perform' as const, type: 'delivery_install' };
    expect(resolveFulfillmentType({}, section)).toBe('self_perform');
    expect(resolveFulfillmentType({ fulfillmentType: 'subcontract' }, section)).toBe('subcontract');
  });
});

describe('isPurchasable', () => {
  it('is true only for things the dealer buys', () => {
    expect(isPurchasable('purchase')).toBe(true);
    expect(isPurchasable('subcontract')).toBe(true);
  });

  it('is false for own labor and re-billed costs', () => {
    expect(isPurchasable('self_perform')).toBe(false);
    expect(isPurchasable('pass_through')).toBe(false);
  });

  it('is false when unrouted, so an undecided line is never silently ordered', () => {
    expect(isPurchasable(null)).toBe(false);
  });
});

describe('isWorkOrderLine', () => {
  it('is true only for self-performed work', () => {
    expect(isWorkOrderLine('self_perform')).toBe(true);
    expect(isWorkOrderLine('subcontract')).toBe(false);
    expect(isWorkOrderLine('purchase')).toBe(false);
    expect(isWorkOrderLine(null)).toBe(false);
  });
});

describe('a line is never both bought and crewed', () => {
  it('holds for every fulfillment type', () => {
    for (const type of FULFILLMENT_TYPES) {
      expect(isPurchasable(type) && isWorkOrderLine(type)).toBe(false);
    }
  });

  it('every type has a label for the section editor', () => {
    for (const type of FULFILLMENT_TYPES) {
      expect(FULFILLMENT_TYPE_LABELS[type].label).toBeTruthy();
      expect(FULFILLMENT_TYPE_LABELS[type].description).toBeTruthy();
    }
  });
});
