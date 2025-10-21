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
      const paidPlans = (plansData?.filter((plan) => plan.name !== 'Free') || []).map(plan => ({
        ...plan as object,
        // Parse features if it's a string (JSONB from database)
        features: typeof plan.features === 'string'
          ? JSON.parse(plan.features)
          : Array.isArray(plan.features)
            ? plan.features
            : []
      }));
      setPlans(paidPlans as any);
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header with logo */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate('/dashboard')}
            >
              <img
                src="/logos/Landing_Page_Logo_Light.svg"
                alt="Qwohter Logo"
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Background pattern with quote checkerboard design */}
      <div className="absolute inset-0">
        {/* Repeating quotation marks in checkerboard pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='30' y='60' font-family='serif' font-size='60' fill='%23334155' opacity='0.5'%3E%22%3C/text%3E%3Ctext x='90' y='60' font-family='serif' font-size='60' fill='%23f97316' opacity='0.4'%3E%22%3C/text%3E%3Ctext x='60' y='30' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3Ctext x='60' y='90' font-family='serif' font-size='60' fill='%23334155' opacity='0.3'%3E%22%3C/text%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Alternating quotation pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='15' y='45' font-family='serif' font-size='40' fill='%23475569' opacity='0.6' transform='rotate(15)'%3E%E2%80%9C%3C/text%3E%3Ctext x='75' y='75' font-family='serif' font-size='40' fill='%23475569' opacity='0.6' transform='rotate(-15)'%3E%E2%80%9D%3C/text%3E%3C/svg%3E")
            `,
            backgroundSize: '120px 120px',
            backgroundRepeat: 'repeat',
            backgroundPosition: '60px 60px'
          }}
        />

        {/* Subtle gradient orbs for depth */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-100/6 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-100/4 rounded-full blur-3xl" />
      </div>

      <div className="min-h-screen flex items-center justify-center p-8 pt-24">
        <div className="w-full max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Select the perfect plan for your organization and start creating beautiful quotes
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billingCycle === 'yearly'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">
                Save 23%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-col items-center gap-6 mb-10">
          {plans.map((plan) => {
            const pricePerUser = billingCycle === 'yearly' ? 9.99 : 12.99;
            const isProcessing = processingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className="relative bg-white border-2 border-gray-100 hover:border-orange-400 hover:shadow-2xl transition-all duration-300 w-full max-w-md shadow-lg"
              >
                <CardHeader className="pb-6 pt-8 px-8">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl font-bold text-gray-900">{plan.display_name}</CardTitle>
                    <CardDescription className="text-base text-gray-500 leading-relaxed">{plan.description}</CardDescription>
                  </div>

                  <div className="mt-8 pb-6 border-b border-gray-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-gray-900">
                        ${pricePerUser}
                      </span>
                      <span className="text-base text-gray-500 font-medium">
                        /user/{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    <div className="h-6 mt-3">
                      {billingCycle === 'yearly' && (
                        <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Billed annually • Save 23%
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Everything included:</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-green-600 stroke-[3]" />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isProcessing}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Get Started
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
            className="text-gray-500 hover:text-gray-900 text-sm font-medium"
          >
            I'll choose later
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
