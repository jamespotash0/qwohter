import { 
  User, 
  Briefcase, 
  Building, 
  DoorOpen, 
  Construction, 
  Truck, 
  DollarSign,
  FileText
} from "lucide-react";
import { EditingStep } from '../types/editingTypes';
import { ChangeTracker } from '../types/editingTypes';

export const createEditingSteps = (
  isContactInfoValid: boolean,
  isJobDetailsValid: boolean,
  isWallSpecValid: boolean,
  isPocketDoorsValid: boolean,
  isSupportStructureValid: boolean,
  isDeliveryLaborValid: boolean,
  isPricingValid: boolean,
  isQuoteStatusValid: boolean,
  changeTracker: ChangeTracker
): EditingStep[] => [
  {
    id: "contact",
    label: "Contact Information",
    icon: User,
    isValid: isContactInfoValid,
    hasChanges: changeTracker.contactInfo,
    description: "Update contact details and company information"
  },
  {
    id: "job",
    label: "Project Details",
    icon: Briefcase,
    isValid: isJobDetailsValid,
    hasChanges: changeTracker.jobDetails,
    description: "Modify project information and client details"
  },
  {
    id: "walls",
    label: "Wall Systems",
    icon: Building,
    isValid: isWallSpecValid,
    hasChanges: changeTracker.walls,
    description: "Edit wall specifications and configurations"
  },
  {
    id: "pockets",
    label: "Pocket Doors",
    icon: DoorOpen,
    isValid: isPocketDoorsValid,
    hasChanges: changeTracker.walls, // Uses same tracker as walls
    description: "Configure pocket door options for each wall"
  },
  {
    id: "support",
    label: "Structure Support",
    icon: Construction,
    isValid: isSupportStructureValid,
    hasChanges: changeTracker.walls, // Uses same tracker as walls
    description: "Specify structural support requirements"
  },
  {
    id: "delivery",
    label: "Delivery & Labor",
    icon: Truck,
    isValid: isDeliveryLaborValid,
    hasChanges: changeTracker.deliveryLabor,
    description: "Update delivery timeline and labor requirements"
  },
  {
    id: "pricing",
    label: "Pricing",
    icon: DollarSign,
    isValid: isPricingValid,
    hasChanges: changeTracker.pricing,
    description: "Modify cost breakdown and pricing details"
  }
];