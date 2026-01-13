import { Check, AlertCircle, Edit3 } from "lucide-react";
import { EditingStep } from '../types/editingTypes';

interface EditingStepNavigationProps {
  steps: EditingStep[];
  activeStep: number;
  onStepChange: (stepIndex: number) => void;
}

export const EditingStepNavigation = ({ 
  steps, 
  activeStep, 
  onStepChange 
}: EditingStepNavigationProps) => {
  return (
    <div className="w-80 bg-white/90 backdrop-blur-sm border-r border-white/50 shadow-xl flex-shrink-0 overflow-y-auto h-full">
      <div className="p-4">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Quote Sections</h2>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isClickable = true; // In editing mode, all steps are clickable
            
            // Determine step status with proper priority
            const getStepStatus = () => {
              if (!step.isValid) return 'needs-attention';
              if (step.hasChanges) return 'modified';
              return 'complete';
            };
            
            const stepStatus = getStepStatus();
            
            return (
              <button
                key={step.id}
                onClick={() => isClickable && onStepChange(index)}
                disabled={!isClickable}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-indigo-500 shadow-lg"
                    : stepStatus === 'modified'
                    ? "bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100"
                    : stepStatus === 'complete'
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                    : "bg-red-50 text-red-900 border-red-200 hover:bg-red-100"
                } ${!isClickable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? "bg-white/20"
                      : stepStatus === 'modified'
                      ? "bg-orange-100"
                      : stepStatus === 'complete'
                      ? "bg-emerald-100"
                      : "bg-red-100"
                  }`}>
                    {stepStatus === 'modified' ? (
                      <Edit3 className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-orange-600"
                      }`} />
                    ) : stepStatus === 'complete' ? (
                      <Check className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-emerald-600"
                      }`} />
                    ) : (
                      <AlertCircle className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-red-600"
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${
                      isActive ? "text-white" : "text-current"
                    }`}>
                      {step.label}
                    </div>
                    <div className={`text-xs mt-1 leading-tight ${
                      isActive 
                        ? "text-white/80" 
                        : stepStatus === 'modified'
                        ? "text-orange-600"
                        : stepStatus === 'complete'
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}>
                      {stepStatus === 'modified' ? "Modified" : stepStatus === 'complete' ? "Complete" : "Needs attention"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};