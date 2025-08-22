import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { useWizard } from './WizardProvider';
import { cn } from '@/lib/utils';
import type { QuoteFormData } from './types';

/**
 * WizardNavigation Props
 */
interface WizardNavigationProps {
  onSave?: (data: Partial<QuoteFormData>) => Promise<void>;
  formData: Partial<QuoteFormData>;
  showBackToDashboard?: boolean;
  onBackToDashboard?: () => void;
  className?: string;
}

/**
 * WizardNavigation Component
 * Provides consistent navigation controls for wizard steps
 * 
 * Features:
 * - Previous/Next navigation
 * - Save functionality
 * - Progress-aware button states
 * - Back to dashboard option
 * - Responsive layout
 */
export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  onSave,
  formData,
  showBackToDashboard = false,
  onBackToDashboard,
  className,
}) => {
  const {
    activeStep,
    steps,
    handleNext,
    handlePrevious,
    handleSave,
    isAllValid,
  } = useWizard();

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const currentStep = steps[activeStep];

  const handleSaveClick = async () => {
    if (onSave) {
      await handleSave(formData);
    } else {
      await handleSave(formData);
    }
  };

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {/* Left side - Back to Dashboard */}
      <div>
        {showBackToDashboard && onBackToDashboard && (
          <Button
            variant="ghost"
            onClick={onBackToDashboard}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Button>
        )}
      </div>

      {/* Right side - Navigation */}
      <div className="flex items-center gap-3">
        {/* Previous Button */}
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        {/* Next Button */}
        {!isLastStep && (
          <Button
            onClick={handleNext}
            disabled={!currentStep?.isValid}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}

        {/* Save Button - Only show on last step or when all valid */}
        {(isLastStep || isAllValid) && (
          <Button
            onClick={handleSaveClick}
            disabled={!isAllValid}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Quote
          </Button>
        )}
      </div>
    </div>
  );
};