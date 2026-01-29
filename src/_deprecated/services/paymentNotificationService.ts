/**
 * Payment Notification Service
 *
 * Helper functions for payment and subscription notifications
 * Called from frontend after Stripe events or from subscription manager
 */

import { supabase } from '@/integrations/supabase/client';
import { createNotification } from './notificationService';
import type { NotificationType } from '@/lib/types/notifications';

export type PaymentEventType = Extract<
  NotificationType,
  | 'payment_success'
  | 'payment_failed'
  | 'trial_ending'
  | 'subscription_activated'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'seat_count_changed'
>;

interface PaymentNotificationData {
  amount?: number;
  currency?: string;
  planName?: string;
  oldSeatCount?: number;
  newSeatCount?: number;
  daysRemaining?: number;
}

interface AdminWithProfile {
  user_id: string;
  profiles: { email: string | null; full_name: string | null };
}

/**
 * Get notification content based on event type
 */
function getPaymentNotificationContent(
  eventType: PaymentEventType,
  data: PaymentNotificationData
): { title: string; message: string } {
  const formatAmount = (amount?: number, currency?: string): string => {
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100); // Stripe uses cents
  };

  const messages: Record<PaymentEventType, { title: string; message: string }> = {
    payment_success: {
      title: 'Payment Successful',
      message: data.amount
        ? `Your payment of ${formatAmount(data.amount, data.currency)} was processed successfully.`
        : 'Your payment was processed successfully.',
    },
    payment_failed: {
      title: 'Payment Failed',
      message:
        'Your payment could not be processed. Please update your payment method to avoid service interruption.',
    },
    trial_ending: {
      title: 'Trial Ending Soon',
      message: `Your free trial ends in ${data.daysRemaining || 3} days. Add a payment method to continue using all features.`,
    },
    subscription_activated: {
      title: 'Subscription Activated',
      message: data.planName
        ? `Your ${data.planName} subscription is now active. Thank you for subscribing!`
        : 'Your subscription is now active. Thank you for subscribing!',
    },
    subscription_canceled: {
      title: 'Subscription Canceled',
      message:
        'Your subscription has been canceled. You will have access until the end of your billing period.',
    },
    subscription_renewed: {
      title: 'Subscription Renewed',
      message: data.amount
        ? `Your subscription has been renewed. Amount charged: ${formatAmount(data.amount, data.currency)}.`
        : 'Your subscription has been renewed successfully.',
    },
    seat_count_changed: {
      title: 'Seat Count Updated',
      message:
        data.oldSeatCount !== undefined && data.newSeatCount !== undefined
          ? `Your team size changed from ${data.oldSeatCount} to ${data.newSeatCount} seats.`
          : 'Your team seat count has been updated.',
    },
  };

  return messages[eventType];
}

/**
 * Create payment/subscription notifications for organization owners/admins
 */
export async function notifyPaymentEvent(
  organizationId: string,
  eventType: PaymentEventType,
  data: PaymentNotificationData = {}
): Promise<void> {
  try {
    // Get all Admins and Owners (they manage billing)
    const { data: fetchedData, error: fetchError } = await supabase
      .from('memberships')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('organization_id', organizationId)
      .eq('status', 'Active')
      .or('role.eq.Owner,role.eq.Admin');

    if (fetchError) {
      console.error('[notifyPaymentEvent] Failed to fetch admins:', fetchError);
      return;
    }

    const admins = fetchedData as unknown as AdminWithProfile[] | null;

    if (!admins || admins.length === 0) {
      console.log('[notifyPaymentEvent] No admins/owners to notify');
      return;
    }

    const { title, message } = getPaymentNotificationContent(eventType, data);

    // Create notifications for each admin/owner
    for (const admin of admins) {
      // Create in-app notification
      await createNotification({
        user_id: admin.user_id,
        organization_id: organizationId,
        type: eventType,
        title,
        message,
        link: '/settings?tab=billing',
        metadata: {
          amount: data.amount,
          currency: data.currency,
          plan_name: data.planName,
          old_seat_count: data.oldSeatCount,
          new_seat_count: data.newSeatCount,
          days_remaining: data.daysRemaining,
        },
      });

      // Send email notification (non-blocking)
      if (admin.profiles?.email) {
        sendPaymentEmail({
          recipientId: admin.user_id,
          recipientEmail: admin.profiles.email,
          recipientName: admin.profiles.full_name || 'Admin',
          organizationId,
          eventType,
          eventData: data,
        }).catch((err) => {
          console.error('[notifyPaymentEvent] Email failed:', err);
        });
      }
    }
  } catch (err) {
    console.error('[notifyPaymentEvent] Error:', err);
  }
}

/**
 * Send email notification for payment events
 */
async function sendPaymentEmail(params: {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  organizationId: string;
  eventType: PaymentEventType;
  eventData: PaymentNotificationData;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        userId: params.recipientId,
        organizationId: params.organizationId,
        notificationType: params.eventType,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        data: {
          amount: params.eventData.amount,
          currency: params.eventData.currency,
          planName: params.eventData.planName,
          oldSeatCount: params.eventData.oldSeatCount,
          newSeatCount: params.eventData.newSeatCount,
          daysRemaining: params.eventData.daysRemaining,
          link: '/settings?tab=billing',
        },
      },
    });

    if (error) {
      console.error('[sendPaymentEmail] Edge function error:', error);
    }
  } catch (err) {
    console.error('[sendPaymentEmail] Failed to send email:', err);
  }
}

// =============================================================================
// Convenience functions for specific payment events
// =============================================================================

export async function notifyPaymentSuccess(
  organizationId: string,
  amount: number,
  currency: string = 'USD'
): Promise<void> {
  return notifyPaymentEvent(organizationId, 'payment_success', { amount, currency });
}

export async function notifyPaymentFailed(organizationId: string): Promise<void> {
  return notifyPaymentEvent(organizationId, 'payment_failed', {});
}

export async function notifyTrialEnding(
  organizationId: string,
  daysRemaining: number = 3
): Promise<void> {
  return notifyPaymentEvent(organizationId, 'trial_ending', { daysRemaining });
}

export async function notifySubscriptionActivated(
  organizationId: string,
  planName?: string
): Promise<void> {
  return notifyPaymentEvent(organizationId, 'subscription_activated', { planName });
}

export async function notifySubscriptionCanceled(organizationId: string): Promise<void> {
  return notifyPaymentEvent(organizationId, 'subscription_canceled', {});
}

export async function notifySubscriptionRenewed(
  organizationId: string,
  amount?: number,
  currency: string = 'USD'
): Promise<void> {
  return notifyPaymentEvent(organizationId, 'subscription_renewed', { amount, currency });
}

export async function notifySeatCountChanged(
  organizationId: string,
  oldSeatCount: number,
  newSeatCount: number
): Promise<void> {
  return notifyPaymentEvent(organizationId, 'seat_count_changed', {
    oldSeatCount,
    newSeatCount,
  });
}
