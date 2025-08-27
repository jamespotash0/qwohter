import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { WizardStep, QuoteFormData } from '../types';

/**
 * useWizardState Hook
 * Centralized wizard state management with navigation, validation, and persistence
 */
export const useWizardState = (
  steps: WizardStep[],
  onSave: (data: Partial<QuoteFormData>) => Promise<void>
) => {
  const [activeStep, setActiveStep] = useState(0);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  }, [activeStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  }, [activeStep]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setActiveStep(stepIndex);
    }
  }, [steps.length]);

  // Validation computed values
  const completedSteps = useMemo(() => 
    steps.filter(step => step.isValid).length, 
    [steps]
  );

  const isAllValid = useMemo(() => 
    steps.every(step => step.isValid), 
    [steps]
  );

  const canProceed = useMemo(() => 
    activeStep === steps.length - 1 ? isAllValid : steps[activeStep]?.isValid, 
    [activeStep, steps, isAllValid]
  );

  const currentStep = useMemo(() => 
    steps[activeStep], 
    [steps, activeStep]
  );

  // Save handler with validation
  const handleSave = useCallback(async (formData: Partial<QuoteFormData>) => {
    if (!isAllValid) {
      const firstInvalidStep = steps.findIndex(step => !step.isValid);
      setActiveStep(firstInvalidStep);
      toast.error(`Please complete the ${steps[firstInvalidStep]?.label} section`);
      return;
    }

    try {
      await onSave(formData);
      toast.success('Quote saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save quote. Please try again.');
    }
  }, [isAllValid, steps, onSave]);

  return {
    // State
    activeStep,
    steps,
    currentStep,
    
    // Navigation
    setActiveStep,
    handleNext,
    handlePrevious,
    goToStep,
    
    // Validation
    completedSteps,
    isAllValid,
    canProceed,
    
    // Actions
    handleSave,
  };
};