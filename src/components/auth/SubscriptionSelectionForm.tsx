/**
 * Subscription Selection Form Component
 * Beautiful pricing page for onboarding flow
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionSelectionFormProps {
  loading: boolean;
  onSelectPlan: (planName: string, billingPeriod: 'monthly' | 'yearly') => void;
  onSkip: () => void;
}

export const SubscriptionSelectionForm: React.FC<SubscriptionSelectionFormProps> = ({
  loading,
  onSelectPlan,
  onSkip
}) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Starter',
      displayName: 'Free',
      description: '14 days of full access',
      price: { monthly: 0, yearly: 0 },
      perUser: false,
      icon: Sparkles,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      features: [
        'Unlimited users',
        'Unlimited quotes',
        'All templates',
        'Email support'
      ],
      popular: false,
      cta: 'Register for Free'
    },
    {
      name: 'Professional',
      displayName: 'Professional',
      description: 'Per-user pricing for teams',
      price: { monthly: 12.99, yearly: 9.99 },
      perUser: true,
      icon: Zap,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      features: [
        'Everything in Free',
        'Priority support',
        'Advanced analytics',
        'Dedicated account manager'
      ],
      popular: true,
      cta: 'Get Started'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
        <p className="text-gray-600 text-base">
          Start with a free trial or go straight to Professional
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 rounded-lg p-1 relative">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              "px-8 py-2 rounded-md text-sm font-medium transition-all",
              billingPeriod === 'monthly'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              "px-8 py-2 rounded-md text-sm font-medium transition-all",
              billingPeriod === 'yearly'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Yearly
          </button>
          <span className="absolute -top-2 right-2 bg-orange-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
            Save 23%
          </span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = billingPeriod === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const isYearly = billingPeriod === 'yearly';

          return (
            <Card
              key={plan.name}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg flex flex-col",
                plan.popular
                  ? "border-2 border-orange-600 shadow-md"
                  : "border-gray-200"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-orange-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}

              <CardHeader className="text-center pb-4 pt-6">
                <div className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3",
                  plan.bgColor
                )}>
                  <Icon className={cn("w-8 h-8", plan.iconColor)} />
                </div>
                <CardTitle className="text-2xl text-gray-900">{plan.displayName}</CardTitle>
                <CardDescription className="text-gray-600 text-sm mt-2">
                  {plan.description}
                </CardDescription>

                {/* Price */}
                <div className="mt-4 h-20 flex flex-col items-center justify-center">
                  <div className="space-y-1">
                    <div className="text-4xl font-bold text-gray-900">
                      ${price.toFixed(2)}
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      per user {isYearly && <span className="text-gray-600">(billed annually)</span>}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-grow space-y-4 pb-6">
                {/* Features */}
                <ul className="space-y-3 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-emerald-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => onSelectPlan(plan.name, billingPeriod)}
                  disabled={loading}
                  className={cn(
                    "w-full h-12 font-semibold text-base transition-all mt-auto",
                    plan.popular
                      ? "bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg"
                      : "bg-slate-700 hover:bg-slate-800 text-white"
                  )}
                >
                  {loading ? "Processing..." : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
