import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, Download, ArrowLeftRight, MoreVertical, Search, Filter, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { hasOwnerPermissions } from "@/utils/permissions";
import { stripeService } from "@/services/stripeService";
import { formatDateEST } from "@/utils/dateUtils";
import { supabase } from "@/integrations/supabase/client";

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
}

export const BillingTab: React.FC<BillingTabProps> = ({
  organization,
  userRole
}) => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [userCount, setUserCount] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
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
        setCurrentPlanId(subData?.plan_id || null);
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

  const handleSwitchPlan = async (planName: string) => {
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You need Owner permissions to change billing settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      await stripeService.createPortalSession({
        organizationId: organization.id,
        returnUrl: window.location.href,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch plan",
        variant: "destructive",
      });
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
    <div className="max-w-7xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Plan</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage your plan and billing history here.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-9 px-4"
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Compare plans
            </Button>
          </div>
        </div>

        {/* Debug info */}
        {plans.length === 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No plans found. Plans array length: {plans.length}
            </p>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((planItem) => {
            const isCurrent = planItem.id === currentPlanId;

            // Handle features - could be object with base_price or array of strings
            const features = planItem.features || {};
            const hasStructuredFeatures = typeof features === 'object' && 'base_price' in features;

            // Get pricing - either from features.base_price or hardcoded based on plan name
            let price = 0;
            let maxUsers: number | null = null;
            let bandwidth = 'Unlimited';

            if (hasStructuredFeatures) {
              price = features.base_price || 0;
              maxUsers = features.max_users;
              bandwidth = features.bandwidth || 'Unlimited';
            } else {
              // Fallback for plans without structured pricing
              if (planItem.name === 'Free') {
                price = 0;
                maxUsers = null;
                bandwidth = 'Unlimited';
              } else if (planItem.name === 'Professional' || planItem.name === 'Core') {
                price = 99;
                maxUsers = 10;
                bandwidth = '200 GB';
              } else if (planItem.name === 'Growth') {
                price = 399;
                maxUsers = 20;
                bandwidth = '500 GB';
              } else if (planItem.name === 'Unlimited') {
                price = 799;
                maxUsers = null;
                bandwidth = '2 TB';
              }
            }

            return (
              <Card key={planItem.id} className="relative">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {planItem.display_name || planItem.name}
                        </h3>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                            >
                              <Info className="w-4 h-4 text-gray-400" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">{planItem.display_name || planItem.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {planItem.description || 'No description available.'}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {maxUsers ? `${maxUsers} seats` : 'Unlimited seats'} and {bandwidth}.
                      </p>
                    </div>

                    <div>
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${price}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        per month
                      </span>
                    </div>

                    {isCurrent ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        Current plan
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => handleSwitchPlan(planItem.name)}
                        disabled
                      >
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        Switch plan
                      </Button>
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Billing history
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {invoices.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search"
                  className="pl-9 pr-12 w-64 h-9"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-gray-100 px-1.5 font-mono text-[10px] font-medium text-gray-600 opacity-100">
                  ⌘K
                </kbd>
              </div>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleDownloadSelected}
                disabled={selectedInvoices.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Download all
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Selected count bar */}
            {selectedInvoices.length > 0 && (
              <div className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={true}
                    onCheckedChange={toggleSelectAll}
                    className="border-white"
                  />
                  <span className="text-sm font-medium">
                    {selectedInvoices.length} invoices selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-gray-800"
                    onClick={handleDownloadSelected}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-gray-800"
                    onClick={handleDownloadSelected}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}

            {/* Table content */}
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
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Billing date ↕
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-4 py-3 text-left w-12"></th>
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
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">PDF</span>
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">
                              Invoice_{formatDate(invoice.billing_date).replace(/\s/g, '_')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(invoice.billing_date)}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            {invoice.plan_name || 'Core'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {userCount}
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDownloadInvoice(invoice.invoice_pdf)}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
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
      </div>
    </div>
  );
};
