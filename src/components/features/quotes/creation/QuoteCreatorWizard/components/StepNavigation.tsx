import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Zap } from "lucide-react";
import { WizardStep } from '../types/wizardTypes';

interface StepNavigationProps {
  steps: WizardStep[];
  activeStep: number;
  onStepChange: (stepIndex: number) => void;
}

export const StepNavigation = ({ steps, activeStep, onStepChange }: StepNavigationProps) => {
  return (
    <div className="w-80 flex-shrink-0 p-4 h-full">
      <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl h-full flex flex-col min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
            <Zap className="w-4 h-4 text-indigo-500" />
            Quote Wizard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-1 overflow-y-auto min-h-0">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = step.isValid;
            
            return (
              <button
                key={step.id}
                onClick={() => onStepChange(index)}
                className={`
                  w-full text-left p-3 rounded-lg transition-all duration-200 border
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200' 
                    : 'hover:bg-slate-50 border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3">
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
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <step.icon className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`
                      font-medium text-sm
                      ${isActive ? 'text-indigo-900' : 'text-slate-700'}
                    `}>
                      {step.label}
                    </div>
                    <div className={`
                      text-xs
                      ${isActive ? 'text-indigo-600' : 'text-slate-500'}
                    `}>
                      {step.description}
                    </div>
                  </div>
                  {isCompleted && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};