import { CheckCircle2 } from "lucide-react";
import { WizardStep } from '../types/wizardTypes';

interface StepNavigationProps {
  steps: WizardStep[];
  activeStep: number;
  onStepChange: (stepIndex: number) => void;
}

export const StepNavigation = ({ steps, activeStep, onStepChange }: StepNavigationProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = step.isValid;
            const isPast = index < activeStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => onStepChange(index)}
                  className={`
                    flex items-center gap-2.5 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 shadow-sm'
                      : isCompleted
                        ? 'bg-emerald-50 border border-emerald-200 hover:shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }
                  `}
                >
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                    ${isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span className={`
                    font-medium text-sm
                    ${isActive ? 'text-indigo-900' : isCompleted ? 'text-emerald-900' : 'text-slate-700'}
                  `}>
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 ${isPast || isCompleted ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
    </div>
  );
};