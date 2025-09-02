import ContactInfoForm from "@/components/features/quotes/forms/contact/ContactInfoForm";
import JobDetailsForm from "@/components/features/quotes/forms/contact/JobDetailsForm";
import WallSpecificationForm from "@/components/features/quotes/forms/walls/WallSpecificationForm";
import PerWallPocketDoorsForm from "@/components/features/quotes/forms/walls/PerWallPocketDoorsForm";
import PerWallStructureForm from "@/components/features/quotes/forms/walls/PerWallStructureForm";
import DeliveryLaborForm from "@/components/features/quotes/forms/delivery/DeliveryLaborForm";
import PricingForm from "@/components/features/quotes/forms/pricing/PricingForm";

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
    case "pricing":
      return (
        <PricingForm 
          data={pricing} 
          onUpdate={onPricingUpdate} 
          onGenerate={onSave}
          quoteData={allQuoteData}
        />
      );
    default:
      return null;
  }
};