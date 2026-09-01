/**
 * Subscription access
 *
 * The three-way distinction the signup paywall bug came from: allowed,
 * refused, and not-decided-yet.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateSubscription,
  type SubscriptionRow,
} from '@/lib/billing/subscriptionAccess';

const NOW = new Date('2026-09-01T12:00:00Z');
const daysFromNow = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

function row(over: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    stripe_subscription_status: 'Trialing',
    current_period_end: daysFromNow(14),
    trial_end: daysFromNow(14),
    has_payment_method: false,
    grace_period_end: null,
    access_blocked_reason: null,
    ...over,
  };
}

describe('evaluateSubscription — not decided yet', () => {
  it('treats a missing row as provisioning, not as a refusal', () => {
    // This is the signup case: the org exists, create-trial-subscription has
    // not written its row yet.
    const result = evaluateSubscription(null, NOW);
    expect(result.hasAccess).toBe(false);
    expect(result.provisioning).toBe(true);
  });

  it('treats a row whose status has not settled as provisioning', () => {
    const result = evaluateSubscription(
      row({ stripe_subscription_status: null }),
      NOW
    );
    expect(result.hasAccess).toBe(false);
    expect(result.provisioning).toBe(true);
    expect(result.reason).toContain('still being set up');
  });

  it('does not flag a genuinely lapsed subscription as provisioning', () => {
    // The distinction the paywall depends on: this one really should be shown
    // the paywall, immediately, with no setup spinner.
    const result = evaluateSubscription(
      row({ stripe_subscription_status: 'Canceled', trial_end: daysFromNow(-30) }),
      NOW
    );
    expect(result.hasAccess).toBe(false);
    expect(result.provisioning).toBeUndefined();
    expect(result.reason).toBe('Subscription is not active');
  });
});

describe('evaluateSubscription — allowed', () => {
  it('allows a trialing subscription', () => {
    expect(evaluateSubscription(row(), NOW).hasAccess).toBe(true);
  });

  it('allows an active subscription', () => {
    const result = evaluateSubscription(
      row({ stripe_subscription_status: 'Active' }),
      NOW
    );
    expect(result.hasAccess).toBe(true);
  });

  it('reads the status case-insensitively', () => {
    // The edge function capitalises before writing; Stripe sends lower case.
    for (const status of ['trialing', 'Trialing', 'ACTIVE', 'active']) {
      expect(
        evaluateSubscription(row({ stripe_subscription_status: status }), NOW).hasAccess
      ).toBe(true);
    }
  });
});

describe('evaluateSubscription — grace periods', () => {
  it('keeps access during a payment-failure grace period', () => {
    const result = evaluateSubscription(
      row({
        stripe_subscription_status: 'past_due',
        grace_period_end: daysFromNow(4),
        access_blocked_reason: 'Card declined',
      }),
      NOW
    );
    expect(result.hasAccess).toBe(true);
    expect(result.inGracePeriod).toBe(true);
    expect(result.graceDaysRemaining).toBe(4);
    expect(result.reason).toBe('Card declined');
  });

  it('refuses once the payment grace period has passed', () => {
    const result = evaluateSubscription(
      row({
        stripe_subscription_status: 'past_due',
        grace_period_end: daysFromNow(-1),
        trial_end: daysFromNow(-30),
      }),
      NOW
    );
    expect(result.hasAccess).toBe(false);
    expect(result.provisioning).toBeUndefined();
  });

  it('keeps access for three days after a trial expires', () => {
    const result = evaluateSubscription(
      row({ stripe_subscription_status: 'past_due', trial_end: daysFromNow(-2) }),
      NOW
    );
    expect(result.hasAccess).toBe(true);
    expect(result.inGracePeriod).toBe(true);
  });

  it('refuses on the fourth day after a trial expires', () => {
    const result = evaluateSubscription(
      row({ stripe_subscription_status: 'past_due', trial_end: daysFromNow(-4) }),
      NOW
    );
    expect(result.hasAccess).toBe(false);
  });

  it('never reports negative days remaining', () => {
    const result = evaluateSubscription(
      row({ stripe_subscription_status: 'past_due', grace_period_end: daysFromNow(0) }),
      NOW
    );
    expect(result.graceDaysRemaining ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('does not grant a trial grace period to a cancelled subscription', () => {
    // Only incomplete/past_due statuses earn it; a deliberate cancellation
    // should not buy three more days.
    const result = evaluateSubscription(
      row({ stripe_subscription_status: 'Canceled', trial_end: daysFromNow(-1) }),
      NOW
    );
    expect(result.hasAccess).toBe(false);
  });
});
