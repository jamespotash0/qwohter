import { ComponentType } from 'react';
import { WallDetails } from '@/lib/types';

export interface ContactInfo {
  contactName: string;
  contactEmail: string;
  address: string;
  phone: string;
  fax: string;
  website: string;
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

export interface Pricing {
  // basePrice: number;
  // freight: number;
  // total: string;
  paymentUponDrawings: string;
  paymentUponTrackInstallation: string;
  // Enhanced pricing fields
  kwik_wall_materials_cost?: number;
  misc_materials_cost?: number;
  misc_materials_description?: string;
  delivery_cost_track?: number;
  delivery_cost_panel?: number;
  track_equipment_costs?: number;
  track_labor_cost?: number;
  panel_equipment_costs?: number;
  panel_labor_cost?: number;
  track_freight_factory?: number;
  panel_freight_factory?: number;
  local_handling_costs?: number;
  cost_markup_percentage?: number;
  shipping_markup_percentage?: number;
  unseen_costs?: number;
  unseen_costs_percentage?: number;
  unseen_costs_locked?: boolean;
  material_cost_subtotal?: number;
  base_selling_price?: number;
  shipping_handlingFreight_subtotal?: number;
  total_selling_price?: number;
}

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