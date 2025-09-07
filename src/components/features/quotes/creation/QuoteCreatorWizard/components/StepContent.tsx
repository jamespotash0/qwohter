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
      // Convert wizard's Pricing to EnhancedPricingData format
      const enhancedData: EnhancedPricingData = {
        ...defaultEnhancedPricing,
        // Enhanced fields
        kwik_wall_materials_cost: pricing.kwik_wall_materials_cost || 0,
        misc_materials_cost: pricing.misc_materials_cost || 0,
        misc_materials_description: pricing.misc_materials_description || '',
        delivery_cost_track: pricing.delivery_cost_track || 0,
        delivery_cost_panel: pricing.delivery_cost_panel || 0,
        track_equipment_costs: pricing.track_equipment_costs || 0,
        track_labor_cost: pricing.track_labor_cost || 0,
        panel_equipment_costs: pricing.panel_equipment_costs || 0,
        panel_labor_cost: pricing.panel_labor_cost || 0,
        track_freight_factory: pricing.track_freight_factory || 0,
        panel_freight_factory: pricing.panel_freight_factory || 0,
        local_handling_costs: pricing.local_handling_costs || 0,
        markup_percentage: pricing.markup_percentage || 0,
        markup_margin: pricing.markup_margin || 0,
        unseen_costs: pricing.unseen_costs || 0,
        unseen_costs_percentage: pricing.unseen_costs_percentage || 10,
        unseen_costs_locked: pricing.unseen_costs_locked !== false,
        cost_subtotal: pricing.cost_subtotal || 0,
        base_selling_price: pricing.base_selling_price || 0,
        shipping_handling_subtotal: pricing.shipping_handling_subtotal || 0,
        shipping_freight_subtotal: pricing.shipping_freight_subtotal || 0,
        selling_price: pricing.selling_price || 0,
        // Legacy fields
        basePrice: pricing.basePrice,
        freight: pricing.freight,
        total: pricing.total,
        paymentUponDrawings: pricing.paymentUponDrawings,
        paymentUponTrackInstallation: pricing.paymentUponTrackInstallation
      };

      const handleEnhancedUpdate = (updatedData: EnhancedPricingData) => {
        // Convert back to enhanced Pricing format for wizard
        const enhancedPricing: Pricing = {
          // Legacy fields
          basePrice: updatedData.basePrice,
          freight: updatedData.freight,
          total: updatedData.total,
          paymentUponDrawings: updatedData.paymentUponDrawings,
          paymentUponTrackInstallation: updatedData.paymentUponTrackInstallation,
          // Enhanced fields
          kwik_wall_materials_cost: updatedData.kwik_wall_materials_cost,
          misc_materials_cost: updatedData.misc_materials_cost,
          misc_materials_description: updatedData.misc_materials_description,
          delivery_cost_track: updatedData.delivery_cost_track,
          delivery_cost_panel: updatedData.delivery_cost_panel,
          track_equipment_costs: updatedData.track_equipment_costs,
          track_labor_cost: updatedData.track_labor_cost,
          panel_equipment_costs: updatedData.panel_equipment_costs,
          panel_labor_cost: updatedData.panel_labor_cost,
          track_freight_factory: updatedData.track_freight_factory,
          panel_freight_factory: updatedData.panel_freight_factory,
          local_handling_costs: updatedData.local_handling_costs,
          markup_percentage: updatedData.markup_percentage,
          markup_margin: updatedData.markup_margin,
          unseen_costs: updatedData.unseen_costs,
          unseen_costs_percentage: updatedData.unseen_costs_percentage,
          unseen_costs_locked: updatedData.unseen_costs_locked,
          cost_subtotal: updatedData.cost_subtotal,
          base_selling_price: updatedData.base_selling_price,
          shipping_handling_subtotal: updatedData.shipping_handling_subtotal,
          shipping_freight_subtotal: updatedData.shipping_freight_subtotal,
          selling_price: updatedData.selling_price
        };
        onPricingUpdate(enhancedPricing);
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