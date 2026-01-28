import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2, Download, Search, Filter, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { hasOwnerPermissions } from "@/utils/permissions";
import { stripeService } from "@/services/stripeService";
import { formatTimestamp } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/auth";
import { useRealtimeSubscription } from "@/lib/realtimeSubscriptions";

interface BillingTabProps {
  organization: any;
  userRole: string;
}

interface Invoice {
  id: string;
  invoice_pdf: string;
  billing_date: string;
  plan_name: string;
  amount: number;
  status: string;
  period_start: string;
  period_end: string;
  amount_refunded?: number;
  billing_reason?: string; // subscription_cycle, subscription_create, subscription_update, etc.
  proration_quantity?: number | null; // Number of seats added for proration invoices
}

// Filter invoices to show meaningful billing events
// Excludes only $0 invoices (trial periods with no charge)
// Includes: subscription cycles, creates, updates (prorations), and legacy invoices
const filterCycleInvoices = (invoices: Invoice[]): Invoice[] => {
  return invoices.filter(invoice =>
    invoice.amount > 0 // Exclude $0 invoices (trial periods)
    // Include all billing reasons: cycle, create, update (proration), etc.
  );
};

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  stripe_product_id: string;
  stripe_price_id_monthly: string;
  stripe_price_id_yearly: string;
  price_per_month: number;
  price_per_yearly: number;
  features: any;
  max_users: number | null;
  min_users: number | null;
  is_active: boolean;
  sort_order: number;
}

export const BillingTab: React.FC<BillingTabProps> = ({
  organization,
  userRole
}) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ v3.0.0: Use new auth session hook
  const { data: session } = useSession();

  const [loading, setLoading] = useState(false); // Never show loading spinner - use cached data
  const [subscription, setSubscription] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('billing_subscription_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [userCount, setUserCount] = useState(() => {
    try {
      const cached = localStorage.getItem('billing_user_count_cache');
      return cached ? JSON.parse(cached) : 0;
    } catch {
      return 0;
    }
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const cached = localStorage.getItem('billing_invoices_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(() => {
    try {
      const cached = localStorage.getItem('billing_plans_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  // COMMENTED OUT: Only monthly billing supported now
  // const [billingInterval, setBillingInterval] = useState<'Monthly' | 'Yearly'>('Monthly');
  // const [planIntervals, setPlanIntervals] = useState<Record<string, 'Monthly' | 'Yearly'>>({});
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  // const [showCompareModal, setShowCompareModal] = useState(false);
  // Force re-render every minute to update billing period progress bar
  const [, setCurrentTime] = useState(Date.now());
  const hasPermission = hasOwnerPermissions(userRole);

  useEffect(() => {
    if (organization?.id && hasPermission) {
      loadBillingData();
    } else {
      setLoading(false);
    }
  }, [organization?.id, hasPermission]);

  // Update billing period progress bar every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Handle success parameter from Stripe Checkout redirect
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true' && organization?.id) {
      // Remove success param from URL immediately
      setSearchParams({});

      // Poll for subscription with retry logic (silent - no toasts)
      let retries = 0;
      const maxRetries = 5; // Try for up to 10 seconds (5 retries * 2 seconds)

      const checkSubscription = async () => {
        try {
          const { data: sub } = await stripeService.getSubscription(organization.id);

          if (sub && sub.stripe_subscription_status) {
            // Subscription found - refresh data silently
            loadBillingData();
          } else if (retries < maxRetries) {
            // Not found yet, retry
            retries++;
            setTimeout(checkSubscription, 2000);
          } else {
            // Failed after all retries - webhook likely failed
            toast({
              title: "Subscription processing delayed",
              description: "Your payment was successful, but subscription activation is taking longer than expected. Please refresh in a few moments or contact support if the issue persists.",
              variant: "destructive",
            });
            loadBillingData(); // Refresh anyway to show current state
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
          if (retries < maxRetries) {
            retries++;
            setTimeout(checkSubscription, 2000);
          } else {
            toast({
              title: "Error verifying subscription",
              description: "Please refresh the page or contact support.",
              variant: "destructive",
            });
          }
        }
      };

      // Start checking after 2 seconds (give webhook time to process)
      setTimeout(checkSubscription, 2000);
    }
  }, [searchParams, organization?.id]);

  // Handle upgrade parameter from sidebar trial banner
  useEffect(() => {
    const shouldUpgrade = searchParams.get('upgrade');
    if (shouldUpgrade === 'true' && subscription && plans.length > 0) {
      const isTrialing = subscription.stripe_subscription_status?.toLowerCase() === 'trialing';

      if (isTrialing) {
        // Remove upgrade param from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('upgrade');
        setSearchParams(newParams);

        // Find current plan and trigger upgrade
        const currentPlan = plans.find(p => p.id === subscription.plan_id);
        if (currentPlan) {
          handleUpgradePlan(currentPlan);
        }
      }
    }
  }, [searchParams, subscription, plans]);

  // Handle portal return - refresh data when returning from Stripe Customer Portal
  useEffect(() => {
    const portalReturn = searchParams.get('portal_return');
    if (portalReturn === 'true' && organization?.id) {
      // Remove portal_return param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('portal_return');
      setSearchParams(newParams);

      // Reload billing data after delay to allow webhook to process
      // First reload after 2 seconds, then again after 5 seconds to catch slow webhooks
      setTimeout(() => {
        loadBillingData();
      }, 2000);
      setTimeout(() => {
        loadBillingData();
      }, 5000);
    }
  }, [searchParams, organization?.id]);

  // Set up centralized realtime subscriptions
  useRealtimeSubscription(
    'subscription_plans',
    ['subscription_plans'],
    {}, // No filter - listen to all plans
    true // Always enabled
  );

  useRealtimeSubscription(
    'subscriptions',
    ['subscriptions', organization?.id || ''],
    { filter: `organization_id=eq.${organization?.id}` },
    !!organization?.id
  );

  // Watch for subscription_plans changes
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey[0] === 'subscription_plans') {
        console.log('Subscription plans changed, reloading...');
        // Reload plans data
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .then(({ data, error }) => {
            if (!error && data) {
              setPlans(data);
              // Update cache
              try {
                localStorage.setItem('billing_plans_cache', JSON.stringify(data));
              } catch (e) {
                console.error('Failed to update plans cache:', e);
              }
            }
          });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  // Watch for subscriptions changes
  useEffect(() => {
    if (!organization?.id) return;

    const unsubscribe = queryClient.getQueryCache().subscribe(async (event) => {
      if (event?.query.queryKey[0] === 'subscriptions' && event?.query.queryKey[1] === organization.id) {
        console.log('Subscription changed, reloading...');

        // Reload subscription data
        const { data: subData, error: subError } = await stripeService.getSubscription(organization.id);
        if (!subError) {
          // Update state even if subData is null (subscription was deleted)
          setSubscription(subData);
          // Update cache
          try {
            if (subData) {
              localStorage.setItem('billing_subscription_cache', JSON.stringify(subData));
            } else {
              // Clear cache if subscription was deleted
              localStorage.removeItem('billing_subscription_cache');
            }
          } catch (e) {
            console.error('Failed to update subscription cache:', e);
          }
        }

        // Recalculate user count
        const { quantity } = await stripeService.calculateSubscriptionQuantity(organization.id);
        setUserCount(quantity);
        // Update cache
        try {
          localStorage.setItem('billing_user_count_cache', JSON.stringify(quantity));
        } catch (e) {
          console.error('Failed to update user count cache:', e);
        }
      }
    });

    return unsubscribe;
  }, [organization?.id, queryClient]);

  const loadBillingData = async () => {
    try {
      // Never show loading spinner - data is already displayed from cache
      setLoading(false);

      // Load subscription
      const { data: subData, error: subError} = await stripeService.getSubscription(organization.id);
      if (subError) {
        console.error('Error loading subscription:', subError);
      } else {
        console.log('Loaded subscription:', subData);
        setSubscription(subData);
        // Cache subscription data
        try {
          if (subData) {
            localStorage.setItem('billing_subscription_cache', JSON.stringify(subData));
          } else {
            // Clear cache if no subscription exists
            localStorage.removeItem('billing_subscription_cache');
          }
        } catch (e) {
          console.error('Failed to cache subscription:', e);
        }
      }

      // Calculate user count
      const { quantity } = await stripeService.calculateSubscriptionQuantity(organization.id);
      setUserCount(quantity);
      // Cache user count
      try {
        localStorage.setItem('billing_user_count_cache', JSON.stringify(quantity));
      } catch (e) {
        console.error('Failed to cache user count:', e);
      }

      // Load invoices from Stripe
      try {
        const { data: invoiceData, error: invoiceError } = await stripeService.getInvoices(organization.id);
        if (!invoiceError && invoiceData) {
          setInvoices(invoiceData);
          // Cache invoices
          try {
            localStorage.setItem('billing_invoices_cache', JSON.stringify(invoiceData));
          } catch (e) {
            console.error('Failed to cache invoices:', e);
          }
        }
      } catch (err) {
        console.log('Invoice fetching not yet configured (Edge Function needed)');
        // Silently fail - Edge Function hasn't been deployed yet
      }

      // Load available plans from database
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (plansError) {
        console.error('Error loading plans:', plansError);
      } else {
        console.log('Loaded plans:', plansData);
        setPlans(plansData || []);
        // Cache plans
        try {
          localStorage.setItem('billing_plans_cache', JSON.stringify(plansData || []));
        } catch (e) {
          console.error('Failed to cache plans:', e);
        }
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    }
  };

  const handleOpenPortal = async () => {
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You need Owner permissions to manage your plan.",
        variant: "destructive",
      });
      return;
    }

    if (!subscription?.stripe_customer_id) {
      toast({
        title: "No Subscription",
        description: "You need an active subscription to access the billing portal.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPlan('portal');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          organizationId: organization.id,
          returnUrl: `${window.location.origin}/settings?tab=billing&portal_return=true`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Portal session error:', data);
        throw new Error(data.error || 'Failed to create portal session');
      }

      if (!data.url) {
        throw new Error('No portal URL returned');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error opening portal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
      setProcessingPlan(null);
    }
  };

  const handleUpgradePlan = async (plan: SubscriptionPlan) => {
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You need Owner permissions to upgrade your plan.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingPlan(plan.id);

      // If user already has a subscription, use portal instead
      if (subscription?.stripe_customer_id) {
        await handleOpenPortal();
        return;
      }

      // UPDATED: Only monthly billing supported now
      // const selectedInterval = planIntervals[plan.id] || 'Monthly';
      // const priceId = selectedInterval === 'Monthly'
      //   ? plan.stripe_price_id_monthly
      //   : plan.stripe_price_id_yearly;
      const priceId = plan.stripe_price_id_monthly;

      if (!priceId || priceId.includes('placeholder')) {
        toast({
          title: "Setup Required",
          description: "Please configure Stripe product IDs first. Check STRIPE_SETUP_GUIDE.md",
          variant: "destructive",
        });
        setProcessingPlan(null);
        return;
      }

      // ONLY Team plan now - always use user count
      const quantity = userCount;

      // Create checkout session and redirect to Stripe
      const { error } = await stripeService.createCheckoutSession({
        organizationId: organization.id,
        planId: plan.id,
        priceId: priceId,
        successUrl: `${window.location.origin}/settings?tab=billing&success=true`,
        cancelUrl: `${window.location.origin}/settings?tab=billing&canceled=true`,
        quantity,
      });

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive",
      });
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleDownloadInvoice = (invoiceUrl: string) => {
    window.open(invoiceUrl, '_blank');
  };

  const handleDownloadSelected = () => {
    selectedInvoices.forEach(invoiceId => {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice?.invoice_pdf) {
        window.open(invoice.invoice_pdf, '_blank');
      }
    });
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const toggleSelectAll = () => {
    const filteredInvoices = filterCycleInvoices(invoices);
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id));
    }
  };

  const formatDate = (dateString: string): string => {
    return formatTimestamp(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // COMMENTED OUT: Only monthly billing supported now
  // const getDisplayPrice = (plan: SubscriptionPlan) => {
  //   if (billingInterval === 'Monthly') {
  //     return plan.price_per_month;
  //   }
  //   // For annual, show the monthly equivalent
  //   const monthlyEquivalent = plan.price_per_yearly / 12;
  //   return Number.isInteger(monthlyEquivalent) ? monthlyEquivalent : monthlyEquivalent.toFixed(2);
  // };

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    // Only consider it current if subscription exists, is active, AND not cancelled/paused
    if (!subscription) return false;

    return subscription.plan_id === plan.id &&
           subscription.is_active &&
           !subscription.cancel_at_period_end &&
           !subscription.pause_at_period_end;
  };

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Restricted</h3>
          <p className="text-gray-600 dark:text-gray-400">
            You need Owner permissions to view billing settings.
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

  return (
    <div className="max-w-5xl">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan & Billing</h2>
            {/* <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setShowCompareModal(true)}
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Compare plans
            </Button> */}
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>
        </div>

      {/* Cancellation Notice & Billing Period Progress Bar wrapper */}
      <div className="mb-6">
        {/* Cancellation Notice - Show when subscription is cancelled but still active */}
        {subscription?.cancel_at_period_end && subscription?.is_active && subscription?.current_period_end && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Your subscription will end in {Math.max(0, Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days</strong> on {new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
          </p>
        )}

        {/* Billing/Trial Period Progress Bar - Show when subscription exists and is active */}
        {subscription && subscription.is_active && (
          <div className="flex items-center gap-4">
          {(() => {
            // Check if on trial
            const isOnTrial = subscription.stripe_subscription_status?.toLowerCase() === 'trialing';
            const hasTrialDates = subscription.trial_start && subscription.trial_end;
            const hasBillingDates = subscription.current_period_start && subscription.current_period_end;

            // Use trial dates if on trial, otherwise use billing period dates
            const periodStart = isOnTrial && hasTrialDates
              ? new Date(subscription.trial_start)
              : hasBillingDates ? new Date(subscription.current_period_start) : null;
            const periodEnd = isOnTrial && hasTrialDates
              ? new Date(subscription.trial_end)
              : hasBillingDates ? new Date(subscription.current_period_end) : null;

            if (!periodStart || !periodEnd) return null;

            const now = new Date();
            const totalDuration = periodEnd.getTime() - periodStart.getTime();
            const elapsed = now.getTime() - periodStart.getTime();
            const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
            const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            const periodLabel = isOnTrial ? 'Free Trial' : 'Billing Period';
            const progressBarColor = isOnTrial ? 'bg-blue-500' : 'bg-[#EE6C4D]';

            return (
              <>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {periodLabel}
                    </p>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                    </p>
                  </div>
                  <div className="relative w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-300 ${progressBarColor}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleOpenPortal}
                  variant="outline"
                  className="shrink-0 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={!hasPermission || processingPlan === 'portal'}
                >
                  {processingPlan === 'portal' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Opening...
                    </>
                  ) : (
                    'Manage Plan'
                  )}
                </Button>
              </>
            );
          })()}
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="flex gap-6 flex-wrap">
        {plans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => {
          // Extract features array from JSONB structure
          const featuresArray = Array.isArray(plan.features?.features)
            ? plan.features.features
            : [];
          const isCurrent = isCurrentPlan(plan);
          const isProcessing = processingPlan === plan.id;
          const isIndividualPlan = plan.name === 'Individual';
          // Disable Individual plan if organization has more than 1 user
          const isIndividualDisabled = isIndividualPlan && userCount > 1;

          return (
            <Card
              key={plan.id}
              className="relative card-elevated bg-gray-100 dark:bg-gray-800 border-0 hover:shadow-none hover:transform-none w-[calc(50%-12px)] max-w-[320px]"
            >
              <CardContent className="pt-6 pb-5">
                <div className="space-y-4">
                  {/* Plan Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {plan.display_name}
                      </h3>
                      {/* <button
                        onClick={() => {
                          const currentInterval = isCurrent && subscription?.billing_interval && !planIntervals[plan.id]
                            ? (subscription.billing_interval?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly')
                            : (planIntervals[plan.id] || 'Monthly');
                          setPlanIntervals({
                            ...planIntervals,
                            [plan.id]: currentInterval === 'Monthly' ? 'Yearly' : 'Monthly'
                          });
                        }}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none bg-gray-200 dark:bg-gray-700"
                        style={{
                          backgroundColor: (() => {
                            const selectedInterval = isCurrent && subscription?.billing_interval && !planIntervals[plan.id]
                              ? (subscription.billing_interval?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly')
                              : (planIntervals[plan.id] || 'Monthly');
                            return selectedInterval === 'Yearly' ? '#EE6C4D' : undefined;
                          })()
                        }}
                      >
                        <span
                          className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                          style={{
                            transform: (() => {
                              const selectedInterval = isCurrent && subscription?.billing_interval && !planIntervals[plan.id]
                                ? (subscription.billing_interval?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly')
                                : (planIntervals[plan.id] || 'Monthly');
                              return selectedInterval === 'Yearly' ? 'translateX(18px)' : 'translateX(2px)';
                            })()
                          }}
                        />
                      </button> */}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price - UPDATED: Only monthly billing supported now */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${plan.price_per_month}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {isIndividualPlan ? '/ month' : '/ user / month'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Billed monthly
                    </p>
                  </div>

                  {/* CTA Button - UPDATED: Removed interval change logic since only monthly billing */}
                  {(() => {
                    // COMMENTED OUT: Interval-related logic
                    // const selectedInterval = isCurrent && subscription?.billing_interval && !planIntervals[plan.id]
                    //   ? (subscription.billing_interval?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly')
                    //   : (planIntervals[plan.id] || 'Monthly');
                    // const currentInterval = subscription?.billing_interval?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly';
                    // const isIntervalChanged = isCurrent && planIntervals[plan.id] && selectedInterval !== currentInterval;
                    // Since only monthly billing exists, interval never changes
                    const isIntervalChanged = false;

                    if (isCurrent && !isIntervalChanged) {
                      // Current plan with same interval - show "Current Plan" or "Free Trial"
                      const isTrialing = subscription?.stripe_subscription_status?.toLowerCase() === 'trialing';
                      return (
                        <Button
                          className="w-full bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 cursor-default pointer-events-none"
                        >
                          {isTrialing ? 'Free Trial' : 'Current Plan'}
                        </Button>
                      );
                    } else if (isIndividualDisabled) {
                      // Individual plan disabled due to multiple users
                      return (
                        <div>
                          <Button
                            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                            disabled
                          >
                            Not Available
                          </Button>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Individual plan requires 1 user
                          </p>
                        </div>
                      );
                    } else {
                      // Show Upgrade Plan or Manage based on subscription status
                      return (
                        <Button
                          className="w-full bg-[#EE6C4D] hover:bg-[#d85a3d] text-white flex items-center justify-center gap-2"
                          onClick={() => subscription?.is_active ? handleOpenPortal() : handleUpgradePlan(plan)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : subscription?.is_active ? (
                            // If subscription is active, show "Manage Plan"
                            <span>Manage Plan</span>
                          ) : (
                            // No active subscription, show "Upgrade Plan"
                            <span>Upgrade Plan</span>
                          )}
                        </Button>
                      );
                    }
                  })()}

                  {/* Features List */}
                  {featuresArray.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {featuresArray.map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Billing History
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search..."
                className="pl-9 w-64 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleDownloadSelected}
              disabled={selectedInvoices.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <Checkbox
                      checked={selectedInvoices.length === filterCycleInvoices(invoices).length && filterCycleInvoices(invoices).length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="data-[state=checked]:bg-[#EE6C4D] data-[state=checked]:border-[#EE6C4D]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filterCycleInvoices(invoices).length > 0 ? (
                  filterCycleInvoices(invoices).map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                          className="data-[state=checked]:bg-[#EE6C4D] data-[state=checked]:border-[#EE6C4D]"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {invoice.plan_name}
                        {invoice.billing_reason === 'subscription_update' && invoice.proration_quantity && invoice.proration_quantity > 0 && (
                          <span className="text-gray-500 dark:text-gray-400 font-normal">
                            {' '}(Prorated {invoice.proration_quantity} New {invoice.proration_quantity === 1 ? 'User' : 'Users'})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        $ {invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.billing_date)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {(() => {
                            // Check for refunds first
                            if (invoice.amount_refunded && invoice.amount_refunded > 0) {
                              if (invoice.amount_refunded >= invoice.amount) {
                                return 'Refunded';
                              } else {
                                return 'Partially Refunded';
                              }
                            }
                            // Handle standard statuses
                            switch (invoice.status.toLowerCase()) {
                              case 'paid':
                              case 'success':
                                return 'Paid';
                              case 'open':
                                return 'Open';
                              case 'draft':
                                return 'Draft';
                              case 'void':
                                return 'Voided';
                              case 'uncollectible':
                                return 'Uncollectible';
                              default:
                                return invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
                            }
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleDownloadInvoice(invoice.invoice_pdf)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleDownloadInvoice(invoice.invoice_pdf)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* COMMENTED OUT: Compare Plans Modal - feature temporarily disabled */}
      {/* <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Plans</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {/* Plans comparison table */}
            {/* <div className={`grid gap-4`} style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${plans.length}, 1fr)` }}>
              {/* Header Row */}
              {/* <div className="font-semibold text-gray-900 dark:text-white">Features</div>
              {plans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => (
                <div key={plan.id} className="text-center">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{plan.display_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ${plan.price_per_month} / user / month
                  </p>
                </div>
              ))}

              {/* Divider */}
              {/* <div className="border-b border-gray-200 dark:border-gray-700 my-2" style={{ gridColumn: `1 / -1` }}></div>

              {/* Feature Rows */}
              {/* {(() => {
                // Collect all unique features from all plans
                const allFeatures = new Set<string>();
                plans.forEach(plan => {
                  const featuresArray = Array.isArray(plan.features?.features) ? plan.features.features : [];
                  console.log('Plan:', plan.display_name, 'Features:', featuresArray);
                  featuresArray.forEach((feature: string) => allFeatures.add(feature));
                });

                console.log('All unique features:', Array.from(allFeatures));

                if (allFeatures.size === 0) {
                  return (
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4" style={{ gridColumn: '1 / -1' }}>
                      No features found for comparison
                    </div>
                  );
                }

                return Array.from(allFeatures).map((feature, idx) => (
                  <React.Fragment key={idx}>
                    <div className="text-sm text-gray-700 dark:text-gray-300 py-2">{feature}</div>
                    {plans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => {
                      const planFeatures = Array.isArray(plan.features?.features) ? plan.features.features : [];
                      const hasFeature = planFeatures.includes(feature);
                      return (
                        <div key={plan.id} className="flex justify-center items-center py-2">
                          {hasFeature ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ));
              })()} */}
            {/* </div>
          </div>
        </DialogContent>
      </Dialog> */}
    </div>
    </div>
  );
};
