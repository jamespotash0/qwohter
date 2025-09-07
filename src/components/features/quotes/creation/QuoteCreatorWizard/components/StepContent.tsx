import ContactInfoForm from "@/components/features/quotes/forms/contact/ContactInfoForm";
import JobDetailsForm from "@/components/features/quotes/forms/contact/JobDetailsForm";
import WallSpecificationForm from "@/components/features/quotes/forms/walls/WallSpecificationForm";
import PerWallPocketDoorsForm from "@/components/features/quotes/forms/walls/PerWallPocketDoorsForm";
import PerWallStructureForm from "@/components/features/quotes/forms/walls/PerWallStructureForm";
import DeliveryLaborForm from "@/components/features/quotes/forms/delivery/DeliveryLaborForm";
import EnhancedPricingForm from "@/components/features/quotes/forms/pricing/EnhancedPricingForm";
import { EnhancedPricingData, defaultEnhancedPricing } from "@/types/enhancedPricing";

import { ContactInfo, JobDetails, DeliveryLabor, Pricing, QuoteData } from '../types/wizardTypes';
import { WallDetails } from '@/lib/types';

interface StepContentProps {
  stepId: string;
  contactInfo: ContactInfo;
  jobDetails: JobDetails;
  walls: WallDetails;
  deliveryLabor: DeliveryLabor;
  pricing: Pricing;
  allQuoteData: QuoteData;
  onContactInfoUpdate: (data: ContactInfo) => void;
  onJobDetailsUpdate: (data: JobDetails) => void;
  onWallsUpdate: (data: WallDetails) => void;
  onDeliveryLaborUpdate: (data: DeliveryLabor) => void;
  onPricingUpdate: (data: Pricing) => void;
  onWallPocketDoorsUpdate: (wallName: string, pocketDoorsConfig: { foldType: string; foldStyle: string }) => void;
  onWallStructureSupportUpdate: (wallName: string, structureSupport: string) => void;
  onSave: () => Promise<void>;
}

export const StepContent = ({
  stepId,
  contactInfo,
  jobDetails,
  walls,
  deliveryLabor,
  pricing,
  allQuoteData,
  onContactInfoUpdate,
  onJobDetailsUpdate,
  onWallsUpdate,
  onDeliveryLaborUpdate,
  onPricingUpdate,
  onWallPocketDoorsUpdate,
  onWallStructureSupportUpdate,
  onSave
}: StepContentProps) => {
  switch (stepId) {
    case "contact":
      return <ContactInfoForm data={contactInfo} onUpdate={onContactInfoUpdate} />;
    case "job":
      return <JobDetailsForm data={jobDetails} onUpdate={onJobDetailsUpdate} />;
    case "walls":
      return <WallSpecificationForm walls={walls} onUpdate={onWallsUpdate} />;
    case "pockets":
      return <PerWallPocketDoorsForm walls={walls.walls} onWallUpdate={onWallPocketDoorsUpdate} />;
    case "support":
      return <PerWallStructureForm walls={walls.walls} onWallUpdate={onWallStructureSupportUpdate} />;
    case "delivery":
      return <DeliveryLaborForm data={deliveryLabor} onUpdate={onDeliveryLaborUpdate} />;
    case "pricing": {
      // Convert wizard's basic Pricing to EnhancedPricingData format
      const enhancedData: EnhancedPricingData = {
        ...defaultEnhancedPricing,
        basePrice: pricing.basePrice,
        freight: pricing.freight,
        total: pricing.total,
        paymentUponDrawings: pricing.paymentUponDrawings,
        paymentUponTrackInstallation: pricing.paymentUponTrackInstallation
      };

      const handleEnhancedUpdate = (updatedData: EnhancedPricingData) => {
        // Convert back to basic Pricing format for wizard
        const basicPricing: Pricing = {
          basePrice: updatedData.basePrice,
          freight: updatedData.freight,
          total: updatedData.total,
          paymentUponDrawings: updatedData.paymentUponDrawings,
          paymentUponTrackInstallation: updatedData.paymentUponTrackInstallation
        };
        onPricingUpdate(basicPricing);
      };

      return (
        <EnhancedPricingForm 
          data={enhancedData}
          onUpdate={handleEnhancedUpdate} 
          onGenerate={onSave}
          quoteData={allQuoteData}
        />
      );
    }
    default:
      return null;
  }
};