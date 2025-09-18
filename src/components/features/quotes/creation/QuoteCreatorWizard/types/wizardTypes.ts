import { ComponentType } from 'react';
import { WallDetails } from '@/lib/types';

export interface ContactInfo {
  contactName: string;
  contactEmail: string;
  address: string;
  phone: string;
  fax: string;
  website: string;
  quoteSource: string;
}

export interface JobDetails {
  date: string;
  proposalNumber: string;
  jobLocation: string;
  billedTo: {
    name: string;
    company: string;
    address: string;
  };
}

export interface PocketDoors {
  foldType: string;
  foldStyle: string;
}

export interface SupportStructure {
  mountingTrack: string;
}

export interface DeliveryLabor {
  delivery: {
    shopDrawingWeeks: string;
    trackDeliveryWeeks: string;
    panelDeliveryWeeks: string;
    trackInstallationDays: string;
    panelInstallationDays: string;
  };
  labor: {
    laborType: string;
    wageRate: string;
  };
}

// Use EnhancedPricingData directly instead of duplicate interface
export type Pricing = import('@/lib/types/pricing/enhancedPricing').EnhancedPricingData;

export interface WizardStep {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isValid: boolean;
  description: string;
}

export interface QuoteData {
  contactInfo: ContactInfo;
  jobDetails: JobDetails;
  walls: WallDetails;
  pocketDoors: PocketDoors;
  supportStructure: SupportStructure;
  deliveryLabor: DeliveryLabor;
  pricing: Pricing;
}

export interface QuoteCreatorWizardProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
  existingQuote?: Record<string, unknown>;
}