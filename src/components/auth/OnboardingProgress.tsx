/**
 * Onboarding Progress Indicator Component
 *
 * Shows current step progress with visual indicators
 */

import React from "react";
import { Check } from "lucide-react";

type StepType = "auth" | "verify-otp" | "profile" | "organization" | "company-info";

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
  { key: "profile", label: "Profile", shortLabel: "Profile" },
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

  return (
    <div className="w-full max-w-lg mx-auto mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Step Circle */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10
                    ${isCompleted
                      ? "bg-slate-600 border-slate-600 text-white shadow-sm"
                      : isCurrent
                        ? "bg-white border-slate-600 text-slate-600 shadow-lg ring-4 ring-slate-100"
                        : "bg-gray-100 border-gray-300 text-gray-400"
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Label */}
                <div className="mt-2 text-center max-w-16 sm:max-w-20">
                  <div
                    className={`
                      text-xs font-medium transition-colors duration-300 leading-tight
                      ${isCompleted || isCurrent
                        ? "text-slate-700"
                        : "text-gray-400"
                      }
                    `}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </div>
                </div>
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-px mx-1 sm:mx-2 mt-[-24px] sm:mt-[-28px] relative">
                  <div
                    className={`
                      h-0.5 transition-colors duration-300
                      ${isCompleted
                        ? "bg-slate-600"
                        : "bg-gray-300"
                      }
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 font-medium">
          Step {currentStepIndex + 1} of {steps.length}
        </p>
        {isSignUp && currentStep !== "auth" && (
          <p className="text-xs text-gray-500 mt-1">Creating your account</p>
        )}
      </div>
    </div>
  );
};