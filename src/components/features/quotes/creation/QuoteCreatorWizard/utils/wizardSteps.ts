import {
  Contact,
  FileText,
  Square,
  DoorOpen,
  Building,
  Truck,
  DollarSign
} from "lucide-react";
import { WizardStep } from '../types/wizardTypes';

export const createWizardSteps = (
  isContactInfoValid: boolean,
  isJobDetailsValid: boolean,
  isWallSpecValid: boolean,
  isPocketDoorsValid: boolean,
  isSupportStructureValid: boolean,
  isDeliveryLaborValid: boolean,
  isPricingValid: boolean
): WizardStep[] => [
  { 
    id: "contact", 
    label: "Contact Info", 
    icon: Contact, 
    isValid: isContactInfoValid,
    description: "Company contact details"
  },
  { 
    id: "job", 
    label: "Project Details", 
    icon: FileText, 
    isValid: isJobDetailsValid,
    description: "Job location and client info"
  },
  { 
    id: "walls", 
    label: "Wall Systems", 
    icon: Square, 
    isValid: isWallSpecValid,
    description: "Wall specs and dimensions"
  },
  { 
    id: "pockets", 
    label: "Pocket Doors", 
    icon: DoorOpen, 
    isValid: isPocketDoorsValid,
    description: "Door configuration options"
  },
  { 
    id: "support", 
    label: "Support Structure", 
    icon: Building, 
    isValid: isSupportStructureValid,
    description: "Mounting & Support"
  },
  { 
    id: "delivery", 
    label: "Delivery & Labor", 
    icon: Truck, 
    isValid: isDeliveryLaborValid,
    description: "Timeline & Labor reqs"
  },
  { 
    id: "pricing", 
    label: "Pricing", 
    icon: DollarSign, 
    isValid: isPricingValid,
    description: "Pricing and payment terms"
  }
];