import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { stripeService } from '@/services/stripeService';
import { useOrganizationStore } from '@/stores/organization/organizationStore';

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

  // Get cached subscription status from store
  const cachedStatus = useOrganizationStore((state) => state.subscriptionStatus);
  const setSubscriptionStatus = useOrganizationStore((state) => state.setSubscriptionStatus);

  // Initialize with cached values if available
  const [loading, setLoading] = useState(!cachedStatus);
  const [hasAccess, setHasAccess] = useState(cachedStatus?.hasAccess ?? false);
  const [blockReason, setBlockReason] = useState<string>(cachedStatus?.reason ?? '');

  useEffect(() => {
    checkSubscription();
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
                Choose a plan to continue using Qwohter
              </p>
              <Button
                onClick={() => navigate('/subscription')}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Choose a Plan
              </Button>
              <Button
                onClick={() => navigate('/settings?tab=billing')}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Go to Billing Settings
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                View billing history in the Stripe portal
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return <>{children}</>;
};
