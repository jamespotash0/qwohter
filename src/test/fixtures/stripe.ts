/**
 * Stripe Test Fixtures
 *
 * Factory functions for creating test subscription and plan data.
 * Follows the same pattern as proposals.ts fixtures.
 */

import { generateTestPrefix } from '../config/testEnv';

// ============================================================================
// TYPES (mirrors stripeService.ts interfaces)
// ============================================================================

export interface MockSubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  price_per_month: number;
  price_per_yearly: number;
  max_users: number | null;
  min_users: number | null;
  features: any;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MockSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  number_of_active_users: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  has_payment_method: boolean;
  is_active: boolean;
  has_used_trial: boolean;
  access_blocked: boolean;
  access_blocked_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan?: MockSubscriptionPlan;
}

// ============================================================================
// BASE FACTORIES
// ============================================================================

/**
 * Create a mock subscription plan with default values
 */
export function createMockPlan(overrides?: Partial<MockSubscriptionPlan>): MockSubscriptionPlan {
  const prefix = generateTestPrefix();
  const now = new Date().toISOString();

  return {
    id: `${prefix}_plan`,
    name: 'professional',
    display_name: 'Professional',
    description: 'Full-featured plan for teams',
    stripe_product_id: 'prod_test_123',
    stripe_price_id_monthly: 'price_test_monthly_123',
    stripe_price_id_yearly: 'price_test_yearly_123',
    price_per_month: 20,
    price_per_yearly: 192,
    max_users: null,
    min_users: 1,
    features: { proposals: true, forms: true, projects: true },
    is_active: true,
    sort_order: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Create a mock subscription with default values
 */
export function createMockSubscription(overrides?: Partial<MockSubscription>): MockSubscription {
  const prefix = generateTestPrefix();
  const now = new Date().toISOString();
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `${prefix}_sub`,
    organization_id: `${prefix}_org`,
    plan_id: `${prefix}_plan`,
    number_of_active_users: 1,
    stripe_customer_id: `cus_${prefix}`,
    stripe_subscription_id: `sub_${prefix}`,
    stripe_subscription_status: 'Active',
    current_period_end: futureDate,
    trial_start: null,
    trial_end: null,
    has_payment_method: true,
    is_active: true,
    has_used_trial: false,
    access_blocked: false,
    access_blocked_reason: null,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============================================================================
// STATUS-SPECIFIC FACTORIES
// ============================================================================

/**
 * Create an active paid subscription
 */
export function createActiveSubscription(overrides?: Partial<MockSubscription>): MockSubscription {
  return createMockSubscription({
    stripe_subscription_status: 'Active',
    is_active: true,
    has_payment_method: true,
    ...overrides,
  });
}

/**
 * Create a trialing subscription
 * @param trialEnd - When trial ends. Defaults to 14 days from now.
 */
export function createTrialingSubscription(
  trialEnd?: Date,
  overrides?: Partial<MockSubscription>
): MockSubscription {
  const trialStart = new Date();
  const trialEndDate = trialEnd || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  return createMockSubscription({
    stripe_subscription_status: 'Trialing',
    is_active: true,
    has_payment_method: false,
    trial_start: trialStart.toISOString(),
    trial_end: trialEndDate.toISOString(),
    current_period_end: trialEndDate.toISOString(),
    ...overrides,
  });
}

/**
 * Create a subscription with expired trial
 * @param daysAgoExpired - How many days ago the trial expired
 */
export function createExpiredTrialSubscription(
  daysAgoExpired: number,
  overrides?: Partial<MockSubscription>
): MockSubscription {
  const trialEnd = new Date(Date.now() - daysAgoExpired * 24 * 60 * 60 * 1000);
  const trialStart = new Date(trialEnd.getTime() - 14 * 24 * 60 * 60 * 1000);

  return createMockSubscription({
    stripe_subscription_status: 'Incomplete_expired',
    is_active: true, // is_active stays true during grace period
    has_payment_method: false,
    trial_start: trialStart.toISOString(),
    trial_end: trialEnd.toISOString(),
    current_period_end: trialEnd.toISOString(),
    ...overrides,
  });
}

/**
 * Create a subscription in the grace period
 * @param daysRemaining - Days remaining in grace period (1-3)
 */
export function createGracePeriodSubscription(
  daysRemaining: number,
  overrides?: Partial<MockSubscription>
): MockSubscription {
  // Grace period = 3 days after trial end
  // If daysRemaining = 2, trial ended 1 day ago (3 - 2 = 1)
  const daysAgoExpired = 3 - daysRemaining;
  return createExpiredTrialSubscription(daysAgoExpired, {
    stripe_subscription_status: 'Incomplete',
    ...overrides,
  });
}

/**
 * Create a manually blocked subscription
 */
export function createBlockedSubscription(
  reason: string,
  overrides?: Partial<MockSubscription>
): MockSubscription {
  return createMockSubscription({
    access_blocked: true,
    access_blocked_reason: reason,
    is_active: true,
    stripe_subscription_status: 'Active',
    ...overrides,
  });
}

/**
 * Create a canceled subscription
 */
export function createCanceledSubscription(overrides?: Partial<MockSubscription>): MockSubscription {
  return createMockSubscription({
    stripe_subscription_status: 'Canceled',
    is_active: false,
    ...overrides,
  });
}
