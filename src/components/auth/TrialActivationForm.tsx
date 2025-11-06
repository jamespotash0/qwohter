/**
 * Trial Activation Form Component
 * Gives users choice to activate 14-day trial or choose a billing plan
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, CreditCard, Check } from "lucide-react";

interface TrialActivationFormProps {
  loading: boolean;
  onActivateTrial: () => void;
  onChoosePlan: () => void;
}

export const TrialActivationForm: React.FC<TrialActivationFormProps> = ({
  loading,
  onActivateTrial,
  onChoosePlan
}) => {
  const trialFeatures = [
    'Full access to all features',
    'Unlimited quotes and projects',
    'Team collaboration tools',
    'Advanced analytics',
    'Priority email support',
    'No credit card required'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Qwohter!</h2>
        <p className="text-gray-600 text-base">
          You're all set! Choose how you'd like to get started.
        </p>
      </div>

      {/* Two Options Side by Side */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Free Trial Option */}
        <Card className="relative overflow-hidden border-2 border-[#EE6C4D] shadow-lg hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 bg-[#EE6C4D] text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
            RECOMMENDED
          </div>

          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Start Free Trial</CardTitle>
            <CardDescription className="text-gray-600 text-sm mt-2">
              14 days of full access
            </CardDescription>

            {/* Price */}
            <div className="mt-4 h-16 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-gray-900">
                $0
                <span className="text-lg font-normal text-gray-600">/14 days</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                No credit card required
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-6">
            {/* Features */}
            <ul className="space-y-2.5">
              {trialFeatures.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <Check className="w-4 h-4 text-emerald-600 mr-2.5 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <Button
              onClick={onActivateTrial}
              disabled={loading}
              className="w-full h-12 bg-[#EE6C4D] hover:bg-[#d85a3d] text-white font-semibold text-base shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <span>Activating...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>Activate Free Trial</span>
                </>
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 mt-2">
              Cancel anytime during trial period
            </p>
          </CardContent>
        </Card>

        {/* Choose Plan Option */}
        <Card className="relative overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Choose a Plan</CardTitle>
            <CardDescription className="text-gray-600 text-sm mt-2">
              Subscribe and get started immediately
            </CardDescription>

            {/* Price */}
            <div className="mt-4 h-16 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-gray-900">
                Starting at $19.99
                <span className="text-sm font-normal text-gray-600">/month</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Per user, billed monthly
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pb-6">
            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-700">
                Skip the trial and subscribe to a paid plan to get:
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-start text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Immediate access (no waiting period)</span>
                </li>
                <li className="flex items-start text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>All features unlocked</span>
                </li>
                <li className="flex items-start text-xs text-gray-600">
                  <Check className="w-3.5 h-3.5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Priority support included</span>
                </li>
              </ul>
            </div>

            {/* CTA Button */}
            <Button
              onClick={onChoosePlan}
              disabled={loading}
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-base"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              <span>View Plans & Pricing</span>
            </Button>

            <p className="text-xs text-center text-gray-500 mt-2">
              14-day free trial included with all plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Note */}
      <p className="text-center text-sm text-gray-500">
        You can change your plan or cancel anytime from Settings
      </p>
    </div>
  );
};
