import React, { useMemo, useState } from 'react';
import { DollarSign, Edit3 } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import EnhancedPricingForm from '@/components/features/quotes/forms/pricing/EnhancedPricingForm';
import { EnhancedPricingData, defaultEnhancedPricing } from '@/lib/types/pricing/enhancedPricing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PricingSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

interface PricingSectionPropsWithOnChange extends PricingSectionProps {
  onChange?: (section: string, value: any) => void;
}

export const PricingSection: React.FC<PricingSectionPropsWithOnChange> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange,
  onChange
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Convert current price_details to EnhancedPricingData format
  const enhancedData = useMemo((): EnhancedPricingData => {
    const priceDetails = data.price_details || {};
    
    return {
      // If enhanced data exists, use it; otherwise use defaults
      kwik_wall_materials_cost: priceDetails.kwik_wall_materials_cost || 0,
      misc_materials_cost: priceDetails.misc_materials_cost || 0,
      delivery_cost_track: priceDetails.delivery_cost_track || 0,
      delivery_cost_panel: priceDetails.delivery_cost_panel || 0,
      track_equipment_costs: priceDetails.track_equipment_costs || 0,
      track_labor_cost: priceDetails.track_labor_cost || 0,
      panel_equipment_costs: priceDetails.panel_equipment_costs || 0,
      panel_labor_cost: priceDetails.panel_labor_cost || 0,
      track_freight_factory: priceDetails.track_freight_factory || 0,
      panel_freight_factory: priceDetails.panel_freight_factory || 0,
      local_handling_costs: priceDetails.local_handling_costs || 0,
      materials_markup_percentage: priceDetails.materials_markup_percentage, 
      shipping_markup_percentage: priceDetails.shipping_markup_percentage, 
      
      // Auto-calculated fields (will be recalculated)
      unseen_costs: priceDetails.unseen_costs || 0,
      unseen_costs_percentage: priceDetails.unseen_costs_percentage || 10,
      unseen_costs_locked: priceDetails.unseen_costs_locked !== false, // Default to true
      cost_subtotal: priceDetails.cost_subtotal || 0,
      base_selling_price: priceDetails.base_selling_price || 0,
      shipping_cost_subtotal: priceDetails.shipping_cost_subtotal || 0,
      shipping_selling_price: priceDetails.shipping_selling_price || 0,
      final_selling_price: priceDetails.final_selling_price || 0,
      base_selling_gross_profit_percentage: priceDetails.base_selling_gross_profit_percentage || 0,
      shipping_selling_gross_profit_percentage: priceDetails.shipping_selling_gross_profit_percentage || 0,
      final_selling_gross_profit_percentage: priceDetails.final_selling_gross_profit_percentage || 0,
      final_selling_price_profit_amount: priceDetails.final_selling_price_profit_amount || 0,
      payment_upon_drawings: priceDetails.payment_upon_drawings || '33',
      payment_upon_track_installation: priceDetails.payment_upon_track_installation || '33',
    };
  }, [data.price_details]);

  // Handle enhanced pricing data updates
  const handlePricingUpdate = (updatedData: EnhancedPricingData) => {
    console.log('🔄 PricingSection: Updating pricing data:', updatedData);
    
    // Convert back to the format expected by the parent component
    const updateData = {
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
      
      // Auto-calculated fields
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
      final_selling_price_profit_amount: updatedData.final_selling_price_profit_amount,
      payment_upon_drawings: updatedData.payment_upon_drawings, // Database field
      payment_upon_track_installation: updatedData.payment_upon_track_installation // Database field
    };

    // Update the entire price_details section at once
    // Merge with existing price_details to preserve any other fields
    const mergedPriceDetails = {
      ...data.price_details,
      ...updateData
    };
    
    console.log('💾 PricingSection: Sending merged price details to UnifiedQuoteEditor:', mergedPriceDetails);
    
    // Use onChange if available (preferred for bulk updates), otherwise use onFieldChange
    if (onChange) {
      onChange('price_details', mergedPriceDetails);
    } else {
      // Fallback: this won't work perfectly but maintains compatibility
      onFieldChange('price_details', '', updateData);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate markup amounts - use stored gross profit percentages
  const materialsMarkupAmount = enhancedData.base_selling_price - enhancedData.cost_subtotal;
  const shippingMarkupAmount = enhancedData.shipping_selling_price - enhancedData.shipping_cost_subtotal;
  
  return (
    <CollapsibleSection
      title="Pricing (Enhanced)"
      icon={<DollarSign className="w-4 h-4 text-green-500" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {/* Simplified Cost Breakdown Display */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Materials Cost:</span>
              <span className="font-medium">{formatCurrency(enhancedData.kwik_wall_materials_cost + enhancedData.misc_materials_cost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Labor & Equipment:</span>
              <span className="font-medium">{formatCurrency(enhancedData.track_labor_cost + enhancedData.panel_labor_cost + enhancedData.track_equipment_costs + enhancedData.panel_equipment_costs)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Costs:</span>
              <span className="font-medium">{formatCurrency(enhancedData.delivery_cost_track + enhancedData.delivery_cost_panel)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unseen Costs ({enhancedData.unseen_costs_percentage}%):</span>
              <span className="font-medium">{formatCurrency(enhancedData.unseen_costs)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cost Subtotal:</span>
              <span className="font-medium">{formatCurrency(enhancedData.cost_subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Selling Price:</span>
              <span className="font-medium">{formatCurrency(enhancedData.base_selling_price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Base Gross Profit ({enhancedData.base_selling_gross_profit_percentage.toFixed(1)}%):</span>
              <span className="font-medium text-blue-600">{formatCurrency(materialsMarkupAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping & Freight Cost Subtotal:</span>
              <span className="font-medium">{formatCurrency(enhancedData.shipping_cost_subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">Shipping & Freight Gross Profit ({enhancedData.shipping_selling_gross_profit_percentage.toFixed(1)}%):</span>
              <span className="font-medium text-blue-600">{formatCurrency(shippingMarkupAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span className="text-gray-900">Final Selling Price:</span>
              <span className="text-green-600">{formatCurrency(enhancedData.final_selling_price)}</span>
            </div>
            {/* Total Gross Profit - only show if we have values */}
            {enhancedData.final_selling_price > 0 && (enhancedData.cost_subtotal > 0 || enhancedData.shipping_cost_subtotal > 0) && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-medium text-gray-700">
                  Total Gross Profit ({enhancedData.final_selling_gross_profit_percentage.toFixed(1)}%)
                </span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(enhancedData.final_selling_price_profit_amount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Terms */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Upon Drawings:</span>
            <span className="font-medium">{enhancedData.payment_upon_drawings}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Upon Track Installation:</span>
            <span className="font-medium">{enhancedData.payment_upon_track_installation}%</span>
          </div>
        </div>

        {/* Edit Costs Button */}
        <div className="flex justify-center pt-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit Costs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Cost Breakdown</DialogTitle>
              </DialogHeader>
              <EnhancedPricingForm
                data={enhancedData}
                onUpdate={handlePricingUpdate}
                quoteData={data}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </CollapsibleSection>
  );
};