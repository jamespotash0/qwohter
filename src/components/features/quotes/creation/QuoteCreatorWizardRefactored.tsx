import React, { useState } from "react";
import { 
  Contact, 
  FileText, 
  Square, 
  Building, 
  Truck, 
  DollarSign, 
  DoorOpen 
} from "lucide-react";
import { 
  WizardProvider, 
  WizardLayout, 
  ContactInfoStep, 
  JobDetailsStep 
} from './wizard';
import { useQuotes } from "@/hooks/useQuotes";
import { toast } from "sonner";
import type { WizardStep, QuoteFormData, ContactFormData, JobDetailsFormData } from './wizard/types';

/**
 * QuoteCreatorWizardRefactored Props
 */
interface QuoteCreatorWizardProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
  existingQuote?: Record<string, unknown>;
}

/**
 * QuoteCreatorWizardRefactored Component
 * 
 * Refactored version of the 681-line God component using the Wizard Pattern
 * 
 * Architecture Improvements:
 * - Wizard Pattern: Separated step management from business logic
 * - Single Responsibility: Each component has one clear purpose
 * - State Management: Centralized wizard state with context
 * - Reusable Components: Step components can be reused
 * - Type Safety: Full TypeScript support
 * - Maintainability: Much easier to add/modify/test steps
 */
const QuoteCreatorWizardRefactored: React.FC<QuoteCreatorWizardProps> = ({ 
  quoteName, 
  onBackToDashboard, 
  onQuoteNameChange, 
  existingQuote 
}) => {
  const { createQuote, updateQuote } = useQuotes();
  
  // Form data state - extracted from the original component
  const [contactInfo, setContactInfo] = useState<ContactFormData>({
    contactName: "",
    contactEmail: "",
    address: "",
    phone: "",
    fax: "",
    website: ""
  });

  const [jobDetails, setJobDetails] = useState<JobDetailsFormData>({
    date: new Date().toISOString().split('T')[0],
    proposalNumber: `P${Date.now().toString().slice(-6)}`,
    jobLocation: "",
    billedTo: {
      name: "",
      company: "",
      address: ""
    }
  });

  // Validation functions - extracted from original component
  const isContactInfoValid = (): boolean => {
    return !!(contactInfo.contactName && contactInfo.contactEmail && contactInfo.address);
  };

  const isJobDetailsValid = (): boolean => {
    return !!(jobDetails.jobLocation && jobDetails.billedTo.name);
  };

  // Step configuration - now clean and maintainable
  const steps: WizardStep[] = [
    { 
      id: "contact", 
      label: "Contact Info", 
      icon: Contact, 
      isValid: isContactInfoValid(),
      description: "Company contact details"
    },
    { 
      id: "job", 
      label: "Project Details", 
      icon: FileText, 
      isValid: isJobDetailsValid(),
      description: "Job location and client info"
    },
    { 
      id: "walls", 
      label: "Wall Systems", 
      icon: Square, 
      isValid: false, // TODO: Add validation
      description: "Wall specs and dimensions"
    },
    { 
      id: "pocketdoors", 
      label: "Pocket Doors", 
      icon: DoorOpen, 
      isValid: false, // TODO: Add validation
      description: "Pocket door specifications"
    },
    { 
      id: "structure", 
      label: "Support Structure", 
      icon: Building, 
      isValid: false, // TODO: Add validation
      description: "Mounting and support details"
    },
    { 
      id: "delivery", 
      label: "Delivery & Labor", 
      icon: Truck, 
      isValid: false, // TODO: Add validation
      description: "Delivery and installation"
    },
    { 
      id: "pricing", 
      label: "Pricing", 
      icon: DollarSign, 
      isValid: false, // TODO: Add validation
      description: "Quote pricing details"
    }
  ];

  // Save handler - extracted and simplified
  const handleSave = async (formData: Partial<QuoteFormData>): Promise<void> => {
    try {
      const quoteData = {
        project_name: quoteName,
        quote_details: contactInfo,
        job_details: {
          job_location: jobDetails.jobLocation,
          client_name: jobDetails.billedTo.name,
          client_company: jobDetails.billedTo.company,
          client_address: jobDetails.billedTo.address,
          date: jobDetails.date
        },
        // TODO: Add other form sections
      };

      if (existingQuote) {
        await updateQuote((existingQuote.id as string), quoteData);
      } else {
        await createQuote(quoteData);
      }

      toast.success("Quote saved successfully!");
      onBackToDashboard();
    } catch (error) {
      console.error("Failed to save quote:", error);
      throw error; // Let wizard handle the error display
    }
  };

  // Aggregate form data
  const formData: Partial<QuoteFormData> = {
    contactInfo,
    jobDetails,
    quoteStatus: "Draft"
  };

  return (
    <WizardProvider steps={steps} onSave={handleSave}>
      <WizardLayout
        quoteName={quoteName}
        onQuoteNameChange={onQuoteNameChange}
        formData={formData}
        showBackToDashboard
        onBackToDashboard={onBackToDashboard}
      >
        {/* Step Components - Clean and Focused */}
        <ContactInfoStep 
          data={contactInfo} 
          onChange={setContactInfo}
          isActive={steps[0]?.id === "contact"}
        />
        
        <JobDetailsStep 
          data={jobDetails} 
          onChange={setJobDetails}
          isActive={steps[1]?.id === "job"}
        />

        {/* TODO: Add remaining step components:
          - WallSystemsStep
          - PocketDoorsStep  
          - SupportStructureStep
          - DeliveryLaborStep
          - PricingStep
        */}
      </WizardLayout>
    </WizardProvider>
  );
};

export default QuoteCreatorWizardRefactored;