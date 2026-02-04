import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignOut, useUser } from '@/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import { useSubscriptionStatus } from '@/hooks/queries/useSubscription';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';

interface SubscriptionPaywallProps {
  organizationId: string;
  children: React.ReactNode;
}

const PLAN_FEATURES = [
  'Unlimited proposals',
  'Team collaboration',
  'Analytics & reporting',
  'Priority support',
];

/**
 * Paywall component that checks subscription status using React Query
 * Blocks access if subscription is invalid and shows upgrade prompt
 */
export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  organizationId,
  children,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: signOut, isPending: isLoggingOut } = useSignOut();
  const user = useUser();

  const { role } = useCurrentOrganization(user?.id || '', !!user?.id);
  const isOwner = role === 'Owner';

  const { data: subscription, isLoading } = useSubscriptionStatus(organizationId, !!organizationId);

  useRealtimeSubscription(
    'subscriptions',
    ['subscription', 'status', organizationId],
    { filter: `organization_id=eq.${organizationId}` },
    !!organizationId
  );

  useEffect(() => {
    if (!organizationId || !subscription) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event?.type === 'updated' &&
        event?.query.queryKey[0] === 'subscription' &&
        event?.query.queryKey[1] === 'status' &&
        event?.query.queryKey[2] === organizationId
      ) {
        const newData = event.query.state.data as typeof subscription;
        const statusChanged = newData?.hasAccess !== subscription?.hasAccess;

        if (statusChanged) {
          if (newData?.hasAccess && !subscription?.hasAccess) {
            toast.success('Subscription activated! Reloading...', { duration: 2000 });
            setTimeout(() => window.location.reload(), 2000);
          } else if (!newData?.hasAccess && subscription?.hasAccess) {
            toast.error('Subscription expired. Redirecting...', { duration: 1500 });
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      }
    });

    return unsubscribe;
  }, [organizationId, subscription, queryClient]);

  const handleLogout = () => {
    queryClient.clear();
    signOut(undefined, {
      onSuccess: () => {
        navigate('/sign-in', { replace: true });
      }
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFFEFA] via-[#FFF9F7] to-[#FFE8E3]">
        <Loader2 className="w-10 h-10 animate-spin text-[#ee6c4d]" />
      </div>
    );
  }

  // Grace period: allow access but show warning banner
  if (subscription?.hasAccess && subscription?.inGracePeriod) {
    const daysText = subscription.graceDaysRemaining === 1
      ? '1 day'
      : `${subscription.graceDaysRemaining} days`;

    return (
      <>
        <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p
                className="text-sm text-amber-800 font-medium"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                Payment failed. Update your payment method within {daysText} to avoid losing access.
              </p>
            </div>
            {isOwner && (
              <Button
                onClick={() => navigate('/settings?tab=billing')}
                size="sm"
                className="rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex-shrink-0"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                Update Payment
              </Button>
            )}
          </div>
        </div>
        {children}
      </>
    );
  }

  // Block access if no subscription
  if (!subscription?.hasAccess) {
    const blockReason = subscription?.reason || '';
    const isTrialExpired = blockReason.toLowerCase().includes('trial');
    const isPaymentFailed = blockReason.toLowerCase().includes('payment') ||
                            blockReason.toLowerCase().includes('past_due') ||
                            blockReason.toLowerCase().includes('failed');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/50 backdrop-blur-sm p-4">
        {/* Pricing Card Modal */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header section */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-[#171717]/5">
            <h1
              className="text-2xl font-bold text-[#171717] mb-1"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Pro Plan
            </h1>
            <p
              className="text-sm text-[#171717]/50"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Built for growing teams
            </p>
          </div>

          {/* Pricing section */}
          <div className="px-8 py-6 bg-[#f7f2e9]/30">
            <div className="flex items-end justify-center gap-1.5">
              <span
                className="text-4xl font-bold text-[#ee6c4d]"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                $20
              </span>
              <span
                className="text-[#171717]/50 mb-1.5 text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                per user / month
              </span>
            </div>
          </div>

          {/* Features section */}
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-3">
              {PLAN_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#ee6c4d] flex-shrink-0" />
                  <span
                    className="text-sm text-[#171717]/70"
                    style={{ fontFamily: 'Urbanist, sans-serif' }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action section */}
          <div className="px-8 pb-8 pt-2">
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="outline"
                className="flex-1 h-12 rounded-full border-[#171717]/15 text-[#171717]/70 hover:text-[#171717] hover:bg-[#171717]/5 font-medium text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </Button>

              {isOwner ? (
                <Button
                  onClick={() => navigate('/settings?tab=billing')}
                  className="flex-1 h-12 rounded-full bg-[#ee6c4d] hover:bg-[#d95b3e] text-white font-semibold text-sm"
                  style={{ fontFamily: 'Urbanist, sans-serif' }}
                >
                  {isPaymentFailed ? 'Update Payment' : isTrialExpired ? 'Subscribe' : 'Manage Plan'}
                </Button>
              ) : (
                <div
                  className="flex-1 h-12 rounded-full bg-[#f7f2e9] flex items-center justify-center text-[#171717]/50 text-sm font-medium"
                  style={{ fontFamily: 'Urbanist, sans-serif' }}
                >
                  Contact admin
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has access - render children
  return <>{children}</>;
};
