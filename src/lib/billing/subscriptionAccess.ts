/**
 * Subscription access
 *
 * Whether an organization may use the app, and — the part that matters right
 * after signup — whether we actually know yet.
 *
 * There are three answers, not two: allowed, refused, and not-decided-yet. A
 * brand-new organization has no subscription row until `create-trial-subscription`
 * writes one, and treating that gap as a refusal put a "Manage Plan" paywall in
 * front of people ten seconds into their trial. `provisioning` is that third
 * answer; callers show a setup spinner for a bounded window rather than an
 * accusation.
 *
 * Pure, and deliberately free of the Supabase client so it can be tested
 * without one.
 */

/** The columns the access decision is made from. */
export interface SubscriptionRow {
  stripe_subscription_status: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  has_payment_method: boolean;
  grace_period_end: string | null;
  access_blocked_reason: string | null;
}

export interface SubscriptionAccess {
  hasAccess: boolean;
  status: string | null;
  reason: string;
  inGracePeriod?: boolean;
  graceDaysRemaining?: number;
  /**
   * Access cannot be granted *yet*, as opposed to being refused: no row, a row
   * whose status has not settled, or a lookup that failed.
   */
  provisioning?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuses that keep access alive for three days past a trial's end. */
const TRIAL_GRACE_STATUSES = ['incomplete', 'incomplete_expired', 'past_due'];

const daysUntil = (end: Date, now: Date): number =>
  Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));

/**
 * Decide what a subscription row entitles an organization to.
 *
 * Pure, and separated from the fetch so the three-way distinction can be
 * tested. `now` is a parameter because every grace period here is a question
 * about the passage of time.
 */
export function evaluateSubscription(
  data: SubscriptionRow | null,
  now: Date = new Date()
): SubscriptionAccess {
  // No row yet. The org was almost certainly created moments ago.
  if (!data) {
    return {
      hasAccess: false,
      status: null,
      reason: 'No active subscription',
      provisioning: true,
    };
  }

  const status = data.stripe_subscription_status?.toLowerCase();

  // The row can land before its status does. That is still setup in progress,
  // not a lapsed account, and telling the two apart is the difference between
  // a spinner and an accusation.
  if (!status) {
    return {
      hasAccess: false,
      status: data.stripe_subscription_status,
      reason: 'Subscription is still being set up',
      provisioning: true,
    };
  }

  if (status === 'active' || status === 'trialing') {
    return { hasAccess: true, status: data.stripe_subscription_status, reason: '' };
  }

  // Payment failure grace period, ending on a date Stripe's webhook set.
  if (data.grace_period_end) {
    const gracePeriodEnd = new Date(data.grace_period_end);
    if (now <= gracePeriodEnd) {
      return {
        hasAccess: true,
        status: data.stripe_subscription_status,
        reason: data.access_blocked_reason ?? 'Payment failed',
        inGracePeriod: true,
        graceDaysRemaining: daysUntil(gracePeriodEnd, now),
      };
    }
  }

  // Trial grace period: three days after the trial itself expired.
  if (TRIAL_GRACE_STATUSES.includes(status) && data.trial_end) {
    const gracePeriodEnd = new Date(new Date(data.trial_end).getTime() + 3 * DAY_MS);
    if (now <= gracePeriodEnd) {
      return {
        hasAccess: true,
        status: data.stripe_subscription_status,
        reason: '',
        inGracePeriod: true,
        graceDaysRemaining: daysUntil(gracePeriodEnd, now),
      };
    }
  }

  return {
    hasAccess: false,
    status: data.stripe_subscription_status,
    reason: 'Subscription is not active',
  };
}
