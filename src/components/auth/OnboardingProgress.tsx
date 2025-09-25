/**
 * Onboarding Progress Indicator Component
 *
 * Shows current step progress with visual indicators
 */

import React from "react";

type StepType = "auth" | "verify-otp" | "organization" | "company-info";

interface OnboardingProgressProps {
  currentStep: StepType;
  isSignUp: boolean;
}

interface StepInfo {
  key: StepType;
  label: string;
  shortLabel: string;
}

const SIGNUP_STEPS: StepInfo[] = [
  { key: "auth", label: "Account", shortLabel: "Account" },
  { key: "verify-otp", label: "Verify Email", shortLabel: "Verify" },
  { key: "organization", label: "Organization", shortLabel: "Org" },
  { key: "company-info", label: "Company Details", shortLabel: "Details" },
];

const SIGNIN_STEPS: StepInfo[] = [
  { key: "auth", label: "Sign In", shortLabel: "Sign In" },
  { key: "verify-otp", label: "Verify", shortLabel: "Verify" },
];

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  isSignUp
}) => {
  const steps = isSignUp ? SIGNUP_STEPS : SIGNIN_STEPS;
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  // Calculate progress percentage
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="w-full max-w-lg mx-auto mb-8">
      {/* Progress Bar */}
      <div className="relative">
        {/* Background bar with shadow */}
        <div className="w-full h-2 bg-gray-200 rounded-full shadow-inner">
          {/* Progress fill */}
          <div
            className="h-full bg-slate-600 rounded-full transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Progress Text */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 font-medium">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
};