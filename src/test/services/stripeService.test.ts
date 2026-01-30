/**
 * Stripe Service Unit Tests
 *
 * Tests all business logic in stripeService.ts with mocked Supabase.
 * No real Stripe or Supabase calls are made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSubscription,
  createMockPlan,
  createActiveSubscription,
  createTrialingSubscription,
  createExpiredTrialSubscription,
  createGracePeriodSubscription,
  createBlockedSubscription,
  createCanceledSubscription,
} from '../fixtures/stripe';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the Supabase client before importing the service
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}));

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_SUPABASE_URL: 'http://localhost:54321',
  },
});

// Import after mocking
import {
  getPlans,
  getPlanByName,
  getSubscription,
  createSubscription,
  updateSubscription,
  hasValidSubscription,
  blockAccess,
  restoreAccess,
  calculateSubscriptionQuantity,
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  syncSeatCount,
  getDaysRemaining,
} from '@/services/stripeService';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build a chainable Supabase query mock.
 *
 * The real Supabase query builder is PromiseLike — you can both chain methods
 * (.eq().eq().order()) AND await the result directly. This mock replicates that
 * by making the chain object thenable.
 */
function buildQueryChain(result: { data?: any; error?: any; count?: number | null }) {
  const chain: any = {};

  // Make the chain itself thenable (PromiseLike) so `await chain.eq(...).eq(...)` works
  chain.then = (onFulfilled: any, onRejected?: any) => {
    return Promise.resolve(result).then(onFulfilled, onRejected);
  };

  // All chainable methods return the chain itself
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);

  // Terminal methods return a Promise with the result
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);

  return chain;
}

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ============================================================================
// getDaysRemaining() - Pure function, no mocks needed
// ============================================================================

describe('getDaysRemaining', () => {
  it('should return positive days for future date', () => {
    const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const result = getDaysRemaining(futureDate);
    expect(result).toBe(10);
  });

  it('should return 0 for past date', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const result = getDaysRemaining(pastDate);
    expect(result).toBe(0);
  });

  it('should return 0 for date that is now', () => {
    // Slightly in the past to avoid flakiness
    const now = new Date(Date.now() - 1000).toISOString();
    const result = getDaysRemaining(now);
    expect(result).toBe(0);
  });

  it('should return null for null input', () => {
    const result = getDaysRemaining(null);
    expect(result).toBeNull();
  });

  it('should return 1 for date less than 24 hours in the future', () => {
    // Math.ceil means 0.5 days rounds to 1
    const futureDate = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const result = getDaysRemaining(futureDate);
    expect(result).toBe(1);
  });

  it('should handle far future dates', () => {
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const result = getDaysRemaining(futureDate);
    expect(result).toBe(365);
  });
});

// ============================================================================
// getPlans()
// ============================================================================

describe('getPlans', () => {
  it('should fetch active plans ordered by sort_order', async () => {
    const plans = [createMockPlan({ sort_order: 1 }), createMockPlan({ sort_order: 2, name: 'enterprise' })];
    const chain = buildQueryChain({ data: plans, error: null });
    mockFrom.mockReturnValue(chain);

    // Override order to resolve with data directly (not single/maybeSingle)
    chain.order.mockResolvedValue({ data: plans, error: null });

    const result = await getPlans();

    expect(mockFrom).toHaveBeenCalledWith('subscription_plans');
    expect(result.data).toEqual(plans);
    expect(result.error).toBeNull();
  });

  it('should return null data on error', async () => {
    const chain = buildQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    chain.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const result = await getPlans();

    expect(result.data).toBeNull();
    expect(result.error).toBe('DB error');
  });
});

// ============================================================================
// getPlanByName()
// ============================================================================

describe('getPlanByName', () => {
  it('should fetch specific active plan by name', async () => {
    const plan = createMockPlan({ name: 'professional' });
    const chain = buildQueryChain({ data: plan, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getPlanByName('professional');

    expect(mockFrom).toHaveBeenCalledWith('subscription_plans');
    expect(result.data).toEqual(plan);
    expect(result.error).toBeNull();
  });

  it('should return null data when plan not found', async () => {
    const chain = buildQueryChain({ data: null, error: { message: 'not found' } });
    mockFrom.mockReturnValue(chain);

    const result = await getPlanByName('nonexistent');

    expect(result.data).toBeNull();
    expect(result.error).toBe('not found');
  });
});

// ============================================================================
// getSubscription()
// ============================================================================

describe('getSubscription', () => {
  it('should fetch subscription with joined plan data', async () => {
    const sub = createActiveSubscription({ plan: createMockPlan() });
    const chain = buildQueryChain({ data: sub, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getSubscription('org_123');

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(result.data).toEqual(sub);
    expect(result.error).toBeNull();
  });

  it('should return null data when no subscription exists', async () => {
    const chain = buildQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await getSubscription('org_no_sub');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('should return error on query failure', async () => {
    const chain = buildQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    chain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Connection refused' } });

    const result = await getSubscription('org_123');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Connection refused');
  });
});

// ============================================================================
// createSubscription()
// ============================================================================

describe('createSubscription', () => {
  it('should insert subscription with correct fields', async () => {
    const sub = createMockSubscription();
    const chain = buildQueryChain({ data: sub, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createSubscription({
      organizationId: 'org_123',
      planId: 'plan_456',
      stripeCustomerId: 'cus_789',
    });

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_123',
        plan_id: 'plan_456',
        stripe_customer_id: 'cus_789',
        is_active: true,
        access_blocked: false,
      })
    );
    expect(result.data).toEqual(sub);
    expect(result.error).toBeNull();
  });

  it('should set stripe_customer_id to null when not provided', async () => {
    const sub = createMockSubscription();
    const chain = buildQueryChain({ data: sub, error: null });
    mockFrom.mockReturnValue(chain);

    await createSubscription({
      organizationId: 'org_123',
      planId: 'plan_456',
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_customer_id: null,
      })
    );
  });

  it('should return error on insert failure', async () => {
    const chain = buildQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    chain.single.mockResolvedValue({ data: null, error: { message: 'Duplicate key' } });

    const result = await createSubscription({
      organizationId: 'org_123',
      planId: 'plan_456',
    });

    expect(result.data).toBeNull();
    expect(result.error).toBe('Duplicate key');
  });
});

// ============================================================================
// updateSubscription()
// ============================================================================

describe('updateSubscription', () => {
  it('should update subscription with provided fields', async () => {
    const sub = createMockSubscription({ stripe_subscription_status: 'Active' });
    const chain = buildQueryChain({ data: sub, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updateSubscription('sub_123', {
      stripe_subscription_status: 'Active',
      is_active: true,
    });

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_subscription_status: 'Active',
        is_active: true,
        updated_at: expect.any(String),
      })
    );
    expect(result.data).toEqual(sub);
    expect(result.error).toBeNull();
  });

  it('should auto-set updated_at timestamp', async () => {
    const sub = createMockSubscription();
    const chain = buildQueryChain({ data: sub, error: null });
    mockFrom.mockReturnValue(chain);

    await updateSubscription('sub_123', { is_active: false });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T/),
      })
    );
  });

  it('should return error on update failure', async () => {
    const chain = buildQueryChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await updateSubscription('sub_nonexistent', { is_active: false });

    expect(result.data).toBeNull();
    expect(result.error).toBe('Not found');
  });
});

// ============================================================================
// hasValidSubscription() - Complex branching logic
// ============================================================================

describe('hasValidSubscription', () => {
  /**
   * Helper: mock getSubscription to return a specific subscription.
   * Since hasValidSubscription calls getSubscription internally,
   * we mock the `from` chain it uses.
   */
  function mockGetSubscriptionReturn(sub: any, error?: any) {
    const chain = buildQueryChain({
      data: sub,
      error: error ? { message: error } : null,
    });
    mockFrom.mockReturnValue(chain);
  }

  describe('no subscription', () => {
    it('should return isValid:false when no subscription found', async () => {
      mockGetSubscriptionReturn(null);

      const result = await hasValidSubscription('org_no_sub');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No subscription found');
    });

    it('should return isValid:false when getSubscription errors', async () => {
      const chain = buildQueryChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);
      chain.maybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      const result = await hasValidSubscription('org_error');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No subscription found');
    });
  });

  describe('access blocked', () => {
    it('should return isValid:false when access_blocked is true', async () => {
      const sub = createBlockedSubscription('Payment dispute');
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Payment dispute');
      expect(result.inGracePeriod).toBe(false);
    });

    it('should return default reason when access_blocked_reason is null', async () => {
      const sub = createMockSubscription({
        access_blocked: true,
        access_blocked_reason: null,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Access blocked');
    });

    it('should return isValid:false even if status is active but blocked', async () => {
      const sub = createBlockedSubscription('Manual block');
      sub.stripe_subscription_status = 'Active';
      sub.is_active = true;
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
    });
  });

  describe('is_active flag', () => {
    it('should return isValid:false when is_active is false', async () => {
      const sub = createCanceledSubscription();
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Subscription is not active');
    });
  });

  describe('valid statuses', () => {
    it('should return isValid:true for status "Active"', async () => {
      const sub = createActiveSubscription();
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.inGracePeriod).toBe(false);
    });

    it('should return isValid:true for status "Trialing" with future trial end', async () => {
      const futureTrialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const sub = createTrialingSubscription(futureTrialEnd);
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
    });

    it('should handle case-insensitive status comparison', async () => {
      // DB stores "Active" but comparison is lowercase
      const sub = createMockSubscription({
        stripe_subscription_status: 'active',
        is_active: true,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid statuses without grace period', () => {
    it('should return isValid:false for "Canceled" status', async () => {
      // Canceled but is_active still true (edge case before trigger fires)
      const sub = createMockSubscription({
        stripe_subscription_status: 'Canceled',
        is_active: true,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Canceled');
    });

    it('should return isValid:false when no status is set', async () => {
      const sub = createMockSubscription({
        stripe_subscription_status: null,
        is_active: true,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No subscription status set');
    });
  });

  describe('grace period for post-trial statuses', () => {
    it('should grant access for "incomplete" status within 3-day grace', async () => {
      // Trial ended 1 day ago = 2 grace days remaining
      const sub = createGracePeriodSubscription(2, {
        stripe_subscription_status: 'Incomplete',
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.inGracePeriod).toBe(true);
      expect(result.graceDaysRemaining).toBeGreaterThan(0);
    });

    it('should grant access for "incomplete_expired" within 3-day grace', async () => {
      const sub = createGracePeriodSubscription(1, {
        stripe_subscription_status: 'Incomplete_expired',
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.inGracePeriod).toBe(true);
    });

    it('should grant access for "past_due" within 3-day grace', async () => {
      const sub = createGracePeriodSubscription(1, {
        stripe_subscription_status: 'Past_due',
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.inGracePeriod).toBe(true);
    });

    it('should deny access when grace period has expired (4+ days)', async () => {
      const sub = createExpiredTrialSubscription(5, {
        stripe_subscription_status: 'Incomplete_expired',
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('grace period have expired');
    });

    it('should return graceDaysRemaining correctly', async () => {
      // Trial ended ~0.5 days ago, so ~2.5 days of grace remain -> ceil = 3
      const trialEnd = new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000);
      const sub = createMockSubscription({
        stripe_subscription_status: 'Incomplete',
        is_active: true,
        trial_end: trialEnd.toISOString(),
        trial_start: new Date(trialEnd.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.graceDaysRemaining).toBeGreaterThanOrEqual(2);
      expect(result.graceDaysRemaining).toBeLessThanOrEqual(3);
    });

    it('should NOT grant grace if no trial_end date exists', async () => {
      const sub = createMockSubscription({
        stripe_subscription_status: 'Incomplete',
        is_active: true,
        trial_end: null,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.inGracePeriod).toBe(false);
    });
  });

  describe('trialing with expired trial', () => {
    it('should allow access during trial with future trial end', async () => {
      const futureEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const sub = createTrialingSubscription(futureEnd);
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.inGracePeriod).toBe(false);
    });

    it('should grant grace period when trial expired without payment method', async () => {
      // Trial ended 1 day ago, still trialing status in Stripe
      const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const sub = createTrialingSubscription(pastEnd, {
        has_payment_method: false,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(true);
      expect(result.inGracePeriod).toBe(true);
    });

    it('should deny access when trial + grace both expired', async () => {
      // Trial ended 5 days ago, well past 3-day grace
      const pastEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const sub = createTrialingSubscription(pastEnd, {
        has_payment_method: false,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('grace period have expired');
    });

    it('should allow access when trial expired but has payment method', async () => {
      // Trial expired but user added payment method, so Stripe will charge
      const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const sub = createTrialingSubscription(pastEnd, {
        has_payment_method: true,
      });
      mockGetSubscriptionReturn(sub);

      const result = await hasValidSubscription(sub.organization_id);

      // With payment method, expired trial doesn't trigger grace path
      expect(result.isValid).toBe(true);
    });
  });
});

// ============================================================================
// blockAccess() / restoreAccess()
// ============================================================================

describe('blockAccess', () => {
  it('should set access_blocked:true with reason', async () => {
    // blockAccess: .update(...).eq(...) — chain resolves with no error
    const chain = buildQueryChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await blockAccess('org_123', 'Payment dispute');

    expect(mockFrom).toHaveBeenCalledWith('subscriptions');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        access_blocked: true,
        access_blocked_reason: 'Payment dispute',
      })
    );
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should return success:false on error', async () => {
    const chain = buildQueryChain({ error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    const result = await blockAccess('org_123', 'test');

    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });
});

describe('restoreAccess', () => {
  it('should set access_blocked:false and clear reason', async () => {
    const chain = buildQueryChain({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await restoreAccess('org_123');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        access_blocked: false,
        access_blocked_reason: null,
      })
    );
    expect(result.success).toBe(true);
  });

  it('should return success:false on error', async () => {
    const chain = buildQueryChain({ error: { message: 'DB error' } });
    mockFrom.mockReturnValue(chain);

    const result = await restoreAccess('org_123');

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// calculateSubscriptionQuantity()
// ============================================================================

describe('calculateSubscriptionQuantity', () => {
  it('should return member count for organization', async () => {
    // calculateSubscriptionQuantity: .select(..).eq(..).eq(..) -> thenable resolves with count
    const chain = buildQueryChain({ count: 5, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await calculateSubscriptionQuantity('org_123');

    expect(mockFrom).toHaveBeenCalledWith('memberships');
    expect(result.quantity).toBe(5);
    expect(result.error).toBeNull();
  });

  it('should default to 1 when count is 0', async () => {
    const chain = buildQueryChain({ count: 0, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await calculateSubscriptionQuantity('org_123');

    expect(result.quantity).toBe(1);
  });

  it('should default to 1 when count is null', async () => {
    const chain = buildQueryChain({ count: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await calculateSubscriptionQuantity('org_123');

    expect(result.quantity).toBe(1);
  });

  it('should default to 1 on error', async () => {
    const chain = buildQueryChain({ count: null, error: { message: 'Query failed' } });
    mockFrom.mockReturnValue(chain);

    const result = await calculateSubscriptionQuantity('org_123');

    expect(result.quantity).toBe(1);
    expect(result.error).toBe('Query failed');
  });
});

// ============================================================================
// createCheckoutSession()
// ============================================================================

describe('createCheckoutSession', () => {
  const baseParams = {
    organizationId: 'org_123',
    planId: 'plan_456',
    priceId: 'price_789',
    successUrl: 'http://localhost/success',
    cancelUrl: 'http://localhost/cancel',
  };

  // Mock window.location
  const originalLocation = window.location;

  beforeEach(() => {
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '' } as any;
  });

  it('should return error when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    // calculateSubscriptionQuantity uses .from('memberships').select(..).eq(..).eq(..)
    const chain = buildQueryChain({ count: 1, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createCheckoutSession(baseParams);

    expect(result.sessionId).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('should calculate quantity when not provided', async () => {
    // calculateSubscriptionQuantity resolves with count: 3
    const chain = buildQueryChain({ count: 3, error: null });
    mockFrom.mockReturnValue(chain);

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createCheckoutSession(baseParams);

    // Verify fetch was called with quantity: 3
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"quantity":3'),
      })
    );

    vi.unstubAllGlobals();
  });

  it('should use provided quantity when given', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await createCheckoutSession({ ...baseParams, quantity: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"quantity":5'),
      })
    );

    vi.unstubAllGlobals();
  });

  it('should handle HTTP error responses', async () => {
    const chain = buildQueryChain({ count: 1, error: null });
    mockFrom.mockReturnValue(chain);

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden: Not an admin'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await createCheckoutSession(baseParams);

    expect(result.sessionId).toBeNull();
    expect(result.error).toContain('403');

    vi.unstubAllGlobals();
  });

  it('should redirect to url when returned', async () => {
    const chain = buildQueryChain({ count: 1, error: null });
    mockFrom.mockReturnValue(chain);

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/c/pay/cs_test_123',
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await createCheckoutSession(baseParams);

    expect(window.location.href).toBe('https://checkout.stripe.com/c/pay/cs_test_123');
    expect(result.error).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should handle fetch exceptions', async () => {
    const chain = buildQueryChain({ count: 1, error: null });
    mockFrom.mockReturnValue(chain);

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await createCheckoutSession(baseParams);

    expect(result.sessionId).toBeNull();
    expect(result.error).toBe('Network error');

    vi.unstubAllGlobals();
  });
});

// ============================================================================
// createPortalSession()
// ============================================================================

describe('createPortalSession', () => {
  const baseParams = {
    organizationId: 'org_123',
    returnUrl: 'http://localhost/settings',
  };

  const originalLocation = window.location;

  beforeEach(() => {
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '' } as any;
  });

  it('should return error when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await createPortalSession(baseParams);

    expect(result.url).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('should call edge function and redirect', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const portalUrl = 'https://billing.stripe.com/session/test_123';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: portalUrl }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await createPortalSession(baseParams);

    expect(window.location.href).toBe(portalUrl);
    expect(result.url).toBe(portalUrl);
    expect(result.error).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should handle HTTP error responses', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('No customer found'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await createPortalSession(baseParams);

    expect(result.url).toBeNull();
    expect(result.error).toContain('404');

    vi.unstubAllGlobals();
  });
});

// ============================================================================
// getInvoices()
// ============================================================================

describe('getInvoices', () => {
  it('should return error when not authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await getInvoices('org_123');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('should call get-invoices edge function', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const invoices = [
      { id: 'inv_1', amount: 20, status: 'paid', plan_name: 'Professional' },
    ];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invoices }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getInvoices('org_123');

    expect(result.data).toEqual(invoices);
    expect(result.error).toBeNull();

    vi.unstubAllGlobals();
  });

  it('should handle HTTP error responses', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal server error'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getInvoices('org_123');

    expect(result.data).toBeNull();
    expect(result.error).toContain('500');

    vi.unstubAllGlobals();
  });

  it('should handle fetch exceptions', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test_token' } },
    });

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await getInvoices('org_123');

    expect(result.data).toBeNull();
    expect(result.error).toBe('Network error');

    vi.unstubAllGlobals();
  });
});

// ============================================================================
// syncSeatCount()
// ============================================================================

describe('syncSeatCount', () => {
  describe('local-only path (no stripe_subscription_id)', () => {
    it('should count active members and update local record', async () => {
      // First call: getSubscription -> returns sub without stripe_subscription_id
      const sub = createMockSubscription({ stripe_subscription_id: null });
      const getSubChain = buildQueryChain({ data: sub, error: null });

      // Second call: memberships count (thenable chain resolves with count)
      const countChain = buildQueryChain({ count: 3, error: null });

      // Third call: subscriptions update (thenable chain resolves with no error)
      const updateChain = buildQueryChain({ error: null });

      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return getSubChain; // getSubscription
        if (callCount === 2) return countChain; // memberships count
        return updateChain; // subscriptions update
      });

      const result = await syncSeatCount('org_123', 'add');

      expect(result.success).toBe(true);
      expect(result.newQuantity).toBe(3);
    });

    it('should handle count error', async () => {
      const sub = createMockSubscription({ stripe_subscription_id: null });
      const getSubChain = buildQueryChain({ data: sub, error: null });

      // Count query fails
      const countChain = buildQueryChain({ count: null, error: { message: 'Count failed' } });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return getSubChain;
        return countChain;
      });

      const result = await syncSeatCount('org_123', 'add');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count failed');
    });
  });

  describe('Stripe path (has stripe_subscription_id)', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Need to mock auth for the Stripe path
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: 'test_token' } },
      });
    });

    it('should call manage-seats edge function with "add" action', async () => {
      const sub = createActiveSubscription();
      const getSubChain = buildQueryChain({ data: sub, error: null });
      mockFrom.mockReturnValue(getSubChain);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          previousQuantity: 2,
          newQuantity: 3,
          proratedAmount: 6.67,
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await syncSeatCount('org_123', 'add');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('manage-seats'),
        expect.objectContaining({
          body: expect.stringContaining('"action":"add"'),
        })
      );
      expect(result.success).toBe(true);
      expect(result.previousQuantity).toBe(2);
      expect(result.newQuantity).toBe(3);

      vi.unstubAllGlobals();
    });

    it('should call manage-seats with "remove" action', async () => {
      const sub = createActiveSubscription();
      const getSubChain = buildQueryChain({ data: sub, error: null });
      mockFrom.mockReturnValue(getSubChain);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          previousQuantity: 3,
          newQuantity: 2,
          proratedAmount: -6.67,
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await syncSeatCount('org_123', 'remove');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"action":"remove"'),
        })
      );
      expect(result.success).toBe(true);

      vi.unstubAllGlobals();
    });

    it('should call manage-seats with "update" action and quantity', async () => {
      const sub = createActiveSubscription();
      const getSubChain = buildQueryChain({ data: sub, error: null });
      mockFrom.mockReturnValue(getSubChain);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          previousQuantity: 2,
          newQuantity: 5,
          proratedAmount: 20,
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await syncSeatCount('org_123', 'update', 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"quantity":5'),
        })
      );
      expect(result.newQuantity).toBe(5);

      vi.unstubAllGlobals();
    });

    it('should return error on HTTP failure', async () => {
      const sub = createActiveSubscription();
      const getSubChain = buildQueryChain({ data: sub, error: null });
      mockFrom.mockReturnValue(getSubChain);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Subscription not found' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await syncSeatCount('org_123', 'add');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription not found');

      vi.unstubAllGlobals();
    });

    it('should handle fetch exceptions', async () => {
      const sub = createActiveSubscription();
      const getSubChain = buildQueryChain({ data: sub, error: null });
      mockFrom.mockReturnValue(getSubChain);

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await syncSeatCount('org_123', 'add');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');

      vi.unstubAllGlobals();
    });
  });
});
