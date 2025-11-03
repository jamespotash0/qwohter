import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeService } from '@/services/stripeService';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { useQuotesStore } from '@/stores/quotes/quotesStore';
import { useBoardStore } from '@/stores/board/boardStore';
import { useRemindersStore } from '@/stores/reminders/remindersStore';
import { useAppStore } from '@/stores/app/appStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionPaywallProps {
  organizationId: string;
  children: React.ReactNode;
}

/**
 * Paywall component that checks subscription status
 * Blocks access if subscription is invalid and shows upgrade prompt
 */
export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  organizationId,
  children,
}) => {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);
  const isLoggingOut = useAuthStore((state) => state.isLoggingOut);

  // Get user role to determine paywall display
  const currentUserRole = useOrganizationStore((state) => state.currentUserRole);
  const isOwner = currentUserRole === 'Owner';

  // Get cached subscription status from store
  const cachedStatus = useOrganizationStore((state) => state.subscriptionStatus);
  const setSubscriptionStatus = useOrganizationStore((state) => state.setSubscriptionStatus);

  // Try to get from localStorage if Zustand store is empty (e.g., after page reload)
  const getInitialStatus = () => {
    if (cachedStatus) return cachedStatus;

    try {
      const stored = localStorage.getItem(`subscription_${organizationId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if cache is less than 5 minutes old
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return { hasAccess: parsed.hasAccess, reason: parsed.reason };
        }
      }
    } catch (e) {
      console.error('Failed to parse cached subscription:', e);
    }
    return null;
  };

  const initialStatus = getInitialStatus();

  // Validate-first approach: ALWAYS validate before showing UI
  // - Show loading spinner until validation completes (~200ms)
  // - Show definitive UI (never wrong, never flashes)
  // - Realtime handles all future updates (instant, no revalidation needed)
  // - Simple, secure, no false UI ever
  const [loading, setLoading] = useState(true); // Always validate first
  const [hasAccess, setHasAccess] = useState(false); // Fail closed by default
  const [blockReason, setBlockReason] = useState<string>('');
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState<number>(0);

  console.log('🎫 Paywall initialized:', {
    initialStatus,
    loading,
    hasAccess,
    blockReason
  });

  useEffect(() => {
    // VALIDATE-FIRST APPROACH: Simple, secure, never shows wrong UI
    // 1. Always validate subscription on mount (200ms)
    // 2. Show loading spinner during validation (clear feedback)
    // 3. Show definitive UI after validation (never wrong)
    // 4. Realtime handles all future changes (instant, no revalidation)

    console.log('🔄 Validating subscription before showing UI...');

    // ALWAYS validate first - show loading until complete
    checkSubscription();

    // Set up realtime subscription to detect subscription changes
    const channel = supabase
      .channel(`subscription-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          console.log('🔔 Subscription changed, rechecking access:', payload);

          // Get the new subscription status
          const { isValid, reason, inGracePeriod: isGrace, graceDaysRemaining: graceDays } = await stripeService.hasValidSubscription(organizationId);

          // Check if status actually changed (to avoid unnecessary reloads)
          const statusChanged = isValid !== hasAccess;

          if (statusChanged) {
            console.log('✨ Subscription status changed:', { from: hasAccess, to: isValid });

            // Update state immediately
            setHasAccess(isValid);
            setBlockReason(reason || '');
            setInGracePeriod(isGrace || false);
            setGraceDaysRemaining(graceDays || 0);

            // Update cache
            setSubscriptionStatus({
              hasAccess: isValid,
              reason: reason || '',
            });
            localStorage.setItem(`subscription_${organizationId}`, JSON.stringify({
              hasAccess: isValid,
              reason: reason || '',
              timestamp: Date.now(),
            }));

            // Show toast and reload for critical changes
            if (isValid && !hasAccess) {
              // Inactive → Active: Show success message and reload
              toast.success('Subscription activated! Reloading...', { duration: 2000 });
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else if (!isValid && hasAccess) {
              // Active → Inactive: Show warning and reload immediately
              toast.error('Subscription expired. Redirecting...', { duration: 1500 });
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            }
          }
          // Removed recursive checkSubscription() call that was causing race conditions
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime connection status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected and listening for subscription changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Realtime connection failed:', status);
        }
      });

    // Also listen for organization deletion
    const orgDeletionChannel = supabase
      .channel(`org-deletion-paywall-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organizationId}`,
        },
        async (payload) => {
          console.log('🗑️ Organization deleted - signing out:', payload);

          // Clear organization cache
          localStorage.removeItem('org_cached_organization');
          localStorage.removeItem('org_cached_user_role');
          localStorage.removeItem('org_cached_membership');
          localStorage.removeItem('org_cached_members');
          localStorage.removeItem(`subscription_${organizationId}`);

          // Force logout and redirect
          await supabase.auth.signOut();
          window.location.href = '/sign-in';
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(orgDeletionChannel);
    };
  }, [organizationId]);

  const checkSubscription = async () => {
    try {
      // Always show loading while validating
      setLoading(true);

      // First, check if organization still exists
      const { data: orgCheck, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .maybeSingle();

      // If organization doesn't exist, log out immediately
      if (!orgCheck || orgError) {
        console.log('🗑️ Organization no longer exists - logging out');

        // Clear all caches
        localStorage.removeItem('org_cached_organization');
        localStorage.removeItem('org_cached_user_role');
        localStorage.removeItem('org_cached_membership');
        localStorage.removeItem('org_cached_members');
        localStorage.removeItem(`subscription_${organizationId}`);

        // Force logout
        await supabase.auth.signOut();
        window.location.href = '/sign-in';
        return;
      }

      const { isValid, reason, inGracePeriod: isGrace, graceDaysRemaining: graceDays } = await stripeService.hasValidSubscription(organizationId);

      console.log('💳 Subscription check result:', { isValid, reason, inGracePeriod: isGrace, graceDaysRemaining: graceDays, organizationId });

      setHasAccess(isValid);
      setBlockReason(reason || '');
      setInGracePeriod(isGrace || false);
      setGraceDaysRemaining(graceDays || 0);

      console.log('💳 State updated:', { hasAccess: isValid, blockReason: reason, inGracePeriod: isGrace, graceDaysRemaining: graceDays });

      // Cache the result in Zustand store
      setSubscriptionStatus({
        hasAccess: isValid,
        reason: reason || '',
      });

      // Also persist to localStorage with timestamp
      localStorage.setItem(`subscription_${organizationId}`, JSON.stringify({
        hasAccess: isValid,
        reason: reason || '',
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasAccess(false);
      setBlockReason('Unable to verify subscription status');

      // Cache the error state
      setSubscriptionStatus({
        hasAccess: false,
        reason: 'Unable to verify subscription status',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const startTime = Date.now();
    const MIN_LOGOUT_TIME = 800; // 800ms minimum for smooth UX

    // Set logging out state IMMEDIATELY to show loading overlay
    useAuthStore.getState()._setLoggingOut(true);

    // Wait a frame to ensure UI updates (loading overlay shows)
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // Reset all stores to clear UI
    useQuotesStore.getState().reset();
    useBoardStore.getState().reset();
    useOrganizationStore.getState().reset();
    useRemindersStore.getState().reset();
    useAppStore.getState().reset();

    // Sign out (this will clear auth state)
    await signOut();

    // Ensure minimum display time for loading spinner (smooth UX)
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOGOUT_TIME - elapsedTime);
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    // Navigate to sign-in (stores handle cleanup, no reload needed)
    navigate('/sign-in', { replace: true });
  };

  // Show full-screen loading spinner while checking subscription
  // Note: isLoggingOut is handled by MainLayout's overlay, so we don't need to check it here
  if (loading) {
    console.log('⏳ Showing loading spinner...');
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-[var(--content-muted-text)]">Checking subscription...</p>
        </div>
      </div>
    );
  }

  console.log('🚦 Paywall check:', { hasAccess, blockReason, loading });

  if (!hasAccess) {
    console.log('🚫 Blocking access - showing paywall');
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
              <CardTitle className="text-2xl text-gray-900">
                {isInGracePeriod
                  ? '🚨 GRACE PERIOD - Action Required!'
                  : isTrialExpired
                  ? 'Your Trial Has Ended'
                  : 'Subscription Required'}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-2 text-base">
                {isInGracePeriod
                  ? 'Your trial has expired! Add a payment method NOW or lose access in a few days.'
                  : isTrialExpired
                  ? 'Good news — your work is saved! Continue right where you left off.'
                  : (blockReason || 'A valid subscription is required to access this feature')}
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

  return <>{children}</>;
};
