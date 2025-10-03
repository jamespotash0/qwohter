import React, { useState } from 'react';
import { CreditCard, Calendar, TrendingUp, Download, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { hasAdminPermissions } from "@/utils/permissions";

interface BillingTabProps {
  organization: any;
  userRole: string;
}

// Mock data - replace with actual API calls
const CURRENT_PLAN = {
  name: 'Professional',
  price: 99,
  interval: 'month',
  renewal_date: '2025-11-03',
  status: 'active'
};

const AVAILABLE_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    interval: 'month',
    features: [
      'Up to 50 quotes per month',
      'Basic templates',
      'Email support',
      '1 user'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    interval: 'month',
    features: [
      'Unlimited quotes',
      'Custom templates',
      'Priority support',
      'Up to 5 users',
      'Custom branding'
    ],
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Everything in Professional',
      'Unlimited users',
      'Advanced analytics',
      'Dedicated support',
      'API access',
      'Custom integrations'
    ]
  }
];

const BILLING_HISTORY = [
  {
    id: '1',
    date: '2025-10-03',
    amount: 99,
    status: 'paid',
    invoice_url: '#'
  },
  {
    id: '2',
    date: '2025-09-03',
    amount: 99,
    status: 'paid',
    invoice_url: '#'
  },
  {
    id: '3',
    date: '2025-08-03',
    amount: 99,
    status: 'paid',
    invoice_url: '#'
  }
];

export const BillingTab: React.FC<BillingTabProps> = ({
  organization,
  userRole
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const hasPermission = hasAdminPermissions(userRole);

  const handleUpgrade = (planId: string) => {
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "You need Admin or Owner permissions to change billing settings.",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement Stripe checkout
    toast({
      title: "Upgrade Plan",
      description: `Upgrading to ${planId} plan...`,
    });
  };

  const handleDownloadInvoice = (invoiceUrl: string) => {
    // TODO: Implement invoice download
    toast({
      title: "Downloading Invoice",
      description: "Your invoice will download shortly.",
    });
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
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-[var(--content-header-text)]">
                    {CURRENT_PLAN.name}
                  </h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                </div>
                <p className="text-3xl font-bold text-[var(--content-header-text)] mb-4">
                  {formatCurrency(CURRENT_PLAN.price)}
                  <span className="text-base font-normal text-gray-600">/{CURRENT_PLAN.interval}</span>
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Renews on {formatDate(CURRENT_PLAN.renewal_date)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                  onClick={() => handleUpgrade('upgrade')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancel Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <div className="pb-8">
        <h2 className="text-lg font-semibold text-[var(--content-header-text)] mb-6 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Billing History
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {BILLING_HISTORY.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full capitalize">
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.invoice_url)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
