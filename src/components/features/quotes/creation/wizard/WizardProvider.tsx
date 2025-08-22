import React, { createContext, useContext } from 'react';
import { useWizardState } from './hooks/useWizardState';
import type { WizardStep, QuoteFormData } from './types';

/**
 * Wizard Context Interface
 */
interface WizardContextType {
  // State
  activeStep: number;
  steps: WizardStep[];
  currentStep: WizardStep | undefined;
  
  // Navigation
  setActiveStep: (step: number) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  goToStep: (stepIndex: number) => void;
  
  // Validation
  completedSteps: number;
  isAllValid: boolean;
  canProceed: boolean;
  
  // Actions
  handleSave: (data: Partial<QuoteFormData>) => Promise<void>;
}

/**
 * Wizard Context
 */
const WizardContext = createContext<WizardContextType | null>(null);

/**
 * useWizard Hook
 * Provides access to wizard context with proper error handling
 */
export const useWizard = (): WizardContextType => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

/**
 * WizardProvider Props
 */
interface WizardProviderProps {
  children: React.ReactNode;
  steps: WizardStep[];
  onSave: (data: Partial<QuoteFormData>) => Promise<void>;
}

/**
 * WizardProvider Component
 * Provides wizard state and actions to child components
 * 
 * Features:
 * - Centralized step management
 * - Navigation controls
 * - Validation tracking
 * - Save action coordination
 * - Error handling
 */
export const WizardProvider: React.FC<WizardProviderProps> = ({
  children,
  steps,
  onSave,
}) => {
  const wizardState = useWizardState(steps, onSave);

  const contextValue: WizardContextType = {
    ...wizardState,
  };

  return (
    <WizardContext.Provider value={contextValue}>
      {children}
    </WizardContext.Provider>
  );
};