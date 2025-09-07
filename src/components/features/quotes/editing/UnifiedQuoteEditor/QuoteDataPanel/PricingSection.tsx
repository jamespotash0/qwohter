import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import EnhancedPricingForm from '@/components/features/quotes/forms/pricing/EnhancedPricingForm';
import { EnhancedPricingData, defaultEnhancedPricing } from '@/types/enhancedPricing';

interface PricingSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange
}) => {
  
  // Convert current price_details to EnhancedPricingData format
  const enhancedData = useMemo((): EnhancedPricingData => {
    const priceDetails = data.price_details || {};
    
    return {
      // If enhanced data exists, use it; otherwise use defaults
      kwik_wall_materials_cost: priceDetails.kwik_wall_materials_cost || 0,
      misc_materials_cost: priceDetails.misc_materials_cost || 0,
      misc_materials_description: priceDetails.misc_materials_description || '',
      delivery_cost_track: priceDetails.delivery_cost_track || 0,
      track_equipment_costs: priceDetails.track_equipment_costs || 0,
      track_labor_cost: priceDetails.track_labor_cost || 0,
      panel_equipment_costs: priceDetails.panel_equipment_costs || 0,
      panel_labor_cost: priceDetails.panel_labor_cost || 0,
      track_freight_factory: priceDetails.track_freight_factory || 0,
      panel_freight_factory: priceDetails.panel_freight_factory || 0,
      local_handling_costs: priceDetails.local_handling_costs || 0,
      gross_profit_percentage: priceDetails.gross_profit_percentage || 30,
      gross_profit_margin: priceDetails.gross_profit_margin || 15,
      
      // Auto-calculated fields (will be recalculated)
      unseen_costs: priceDetails.unseen_costs || 0,
      cost_subtotal: priceDetails.cost_subtotal || 0,
      base_selling_price: priceDetails.base_selling_price || 0,
      shipping_handling_subtotal: priceDetails.shipping_handling_subtotal || 0,
      shipping_freight_subtotal: priceDetails.shipping_freight_subtotal || 0,
      selling_price: priceDetails.selling_price || 0,
      
      // Legacy fields (backward compatibility)
      basePrice: priceDetails.basePrice || priceDetails.base_price || 0,
      freight: priceDetails.freight || 0,
      total: priceDetails.total || '0',
      paymentUponDrawings: priceDetails.paymentUponDrawings || priceDetails.payment_upon_drawings || '33',
      paymentUponTrackInstallation: priceDetails.paymentUponTrackInstallation || priceDetails.payment_upon_track_installation || '33'
    };
  }, [data.price_details]);

  // Handle enhanced pricing data updates
  const handlePricingUpdate = (updatedData: EnhancedPricingData) => {
    // Convert back to the format expected by the parent component
    const updateData = {
      // Enhanced fields
      kwik_wall_materials_cost: updatedData.kwik_wall_materials_cost,
      misc_materials_cost: updatedData.misc_materials_cost,
      misc_materials_description: updatedData.misc_materials_description,
      delivery_cost_track: updatedData.delivery_cost_track,
      track_equipment_costs: updatedData.track_equipment_costs,
      track_labor_cost: updatedData.track_labor_cost,
      panel_equipment_costs: updatedData.panel_equipment_costs,
      panel_labor_cost: updatedData.panel_labor_cost,
      track_freight_factory: updatedData.track_freight_factory,
      panel_freight_factory: updatedData.panel_freight_factory,
      local_handling_costs: updatedData.local_handling_costs,
      gross_profit_percentage: updatedData.gross_profit_percentage,
      gross_profit_margin: updatedData.gross_profit_margin,
      
      // Auto-calculated fields
      unseen_costs: updatedData.unseen_costs,
      cost_subtotal: updatedData.cost_subtotal,
      base_selling_price: updatedData.base_selling_price,
      shipping_handling_subtotal: updatedData.shipping_handling_subtotal,
      shipping_freight_subtotal: updatedData.shipping_freight_subtotal,
      selling_price: updatedData.selling_price,
      
      // Legacy fields (for backward compatibility)
      basePrice: updatedData.basePrice,
      base_price: updatedData.basePrice, // Database field
      freight: updatedData.freight,
      total: updatedData.total,
      paymentUponDrawings: updatedData.paymentUponDrawings,
      payment_upon_drawings: updatedData.paymentUponDrawings, // Database field
      paymentUponTrackInstallation: updatedData.paymentUponTrackInstallation,
      payment_upon_track_installation: updatedData.paymentUponTrackInstallation // Database field
    };

    // Update all fields at once
    onFieldChange('price_details', '', updateData);
  };

  return (
    <CollapsibleSection
      title="Pricing (Enhanced)"
      icon={<DollarSign className="w-4 h-4 text-green-500" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <EnhancedPricingForm
        data={enhancedData}
        onUpdate={handlePricingUpdate}
        quoteData={data}
      />
    </CollapsibleSection>
  );
};