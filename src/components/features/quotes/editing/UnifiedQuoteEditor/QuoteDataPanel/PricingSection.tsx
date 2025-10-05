import React, { useState } from 'react';
import { DollarSign, Edit3 } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import EnhancedPricingForm from '@/components/features/quotes/forms/pricing/EnhancedPricingForm';
import { EnhancedPricingData, defaultEnhancedPricing } from '@/lib/types/pricing/enhancedPricing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PricingSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

interface PricingSectionPropsWithOnChange extends PricingSectionProps {
  onChange?: (section: string, value: any) => void;
  onDatabaseSave?: () => Promise<void>;
}

export const PricingSection: React.FC<PricingSectionPropsWithOnChange> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange,
  onChange,
  onDatabaseSave
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Use price_details directly since it's now EnhancedPricingData format
  const enhancedData = data.price_details || defaultEnhancedPricing;

  // Handle enhanced pricing data updates - now much simpler!
  const handlePricingUpdate = (updatedData: EnhancedPricingData) => {
    
    // Direct update since we're using EnhancedPricingData throughout
    if (onChange) {
      onChange('price_details', updatedData);
    } else {
      // Fallback: this won't work perfectly but maintains compatibility
      onFieldChange('price_details', '', updatedData);
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
      title="Pricing"
      icon={<DollarSign className="w-4 h-4 text-green-500" />}
      isOpen={isOpen}
      onToggle={onToggle}
      headerAction={
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 hover:text-blue-700 h-6 px-2 text-xs"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit Costs
            </Button>
          </DialogTrigger>
            <DialogContent className="max-w-none w-screen h-screen max-h-screen m-0 p-6 overflow-y-auto [&>button]:hidden">
              <DialogHeader className="flex flex-row items-center justify-between pr-6">
                <DialogTitle>Edit Cost Breakdown</DialogTitle>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={async () => {
                      if (onDatabaseSave) {
                        await onDatabaseSave();
                      }
                      setIsEditDialogOpen(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Save Changes
                  </Button>
                  <Button 
                    onClick={() => setIsEditDialogOpen(false)}
                    variant="outline"
                    size="lg"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Close
                  </Button>
                </div>
              </DialogHeader>
              <EnhancedPricingForm
                data={enhancedData}
                onUpdate={handlePricingUpdate}
                // quoteData={data}
              />
            </DialogContent>
          </Dialog>
      }
    >
      <div className="space-y-4">
        {/* Inline Payment Terms Editor */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Payment Upon Drawings (%)</Label>
            <Input
              // type="number"
              value={enhancedData.payment_upon_drawings}
              onChange={(e) => {
                const updatedData = { ...enhancedData, payment_upon_drawings: e.target.value };
                handlePricingUpdate(updatedData);
              }}
              className="h-10 text-md"
              min="0"
              max="100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Payment Upon Track Installation (%)</Label>
            <Input
              // type="number"
              value={enhancedData.payment_upon_track_installation}
              onChange={(e) => {
                const updatedData = { ...enhancedData, payment_upon_track_installation: e.target.value };
                handlePricingUpdate(updatedData);
              }}
              className="h-10 text-md"
              min="0"
              max="100"
            />
          </div>
        </div>
        
        {/* Clean Vertical Pricing Display */}
        <div className="space-y-3 p-3 bg-gray-50 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Base Selling Price</span>
            <span className="text-lg font-semibold text-gray-900">{formatCurrency(enhancedData.base_selling_price)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Shipping Selling Price</span>
            <span className="text-lg font-semibold text-gray-900">{formatCurrency(enhancedData.shipping_selling_price)}</span>
          </div>
          
          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-base font-semibold text-gray-800">Final Selling Price</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(enhancedData.final_selling_price)}</span>
          </div>
        </div>
        
        {/* Pricing Details */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex justify-center mb-3">
            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
              Use Edit Costs above for advanced configuration
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cost Subtotal</span>
              <span className="text-sm font-medium text-gray-800">{formatCurrency(enhancedData.cost_subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600">Base Gross Profit ({(enhancedData.base_selling_gross_profit_percentage || 0).toFixed(1)}%)</span>
              <span className="text-sm font-medium text-blue-600">{formatCurrency(materialsMarkupAmount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Shipping Cost Subtotal</span>
              <span className="text-sm font-medium text-gray-800">{formatCurrency(enhancedData.shipping_cost_subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600">Shipping Gross Profit ({(enhancedData.shipping_selling_gross_profit_percentage || 0).toFixed(1)}%)</span>
              <span className="text-sm font-medium text-blue-600">{formatCurrency(shippingMarkupAmount)}</span>
            </div>

            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-semibold text-green-700">Total Gross Profit ({(enhancedData.final_selling_gross_profit_percentage || 0).toFixed(1)}%)</span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(enhancedData.final_selling_price_profit_amount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};