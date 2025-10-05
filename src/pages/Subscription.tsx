import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { stripeService } from '@/services/stripeService';
import { supabase } from '@/integrations/supabase/client';

interface PricingPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: string[];
  is_active: boolean;
}

export default function Subscription() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userCount, setUserCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadPlansAndOrganization();
  }, []);

  const loadPlansAndOrganization = async () => {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'Active')
        .single();

      if (!membership?.organization_id) {
        toast({
          title: 'No Organization Found',
          description: 'Please create an organization first.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setOrganizationId(membership.organization_id);

      // Calculate user count for pricing
      const { quantity } = await stripeService.calculateSubscriptionQuantity(
        membership.organization_id
      );
      setUserCount(quantity);

      // Load available plans
      const { data: plansData, error } = await stripeService.getPlans();
      if (error) {
        toast({
          title: 'Error Loading Plans',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      // Filter out Free plan (we only show paid plans here)
      const paidPlans = plansData?.filter((plan) => plan.name !== 'Free') || [];
      setPlans(paidPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load subscription plans',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!organizationId) return;

    // Free plan - just create subscription and navigate to dashboard
    if (plan.name === 'Free') {
      try {
        setProcessingPlan(plan.id);

        // Create free subscription in database
        const { error } = await stripeService.createSubscription({
          organizationId,
          planId: plan.id,
        });

        if (error) {
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Free Trial Started',
          description: '30-day free trial activated!',
        });

        navigate('/dashboard');
      } catch (error) {
        console.error('Error creating free subscription:', error);
        toast({
          title: 'Error',
          description: 'Failed to start free trial',
          variant: 'destructive',
        });
      } finally {
        setProcessingPlan(null);
      }
      return;
    }

    // Paid plan - redirect to Stripe Checkout
    const priceId =
      billingCycle === 'yearly'
        ? plan.stripe_price_id_yearly
        : plan.stripe_price_id_monthly;

    if (!priceId) {
      toast({
        title: 'Configuration Error',
        description: 'This plan is not properly configured. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessingPlan(plan.id);

      // Create Stripe Checkout session
      const { error } = await stripeService.createCheckoutSession({
        organizationId,
        planId: plan.id,
        priceId,
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/subscription?canceled=true`,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        setProcessingPlan(null);
      }
      // Don't set processingPlan to null here - user is redirecting to Stripe
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout',
        variant: 'destructive',
      });
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Select the perfect plan for your organization
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-2 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Save 23%
              </span>
            </button>
          </div>

          {/* User Count Display */}
          <div className="mt-6 inline-flex items-center gap-2 text-gray-700">
            <Users className="w-5 h-5" />
            <span>
              Your organization has <strong>{userCount}</strong> active{' '}
              {userCount === 1 ? 'user' : 'users'}
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const pricePerUser = billingCycle === 'yearly' ? 9.99 : 12.99;
            const totalPrice = pricePerUser * userCount;
            const isProcessing = processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className="relative hover:shadow-xl transition-shadow border-2 hover:border-blue-500"
              >
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.display_name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-4xl font-bold text-gray-900">
                      ${totalPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${pricePerUser}/{billingCycle === 'yearly' ? 'user/year' : 'user/month'}
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        Billed annually at ${(totalPrice * 12).toFixed(2)}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Select Plan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Skip Option */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-gray-600"
          >
            I'll choose later
          </Button>
        </div>
      </div>
    </div>
  );
}
