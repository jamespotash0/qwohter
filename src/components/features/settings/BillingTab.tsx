import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Download, Search, Filter, Check, ArrowLeftRight, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { hasOwnerPermissions } from "@/utils/permissions";
import { stripeService } from "@/services/stripeService";
import { formatDateEST } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from '@stripe/stripe-js';

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
}

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

// Initialize Stripe.js
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

export const BillingTab: React.FC<BillingTabProps> = ({
  organization,
  userRole
}) => {
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
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const hasPermission = hasOwnerPermissions(userRole);

  useEffect(() => {
    if (organization?.id && hasPermission) {
      loadBillingData();
    } else {
      setLoading(false);
    }
  }, [organization?.id, hasPermission]);

  // Realtime subscription for subscription_plans
  useEffect(() => {
    const channel = supabase
      .channel('subscription_plans_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscription_plans'
        },
        (payload) => {
          console.log('Subscription plans changed:', payload);
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime subscription for subscriptions table
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel('subscriptions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `organization_id=eq.${organization.id}`
        },
        async (payload) => {
          console.log('Subscription changed:', payload);
          // Reload subscription data
          const { data: subData, error: subError } = await stripeService.getSubscription(organization.id);
          if (!subError && subData) {
            setSubscription(subData);
            // Update cache
            try {
              localStorage.setItem('billing_subscription_cache', JSON.stringify(subData));
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id]);

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
          localStorage.setItem('billing_subscription_cache', JSON.stringify(subData));
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

      // Determine the appropriate price ID based on billing interval
      const priceId = billingInterval === 'monthly'
        ? plan.stripe_price_id_monthly
        : plan.stripe_price_id_yearly;

      if (!priceId || priceId.includes('placeholder')) {
        toast({
          title: "Setup Required",
          description: "Please configure Stripe product IDs first. Check STRIPE_SETUP_GUIDE.md",
          variant: "destructive",
        });
        setProcessingPlan(null);
        return;
      }

      // For Solo plan, quantity is always 1
      // For Team plan, use the actual user count
      const quantity = plan.name === 'Solo' ? 1 : userCount;

      // Create checkout session and redirect to Stripe
      const { error } = await stripeService.createCheckoutSession({
        organizationId: organization.id,
        planId: plan.id,
        priceId: priceId,
        successUrl: `${window.location.origin}/dashboard/settings?tab=billing&success=true`,
        cancelUrl: `${window.location.origin}/dashboard/settings?tab=billing&canceled=true`,
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
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(inv => inv.id));
    }
  };

  const formatDate = (dateString: string): string => {
    return formatDateEST(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayPrice = (plan: SubscriptionPlan) => {
    if (billingInterval === 'monthly') {
      return plan.price_per_month;
    }
    // For annual, show the monthly equivalent
    const monthlyEquivalent = plan.price_per_yearly / 12;
    return Number.isInteger(monthlyEquivalent) ? monthlyEquivalent : monthlyEquivalent.toFixed(2);
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    return subscription?.plan_id === plan.id;
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
      <div className="space-y-8">
        {/* Header with Toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan & Billing</h2>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setShowCompareModal(true)}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Compare plans
              </Button>
              {/* Billing Interval Toggle */}
              <div className="inline-flex h-9 rounded-md border border-gray-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-900">
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-3 rounded-sm text-sm font-medium transition-all ${
                    billingInterval === 'monthly'
                      ? 'bg-[#EE6C4D] text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('annual')}
                  className={`px-3 rounded-sm text-sm font-medium transition-all ${
                    billingInterval === 'annual'
                      ? 'bg-[#EE6C4D] text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>
        </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {plans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => {
          // Extract features array from JSONB structure
          const featuresArray = Array.isArray(plan.features?.features)
            ? plan.features.features
            : [];
          const isCurrent = isCurrentPlan(plan);
          const isProcessing = processingPlan === plan.id;
          const isSoloPlan = plan.name === 'Solo';
          const displayPrice = getDisplayPrice(plan);

          return (
            <Card
              key={plan.id}
              className="relative card-elevated bg-gray-100 dark:bg-gray-800 border-0 hover:shadow-none hover:transform-none"
            >
              <CardContent className="pt-6 pb-5">
                <div className="space-y-4">
                  {/* Plan Name */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {plan.display_name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        ${displayPrice}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        / user / month
                      </span>
                    </div>
                    {billingInterval === 'annual' && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        Billed annually (${Number.isInteger(plan.price_per_yearly) ? plan.price_per_yearly : plan.price_per_yearly.toFixed(2)}{!isSoloPlan ? ' per user' : ''}/year)
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <Button
                      className="w-full bg-white dark:bg-gray-900 text-black dark:text-white cursor-default border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900"
                      onClick={(e) => e.preventDefault()}
                    >
                      Current plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-[#EE6C4D] hover:bg-[#d85a3d] text-white flex items-center justify-center gap-2"
                      onClick={() => handleUpgradePlan(plan)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>Switch plan</span>
                        </>
                      )}
                    </Button>
                  )}

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
                      checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plan Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amounts
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Purchase Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    End Date
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
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-4">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white font-medium">
                        {invoice.plan_name || 'Solo Plan'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">
                        $ {invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.billing_date)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.period_end)}
                      </td>
                      <td className="px-4 py-4">
                        {invoice.status === 'paid' || invoice.status === 'Success' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              Success
                            </span>
                          </Badge>
                        ) : invoice.status === 'Processing' ? (
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-0">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                              Processing
                            </span>
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {invoice.status}
                          </Badge>
                        )}
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
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Compare Plans Modal */}
      <Dialog open={showCompareModal} onOpenChange={setShowCompareModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Plans</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {/* Plans comparison table */}
            <div className="grid grid-cols-3 gap-4">
              {/* Header Row */}
              <div className="font-semibold text-gray-900 dark:text-white">Features</div>
              {plans.sort((a, b) => a.sort_order - b.sort_order).map((plan) => (
                <div key={plan.id} className="text-center">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{plan.display_name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ${billingInterval === 'monthly' ? plan.price_per_month : (() => {
                      const monthlyEquivalent = plan.price_per_yearly / 12;
                      return Number.isInteger(monthlyEquivalent) ? monthlyEquivalent : monthlyEquivalent.toFixed(2);
                    })()} / user / month
                  </p>
                </div>
              ))}

              {/* Divider */}
              <div className="col-span-3 border-b border-gray-200 dark:border-gray-700 my-2"></div>

              {/* Feature Rows */}
              {(() => {
                // Collect all unique features from all plans
                const allFeatures = new Set<string>();
                plans.forEach(plan => {
                  const featuresArray = Array.isArray(plan.features?.features) ? plan.features.features : [];
                  featuresArray.forEach((feature: string) => allFeatures.add(feature));
                });

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
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
};
