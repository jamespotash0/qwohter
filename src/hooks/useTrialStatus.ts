/**
 * useTrialStatus
 *
 * Resolves the organization's trial state (active trial, post-trial grace
 * period, or neither) so it can be surfaced wherever the user is looking —
 * currently the profile dropdown in the app top bar.
 */

import { useEffect, useState } from 'react';
import { stripeService } from '@/services/stripeService';

/** Days of grace after a trial ends before access is cut off */
const GRACE_PERIOD_DAYS = 3;

export interface TrialStatus {
  /** Days left in an active trial, or null when not trialing */
  trialDaysRemaining: number | null;
  inGracePeriod: boolean;
  graceDaysRemaining: number;
}

const NO_TRIAL: TrialStatus = {
  trialDaysRemaining: null,
  inGracePeriod: false,
  graceDaysRemaining: 0,
};

/** Whole calendar days between today and the given date */
function daysUntil(date: Date): number {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(date);
  targetMidnight.setHours(0, 0, 0, 0);
  return Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

export function useTrialStatus(organizationId: string | undefined): TrialStatus {
  const [status, setStatus] = useState<TrialStatus>(NO_TRIAL);

  useEffect(() => {
    let cancelled = false;

    const checkTrialStatus = async () => {
      if (!organizationId) {
        setStatus(NO_TRIAL);
        return;
      }

      const { data: subscription } = await stripeService.getSubscription(organizationId);
      if (cancelled) return;

      const subscriptionStatus = subscription?.stripe_subscription_status?.toLowerCase();
      if (subscriptionStatus !== 'trialing' || !subscription?.trial_end) {
        setStatus(NO_TRIAL);
        return;
      }

      const trialEndDate = new Date(subscription.trial_end);
      const daysLeft = daysUntil(trialEndDate);

      if (daysLeft >= 0) {
        // Active trial
        setStatus({ trialDaysRemaining: daysLeft, inGracePeriod: false, graceDaysRemaining: 0 });
        return;
      }

      if (subscription.has_payment_method) {
        // Trial over but billing will take over — nothing to warn about
        setStatus(NO_TRIAL);
        return;
      }

      // Trial expired with no payment method — check the grace period
      const gracePeriodEnd = new Date(trialEndDate.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
      const graceDays = daysUntil(gracePeriodEnd);

      setStatus(
        graceDays > 0
          ? { trialDaysRemaining: null, inGracePeriod: true, graceDaysRemaining: graceDays }
          : NO_TRIAL
      );
    };

    checkTrialStatus();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return status;
}
