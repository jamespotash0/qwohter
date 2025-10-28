import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeService } from '@/services/stripeService';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { useAuthStore } from '@/stores/auth/authStore';
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

  // Initialize with cached values if available
  const [loading, setLoading] = useState(!initialStatus);
  const [hasAccess, setHasAccess] = useState(initialStatus?.hasAccess ?? false);
  const [blockReason, setBlockReason] = useState<string>(initialStatus?.reason ?? '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Only check if we don't have ANY cached data (neither Zustand nor localStorage)
    if (!initialStatus) {
      checkSubscription();
    }

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
        (payload) => {
          console.log('Subscription changed, rechecking access:', payload);
          // Re-check subscription when it changes (no loading delay for realtime updates)
          checkSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const checkSubscription = async () => {
    const showLoading = !cachedStatus && !initialStatus;

    try {
      // Start timing for minimum delay
      const startTime = Date.now();
      const MIN_LOADING_TIME = 2000; // 2 seconds minimum

      // Only show loading if we don't have cached data
      if (showLoading) {
        setLoading(true);
      }

      const { isValid, reason } = await stripeService.hasValidSubscription(organizationId);

      // Only apply minimum delay if we showed loading spinner
      if (showLoading) {
        // Calculate remaining time to meet minimum delay
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        // Wait for remaining time if needed (so spinner shows for full 2 seconds)
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }

      setHasAccess(isValid);
      setBlockReason(reason || '');

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
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoggingOut(false);
    }
  };

  // Show full-screen loading spinner while checking subscription
  if (loading) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-[var(--content-muted-text)]">Checking subscription...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--content-bg)]">
          <Card className="max-w-md w-full mx-4 shadow-2xl border-gray-200">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Subscription Required</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                {blockReason || 'A valid subscription is required to access this feature'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <p className="text-sm text-gray-600 text-center">
                Choose a plan to continue. All plans include a 14-day free trial.
              </p>
              <Button
                onClick={() => navigate('/settings?tab=billing')}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Go to Billing Settings
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
