import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSignOut, useUser } from '@/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';
import { useSubscriptionStatus } from '@/hooks/queries/useSubscription';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';

interface SubscriptionPaywallProps {
  organizationId: string;
  children: React.ReactNode;
}

/**
 * Paywall component that checks subscription status using React Query
 * Blocks access if subscription is invalid and shows upgrade prompt
 *
 * Auth v3.0.0 compliant:
 * - Uses React Query for data fetching and caching
 * - Centralized real-time subscriptions
 * - Automatic cache invalidation
 * - No manual localStorage management
 */
export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  organizationId,
  children,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: signOut, isPending: isLoggingOut } = useSignOut();
  const user = useUser();

  // Get user role from React Query (auth v3.0.0)
  const { role } = useCurrentOrganization(user?.id || '', !!user?.id);
  const isOwner = role === 'Owner';

  // Get subscription status from React Query (auth v3.0.0)
  const { data: subscription, isLoading } = useSubscriptionStatus(organizationId, !!organizationId);

  // Set up centralized realtime subscription
  useRealtimeSubscription(
    'subscriptions',
    ['subscriptions', organizationId],
    { filter: `organization_id=eq.${organizationId}` },
    !!organizationId
  );

  // Show toast when subscription status changes via real-time
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
          console.log('✨ Subscription status changed:', {
            from: subscription?.hasAccess,
            to: newData?.hasAccess
          });

          // Show toast and reload on status change
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
    // Clear React Query cache
    queryClient.clear();

    // Sign out using auth hook
    signOut(undefined, {
      onSuccess: () => {
        navigate('/sign-in', { replace: true });
      }
    });
  };

  // Show loading spinner while checking subscription
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-[var(--content-muted-text)]">Checking subscription...</p>
        </div>
      </div>
    );
  }

  // Block access if no subscription
  if (!subscription?.hasAccess) {
    // Non-owner users see simplified message
    if (!isOwner) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-white/20 bg-white/70 backdrop-blur-xl backdrop-saturate-150 dark:bg-gray-900/70 dark:border-gray-700/50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Subscription Required</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Please contact your organization administrator to upgrade your subscription plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="ghost"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Logging out...' : 'Sign Out'}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Owner users see full paywall with billing options
    const isTrialExpired = blockReason?.toLowerCase().includes('trial');
    const isInGracePeriod = blockReason?.toLowerCase().includes('grace');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40">
          <Card className={`max-w-lg w-full mx-4 shadow-2xl bg-white/70 backdrop-blur-xl backdrop-saturate-150 dark:bg-gray-900/70 ${isInGracePeriod ? 'border-red-500/50 border-2' : 'border-white/20 dark:border-gray-700/50'}`}>
            <CardHeader className="text-center pb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isInGracePeriod ? 'bg-red-100 animate-pulse' : 'bg-orange-100'
              }`}>
                <AlertCircle className={`w-8 h-8 ${isInGracePeriod ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <CardTitle className="text-2xl text-gray-900">Subscription Required</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {subscription?.reason || 'A valid subscription is required to access this feature'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {/* Grace period warning */}
              {isInGracePeriod && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-red-900 mb-2">
                    ⚠️ URGENT: Access Ending Soon
                  </h3>
                  <p className="text-sm text-red-800 font-medium">
                    You have limited time to add a payment method. Without action, you'll lose access to all features and data.
                  </p>
                </div>
              )}

              {/* Value proposition */}
              {(isTrialExpired || isInGracePeriod) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    What You'll Keep:
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      All your proposals and quotes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Full team collaboration
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Advanced analytics & reporting
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      Priority support
                    </li>
                  </ul>
                </div>
              )}

              {/* Social proof */}
              {(isTrialExpired || isInGracePeriod) && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600">
                    Join <span className="font-semibold text-gray-900">500+ companies</span> using Qwohter
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-600 text-center">
                {isInGracePeriod
                  ? 'Add payment now to keep your data and continue working.'
                  : isTrialExpired
                  ? 'Choose a plan to continue where you left off.'
                  : 'Please go to billing settings to manage your subscription and restore access.'}
              </p>

              <Button
                onClick={() => navigate('/settings?tab=billing')}
                className={`w-full h-12 text-base font-semibold ${
                  isInGracePeriod
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                }`}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {isInGracePeriod ? 'Add Payment NOW' : isTrialExpired ? 'Choose Your Plan' : 'Go to Billing Settings'}
              </Button>

              <div className="pt-2 border-t border-gray-200">
                <Button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Sign Out'}
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    );
  }

  // Has access - render children
  return <>{children}</>;
};
