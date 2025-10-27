import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Download, Search, Filter, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  stripe_price_id_annual: string;
  price_monthly: number;
  price_annual: number;
  features: any;
  is_active: boolean;
  sort_order: number;
}

// Initialize Stripe.js
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string);

export const BillingTab: React.FC<BillingTabProps> = ({
  organization,
  userRole
}) => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const hasPermission = hasOwnerPermissions(userRole);

  useEffect(() => {
    if (organization?.id && hasPermission) {
      loadBillingData();
    } else {
      setLoading(false);
    }
  }, [organization?.id, hasPermission]);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Load subscription
      const { data: subData, error: subError} = await stripeService.getSubscription(organization.id);
      if (subError) {
        console.error('Error loading subscription:', subError);
      } else {
        console.log('Loaded subscription:', subData);
        setSubscription(subData);
      }

      // Calculate user count
      const { quantity } = await stripeService.calculateSubscriptionQuantity(organization.id);
      setUserCount(quantity);

      // Load invoices from Stripe
      const { data: invoiceData, error: invoiceError } = await stripeService.getInvoices(organization.id);
      if (!invoiceError && invoiceData) {
        setInvoices(invoiceData);
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
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
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
        : plan.stripe_price_id_annual;

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
      return plan.price_monthly;
    }
    // For annual, show the monthly equivalent
    return (plan.price_annual / 12).toFixed(2);
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
    <div className="max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Billing & Subscription
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Keep track of your subscription details, update your billing information, and control your account's payment
        </p>
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('annual')}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'annual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const features = plan.features?.features || [];
          const isCurrent = isCurrentPlan(plan);
          const isProcessing = processingPlan === plan.id;
          const isSoloPlan = plan.name === 'Solo';
          const displayPrice = getDisplayPrice(plan);

          return (
            <Card
              key={plan.id}
              className={`relative ${isCurrent ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''} ${
                isSoloPlan ? 'border-orange-200 dark:border-orange-800' : ''
              }`}
            >
              {plan.name === 'Solo' && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-orange-500 text-white border-0">
                    FREE
                  </Badge>
                </div>
              )}

              {plan.name === 'Team' && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-orange-600 text-white border-0">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      PRO
                    </span>
                  </Badge>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-3 left-4">
                  <Badge className="bg-green-500 text-white border-0">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      CURRENT PLAN
                    </span>
                  </Badge>
                </div>
              )}

              <CardContent className="pt-8 pb-6">
                <div className="space-y-6">
                  {/* Plan Name */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {plan.display_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isSoloPlan && `1 user included`}
                      {!isSoloPlan && `${userCount} active users`}
                    </p>
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${displayPrice}
                      </span>
                      <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">
                        /month
                      </span>
                    </div>
                    {billingInterval === 'annual' && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Billed annually (${plan.price_annual.toFixed(2)}/year)
                      </p>
                    )}
                    {!isSoloPlan && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Per user pricing
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900"
                      onClick={() => handleUpgradePlan(plan)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Upgrade Plan'
                      )}
                    </Button>
                  )}

                  {/* Features List */}
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
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
    </div>
  );
};
