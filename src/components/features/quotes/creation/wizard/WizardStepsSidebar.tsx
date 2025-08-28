import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useWizard } from './WizardProvider';

/**
 * WizardStepsSidebar Component
 * Visual navigation sidebar showing all wizard steps with progress indicators
 * 
 * Features:
 * - Visual step progress
 * - Click-to-navigate functionality
 * - Completion status indicators
 * - Active step highlighting
 * - Responsive design
 */
export const WizardStepsSidebar: React.FC = () => {
  const { activeStep, steps, goToStep, completedSteps } = useWizard();

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-50 to-gray-100 border border-slate-200">
      {/* Progress Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Quote Creation Progress
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{completedSteps} of {steps.length} completed</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedSteps / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isCompleted = step.isValid;
          const StepIcon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all duration-200 border",
                isActive 
                  ? "bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-sm" 
                  : "hover:bg-slate-50 border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Step Status Icon */}
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  isCompleted 
                    ? "bg-emerald-500 text-white" 
                    : isActive 
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-300 text-gray-600"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Step Info */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium truncate",
                    isActive ? "text-indigo-900" : "text-gray-900"
                  )}>
                    {step.label}
                  </div>
                  <div className={cn(
                    "text-xs truncate mt-0.5",
                    isActive ? "text-indigo-600" : "text-gray-500"
                  )}>
                    {step.description}
                  </div>
                </div>

                {/* Step Number */}
                <div className={cn(
                  "text-xs font-medium px-2 py-1 rounded-md",
                  isActive 
                    ? "bg-indigo-100 text-indigo-700" 
                    : "bg-gray-100 text-gray-500"
                )}>
                  {index + 1}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Completion Status */}
      {completedSteps === steps.length && (
        <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">All steps completed!</span>
          </div>
          <p className="text-xs text-emerald-600 mt-1">
            Ready to save your quote
          </p>
        </div>
      )}
    </Card>
  );
};