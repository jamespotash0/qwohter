import { useEffect } from 'react';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

/**
 * Hook to show daily trial reminder for users without payment method
 * Shows a toast once per day with:
 * - Days remaining in trial
 * - Prompt to add payment method
 * - Button to update payment method (opens Stripe portal)
 */
export function useTrialReminder() {
  const { currentOrganization } = useOrganizationStore();
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkAndShowReminder = async () => {
      if (!currentOrganization?.id || !mounted) return;

      try {
        // Get subscription with trial info
        type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .single() as { data: SubscriptionRow | null };

        if (!subscription) return;

        // Only show reminder if:
        // 1. User is on trial (status = 'Trialing')
        // 2. No payment method attached
        // 3. Trial end date exists
        const isOnTrial = subscription.stripe_subscription_status?.toLowerCase() === 'trialing';
        const hasPayment = subscription.has_payment_method;
        const trialEnd = subscription.trial_end;

        if (!isOnTrial || hasPayment || !trialEnd) {
          return;
        }

        const now = new Date();
        const trialEndDate = new Date(trialEnd);
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check if we're in grace period (trial expired, within 3 days)
        const inGracePeriod = daysRemaining < 0;
        const gracePeriodEnd = new Date(trialEndDate.getTime() + (3 * 24 * 60 * 60 * 1000));
        const graceDaysRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (inGracePeriod && graceDaysRemaining <= 0) {
          // Grace period expired - don't show reminder, access blocking will handle it
          return;
        }

        // Check if we've shown reminder recently
        const lastReminder = subscription.last_payment_reminder_sent_at;

        if (lastReminder) {
          const lastReminderDate = new Date(lastReminder);
          const hoursSinceLastReminder = (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60);

          // Escalating reminder frequency based on urgency
          if (inGracePeriod) {
            // Grace period: Every 2 hours (MAXIMUM urgency)
            if (hoursSinceLastReminder < 2) return;
          } else if (daysRemaining >= 8) {
            // Days 14-8: Once daily (24 hour cooldown)
            if (hoursSinceLastReminder < 24) return;
          } else if (daysRemaining >= 4) {
            // Days 7-4: Twice daily (12 hour cooldown)
            if (hoursSinceLastReminder < 12) return;
          } else if (daysRemaining >= 1) {
            // Days 3-1: Four times daily (6 hour cooldown)
            if (hoursSinceLastReminder < 6) return;
          } else {
            // Last 24 hours: Every 4 hours
            if (hoursSinceLastReminder < 4) return;
          }
        }

        // Show reminder toast with escalating urgency
        let title = 'Trial Reminder';
        let message = '';
        let duration = 15000;

        if (inGracePeriod) {
          // GRACE PERIOD - Maximum urgency
          title = `🚨 GRACE PERIOD: ${graceDaysRemaining} ${graceDaysRemaining === 1 ? 'Day' : 'Days'} Left!`;
          message = 'Your trial has EXPIRED! Add a payment method NOW in Settings → Billing or you will LOSE ACCESS to your account!';
          duration = 30000; // 30 seconds for grace period
        } else if (daysRemaining <= 0) {
          title = '🚨 Trial Expired Today!';
          message = 'Add a payment method NOW in Settings → Billing to continue uninterrupted access.';
          duration = 20000;
        } else if (daysRemaining === 1) {
          title = '⚠️ Trial Ends Tomorrow!';
          message = 'Your free trial ends tomorrow! Add a payment method in Settings → Billing to continue uninterrupted access.';
          duration = 20000;
        } else if (daysRemaining <= 3) {
          title = '⏰ Trial Ending Soon';
          message = `Only ${daysRemaining} days left in your trial. Add a payment method in Settings → Billing to ensure uninterrupted access.`;
          duration = 20000;
        } else if (daysRemaining <= 7) {
          title = '📅 Trial Halfway Point';
          message = `${daysRemaining} days remaining in your trial. Add a payment method anytime in Settings → Billing.`;
        } else {
          title = '✨ Trial Active';
          message = `${daysRemaining} days left to explore all features. Add a payment method in Settings → Billing when ready.`;
        }

        toast({
          title,
          description: message,
          duration,
        });

        // Update last reminder timestamp
        await supabase
          .from('subscriptions')
          .update({
            last_payment_reminder_sent_at: now.toISOString(),
          })
          .eq('id', subscription.id);

      } catch (error) {
        console.error('Error checking trial reminder:', error);
      }
    };

    // Check on mount
    checkAndShowReminder();

    return () => {
      mounted = false;
    };
  }, [currentOrganization?.id, toast]);
}
