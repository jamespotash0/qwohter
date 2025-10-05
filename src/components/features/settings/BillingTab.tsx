import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Download, CheckCircle, Loader2, ExternalLink, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { hasAdminPermissions } from "@/utils/permissions";
import { stripeService } from "@/services/stripeService";

interface BillingTabProps {
  organization: any;
  userRole: string;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  organization,
  userRole
}) => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const hasPermission = hasAdminPermissions(userRole);

  useEffect(() => {
    if (organization?.id && hasPermission) {
      loadSubscriptionData();
    } else {
      setLoading(false);
    }
  }, [organization?.id, hasPermission]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);

      // Load subscription
      const { data: subData, error: subError } = await stripeService.getSubscription(organization.id);
      if (subError) {
        console.error('Error loading subscription:', subError);
      } else {
        setSubscription(subData);
      }

      // Calculate user count
      const { quantity } = await stripeService.calculateSubscriptionQuantity(organization.id);
      setUserCount(quantity);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You need Admin or Owner permissions to manage billing.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Redirect to Stripe Customer Portal
      await stripeService.createPortalSession({
        organizationId: organization.id,
        returnUrl: window.location.href,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    }
  };

  const handleUpgrade = async () => {
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You need Admin or Owner permissions to change billing settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      // If they have a subscription, go to Stripe Customer Portal to manage it
      if (subscription?.stripe_customer_id) {
        await stripeService.createPortalSession({
          organizationId: organization.id,
          returnUrl: window.location.href,
        });
      } else {
        // If no subscription, go to subscription page to choose a plan
        window.location.href = '/subscription';
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open billing management",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">
            You need Admin or Owner permissions to view billing settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const plan = subscription?.plan;
  const isActive = subscription?.stripe_subscription_status === 'Active' || subscription?.stripe_subscription_status === 'Trialing';

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="pb-8 border-b border-[var(--content-card-border)]">
        <h2 className="text-lg font-semibold text-[var(--content-header-text)] mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Current Plan
        </h2>
        <Card>
          <CardContent className="pt-6">
            {subscription ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-[var(--content-header-text)]">
                      {plan?.display_name || 'No Plan'}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                      isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      {subscription.stripe_subscription_status || 'Inactive'}
                    </span>
                  </div>

                  {/* User Count */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{userCount} active {userCount === 1 ? 'user' : 'users'}</span>
                  </div>

                  {subscription.current_period_end && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Renews on {formatDate(subscription.current_period_end)}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  className="bg-orange-600 text-white hover:bg-orange-700"
                  onClick={handleUpgrade}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Plan
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No active subscription</p>
                <Button onClick={handleUpgrade} className="bg-blue-600 hover:bg-blue-700">
                  Choose a Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info about Stripe Portal */}
      <div className="pb-8">
        <h2 className="text-lg font-semibold text-[var(--content-header-text)] mb-6 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Billing History
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-gray-700">
                You can view your billing history via the Stripe Portal
              </p>
              <Button
                onClick={handleManageSubscription}
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Stripe Portal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
