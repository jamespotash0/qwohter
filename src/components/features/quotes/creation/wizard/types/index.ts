/**
 * Wizard Types
 * Centralized type definitions for the Quote Creator Wizard system
 */

import { ReactElement } from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Individual wizard step configuration
 */
export interface WizardStep {
  id: string;
  label: string;
  icon: LucideIcon;
  isValid: boolean;
  description: string;
}

/**
 * Wizard context for state management
 */
export interface WizardContext {
  // Step navigation
  activeStep: number;
  steps: WizardStep[];
  setActiveStep: (step: number) => void;
  handleNext: () => void;
  handlePrevious: () => void;
  
  // Validation
  completedSteps: number;
  isAllValid: boolean;
  canProceed: boolean;
  
  // Actions
  handleSave: () => Promise<void>;
}

/**
 * Generic wizard step component props
 */
export interface WizardStepProps {
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onDataChange: (data: unknown) => void;
}

/**
 * Quote form data interfaces
 */
export interface ContactFormData {
  contactName: string;
  contactEmail: string;
  address: string;
  phone: string;
  fax: string;
  website: string;
}

export interface JobDetailsFormData {
  date: string;
  proposalNumber: string;
  jobLocation: string;
  billedTo: {
    name: string;
    company: string;
    address: string;
  };
}

export interface DeliveryLaborFormData {
  delivery: {
    shopDrawingWeeks: string;
    trackDeliveryWeeks: string;
    panelDeliveryWeeks: string;
  };
  labor: {
    trackInstallationDays: string;
    panelInstallationDays: string;
  };
}

/**
 * Complete quote data structure
 */
export interface QuoteFormData {
  contactInfo: ContactFormData;
  jobDetails: JobDetailsFormData;
  deliveryLabor: DeliveryLaborFormData;
  quoteStatus: string;
  // Add other form data types as needed
}