import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, AlertCircle, LogOut, Sparkles } from 'lucide-react';
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

  // Initialize with cached values if available
  const [loading, setLoading] = useState(!cachedStatus);
  const [hasAccess, setHasAccess] = useState(cachedStatus?.hasAccess ?? false);
  const [blockReason, setBlockReason] = useState<string>(cachedStatus?.reason ?? '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isTrialEligible, setIsTrialEligible] = useState(false);

  useEffect(() => {
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
        (payload) => {
          console.log('Subscription changed, rechecking access:', payload);
          // Re-check subscription when it changes
          checkSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const checkSubscription = async () => {
    try {
      // Only show loading if we don't have cached data
      if (!cachedStatus) {
        setLoading(true);
      }

      const { isValid, reason } = await stripeService.hasValidSubscription(organizationId);

      setHasAccess(isValid);
      setBlockReason(reason || '');

      // Cache the result in Zustand store
      setSubscriptionStatus({
        hasAccess: isValid,
        reason: reason || '',
      });

      // Check trial eligibility
      const eligible = await stripeService.isTrialEligible(organizationId);
      setIsTrialEligible(eligible);
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

  const handleStartFreeTrial = async () => {
    setIsStartingTrial(true);
    try {
      const { success, error } = await stripeService.startFreeTrial(organizationId);

      if (success) {
        toast.success('Free trial started!', {
          description: 'You now have 14 days of full access to all features.',
        });

        // Clear cached status and re-check subscription
        setSubscriptionStatus({
          hasAccess: false,
          reason: '',
        });
        await checkSubscription();
      } else {
        toast.error('Failed to start trial', {
          description: error || 'Please try again or contact support.',
        });
      }
    } catch (error) {
      console.error('Error starting free trial:', error);
      toast.error('Failed to start trial', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsStartingTrial(false);
    }
  };

  if (loading) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
        </div>
      </>
    );
  }

  if (!hasAccess) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-md">
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
                {isTrialEligible ? 'Start your free trial or choose a plan to continue' : 'Choose a plan to continue'}
              </p>
              {isTrialEligible && (
                <Button
                  onClick={handleStartFreeTrial}
                  disabled={isStartingTrial}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg"
                >
                  {isStartingTrial ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Trial...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Start 14-Day Free Trial
                    </>
                  )}
                </Button>
              )}
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
                  className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Sign Out'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
