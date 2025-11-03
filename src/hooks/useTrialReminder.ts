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

        // Check if we've shown reminder today
        const lastReminder = subscription.last_payment_reminder_sent_at;
        const now = new Date();

        if (lastReminder) {
          const lastReminderDate = new Date(lastReminder);
          const hoursSinceLastReminder = (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60);

          // Only show once per 24 hours
          if (hoursSinceLastReminder < 24) {
            return;
          }
        }

        // Calculate days remaining
        const trialEndDate = new Date(trialEnd);
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          // Trial expired - don't show reminder, access blocking will handle it
          return;
        }

        // Show reminder toast
        const message = daysRemaining === 1
          ? '⏰ Your free trial ends tomorrow! Add a payment method in Settings → Billing to continue uninterrupted access.'
          : `⏰ ${daysRemaining} days left in your free trial. Add a payment method in Settings → Billing to ensure uninterrupted access.`;

        toast({
          title: 'Trial Reminder',
          description: message,
          duration: 15000,
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
