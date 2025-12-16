import { ComponentType } from 'react';
import type { Quote } from '@/_deprecated/services/quotesService';
import { WallDetails } from '@/lib/types';
import { ContactInfo, JobDetails, DeliveryLabor, Pricing } from '@/_deprecated/components/quotes/creation/QuoteCreatorWizard/types/wizardTypes';

export interface EditingStep {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isValid: boolean;
  hasChanges: boolean;
  description: string;
}

export interface QuoteEditingWizardProps {
  existingQuote: Quote;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
}

export interface EditingStateData {
  contactInfo: ContactInfo;
  jobDetails: JobDetails;
  walls: WallDetails;
  deliveryLabor: DeliveryLabor;
  pricing: Pricing;
  quoteStatus: string;
  quoteName: string;
}

export interface ChangeTracker {
  contactInfo: boolean;
  jobDetails: boolean;
  walls: boolean;
  deliveryLabor: boolean;
  pricing: boolean;
  quoteStatus: boolean;
  quoteName: boolean;
}