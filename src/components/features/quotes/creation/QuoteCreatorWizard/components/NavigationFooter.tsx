import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

interface NavigationFooterProps {
  activeStep: number;
  totalSteps: number;
  allStepsValid: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => Promise<void>;
}

export const NavigationFooter = ({
  activeStep,
  totalSteps,
  allStepsValid,
  onPrevious,
  onNext,
  onSave
}: NavigationFooterProps) => {
  const isLastStep = activeStep >= totalSteps - 1;

  return (
    <div className="border-t border-slate-100 p-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={activeStep === 0}
          className="px-4 py-2 rounded-lg border hover:bg-slate-50 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{activeStep + 1} / {totalSteps}</span>
          <div className="w-16 bg-slate-200 rounded-full h-1">
            <div 
              className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((activeStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        
        {isLastStep ? (
          <Button
            onClick={onSave}
            disabled={!allStepsValid}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Quote
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};