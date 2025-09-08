import ContactInfoForm from "@/components/features/quotes/forms/contact/ContactInfoForm";
import JobDetailsForm from "@/components/features/quotes/forms/contact/JobDetailsForm";
import WallSpecificationForm from "@/components/features/quotes/forms/walls/WallSpecificationForm";
import PerWallPocketDoorsForm from "@/components/features/quotes/forms/walls/PerWallPocketDoorsForm";
import PerWallStructureForm from "@/components/features/quotes/forms/walls/PerWallStructureForm";
import DeliveryLaborForm from "@/components/features/quotes/forms/delivery/DeliveryLaborForm";
import EnhancedPricingForm from "@/components/features/quotes/forms/pricing/EnhancedPricingForm";
import { EnhancedPricingData, defaultEnhancedPricing } from "@/lib/types/pricing/enhancedPricing";

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
        delivery_cost_track: pricing.delivery_cost_track || 0,
        delivery_cost_panel: pricing.delivery_cost_panel || 0,
        track_equipment_costs: pricing.track_equipment_costs || 0,
        track_labor_cost: pricing.track_labor_cost || 0,
        panel_equipment_costs: pricing.panel_equipment_costs || 0,
        panel_labor_cost: pricing.panel_labor_cost || 0,
        track_freight_factory: pricing.track_freight_factory || 0,
        panel_freight_factory: pricing.panel_freight_factory || 0,
        local_handling_costs: pricing.local_handling_costs || 0,
        materials_markup_percentage: pricing.materials_markup_percentage || 0, //cost markup percentage
        shipping_markup_percentage: pricing.shipping_markup_percentage || 0,
        unseen_costs: pricing.unseen_costs || 0,
        unseen_costs_percentage: pricing.unseen_costs_percentage || 10,
        unseen_costs_locked: pricing.unseen_costs_locked !== false,
        cost_subtotal: pricing.cost_subtotal || 0,
        base_selling_price: pricing.base_selling_price || 0,
        shipping_cost_subtotal: pricing.shipping_cost_subtotal || 0,
        shipping_selling_price: pricing.shipping_selling_price || 0,
        final_selling_price: pricing.final_selling_price || 0,
        base_selling_gross_profit_percentage: pricing.base_selling_gross_profit_percentage || 0,
        shipping_selling_gross_profit_percentage: pricing.shipping_selling_gross_profit_percentage || 0,
        final_selling_gross_profit_percentage: pricing.final_selling_gross_profit_percentage || 0,
        final_selling_price_profit_amount: pricing.final_selling_price_profit_amount || 0,
        payment_upon_drawings: pricing.payment_upon_drawings,
        payment_upon_track_installation: pricing.payment_upon_track_installation
      };

      const handleEnhancedUpdate = (updatedData: EnhancedPricingData) => {
        const enhancedPricing: Pricing = {
          payment_upon_drawings: updatedData.payment_upon_drawings,
          payment_upon_track_installation: updatedData.payment_upon_track_installation,
          // Enhanced fields
          kwik_wall_materials_cost: updatedData.kwik_wall_materials_cost,
          misc_materials_cost: updatedData.misc_materials_cost,
          delivery_cost_track: updatedData.delivery_cost_track,
          delivery_cost_panel: updatedData.delivery_cost_panel,
          track_equipment_costs: updatedData.track_equipment_costs,
          track_labor_cost: updatedData.track_labor_cost,
          panel_equipment_costs: updatedData.panel_equipment_costs,
          panel_labor_cost: updatedData.panel_labor_cost,
          track_freight_factory: updatedData.track_freight_factory,
          panel_freight_factory: updatedData.panel_freight_factory,
          local_handling_costs: updatedData.local_handling_costs,
          materials_markup_percentage: updatedData.materials_markup_percentage,
          shipping_markup_percentage: updatedData.shipping_markup_percentage,
          unseen_costs: updatedData.unseen_costs,
          unseen_costs_percentage: updatedData.unseen_costs_percentage,
          unseen_costs_locked: updatedData.unseen_costs_locked,
          cost_subtotal: updatedData.cost_subtotal,
          base_selling_price: updatedData.base_selling_price,
          shipping_cost_subtotal: updatedData.shipping_cost_subtotal,
          shipping_selling_price: updatedData.shipping_selling_price,
          final_selling_price: updatedData.final_selling_price,
          base_selling_gross_profit_percentage: updatedData.base_selling_gross_profit_percentage,
          shipping_selling_gross_profit_percentage: updatedData.shipping_selling_gross_profit_percentage,
          final_selling_gross_profit_percentage: updatedData.final_selling_gross_profit_percentage,
          final_selling_price_profit_amount: updatedData.final_selling_price_profit_amount
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