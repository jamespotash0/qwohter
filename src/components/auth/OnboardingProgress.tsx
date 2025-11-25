/**
 * Onboarding Progress Indicator Component
 *
 * Shows current step progress with visual indicators
 */

import React from "react";

type StepType = "auth" | "verify-otp" | "organization" | "company-info" | "subscription";

interface OnboardingProgressProps {
  currentStep: StepType;
  isSignUp: boolean;
  isInvitee?: boolean;
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

const INVITE_SIGNUP_STEPS: StepInfo[] = [
  { key: "auth", label: "Create Account", shortLabel: "Account" },
  { key: "verify-otp", label: "Verify Email", shortLabel: "Verify" },
];

const SIGNIN_STEPS: StepInfo[] = [
  { key: "auth", label: "Sign In", shortLabel: "Sign In" },
  { key: "verify-otp", label: "Verify", shortLabel: "Verify" },
];

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  isSignUp,
  isInvitee = false
}) => {
  // Determine which steps to show based on user type
  const steps = isInvitee ? INVITE_SIGNUP_STEPS : (isSignUp ? SIGNUP_STEPS : SIGNIN_STEPS);
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  // Show consistent step count throughout the flow
  const displayStepNumber = currentStepIndex + 1;
  const displayTotalSteps = steps.length;
  const progressPercentage = (displayStepNumber / displayTotalSteps) * 100;

  return (
    <div className="w-full max-w-lg mx-auto mb-6">
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
      <div className="mt-3 text-center">
        <p className="text-sm text-gray-600 font-medium">
          Step {displayStepNumber} of {displayTotalSteps}
        </p>
      </div>
    </div>
  );
};