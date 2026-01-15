/**
 * Onboarding Progress Indicator Component - Redesigned
 *
 * Elegant step indicator with visual progress
 * Clean, minimal design that doesn't distract from content
 */

import React from "react";
import { Check } from "lucide-react";

type StepType = "auth" | "signup-recovery" | "verify-otp" | "organization" | "company-info" | "subscription";

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
  { key: "verify-otp", label: "Verify", shortLabel: "Verify" },
  { key: "organization", label: "Organization", shortLabel: "Org" },
  { key: "company-info", label: "Details", shortLabel: "Details" },
];

const INVITE_SIGNUP_STEPS: StepInfo[] = [
  { key: "auth", label: "Account", shortLabel: "Account" },
  { key: "verify-otp", label: "Verify", shortLabel: "Verify" },
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
  const steps = isInvitee ? INVITE_SIGNUP_STEPS : (isSignUp ? SIGNUP_STEPS : SIGNIN_STEPS);
  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300 font-semibold text-sm
                    ${isCompleted
                      ? 'bg-[#ee6c4d] text-white'
                      : isCurrent
                        ? 'bg-[#ee6c4d]/10 text-[#ee6c4d] border-2 border-[#ee6c4d]'
                        : 'bg-[#f7f2e9] text-[#171717]/40 border-2 border-[#171717]/10'
                    }
                  `}
                  style={{ fontFamily: 'Urbanist, sans-serif' }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" strokeWidth={3} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`
                    mt-2 text-xs font-medium transition-colors duration-300
                    ${isCompleted || isCurrent ? 'text-[#171717]' : 'text-[#171717]/40'}
                  `}
                  style={{ fontFamily: 'Urbanist, sans-serif' }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-6 relative overflow-hidden bg-[#171717]/10 rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#ee6c4d] transition-all duration-500 ease-out rounded-full"
                    style={{
                      width: index < currentStepIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
