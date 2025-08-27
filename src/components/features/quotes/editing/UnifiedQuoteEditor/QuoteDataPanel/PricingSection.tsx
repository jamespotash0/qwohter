import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidatedInput } from '@/components/ui/validated-input';
import { DollarSign } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import { useFormValidation } from '@/hooks/useFormValidation';

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
  const { validateAndUpdate, getFieldError, isFieldValid, markFieldTouched } = useFormValidation();
  
  const handleValidatedChange = (field: string, value: string, validationType?: string) => {
    const sanitizedValue = validateAndUpdate(field, value, validationType);
    onFieldChange('price_details', field, sanitizedValue);
  };

  return (
  <CollapsibleSection
    title="Pricing"
    icon={<DollarSign className="w-4 h-4 text-green-500" />}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-3">
      <div>
        <Label htmlFor="basePrice" className="text-xs font-medium text-gray-600">
          Base Price ($)
        </Label>
        <ValidatedInput
          id="basePrice"
          validationType="currency"
          value={data.price_details?.basePrice || data.price_details?.base_price || ''}
          onValueChange={(value) => handleValidatedChange('basePrice', value, 'basePrice')}
          onBlur={() => markFieldTouched('basePrice')}
          placeholder="0.00"
          className="text-sm"
          errorMessage={getFieldError('basePrice')}
          isValid={isFieldValid('basePrice')}
        />
      </div>
      
      <div>
        <Label htmlFor="freight" className="text-xs font-medium text-gray-600">
          Estimated Freight + Delivery ($)
        </Label>
        <ValidatedInput
          id="freight"
          validationType="currency"
          value={data.price_details?.freight || ''}
          onValueChange={(value) => handleValidatedChange('freight', value, 'freight')}
          onBlur={() => markFieldTouched('freight')}
          placeholder="0.00"
          className="text-sm"
          errorMessage={getFieldError('freight')}
          isValid={isFieldValid('freight')}
        />
      </div>
      
      <div>
        <Label htmlFor="total" className="text-xs font-medium text-gray-600">
          Total $ (Auto-calculated)
        </Label>
        <Input
          id="total"
          value={data.price_details?.total || ''}
          readOnly
          placeholder="0.00"
          className="text-sm bg-gray-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="paymentDrawings" className="text-xs font-medium text-gray-600">
            Payment on Drawings (%)
          </Label>
          <ValidatedInput
            id="paymentDrawings"
            validationType="percentage"
            value={data.price_details?.payment_upon_drawings || ''}
            onValueChange={(value: string) => handleValidatedChange('payment_upon_drawings', value, 'paymentPercentage')}
            onBlur={() => markFieldTouched('payment_upon_drawings')}
            placeholder="33"
            className="text-sm"
            errorMessage={getFieldError('payment_upon_drawings')}
            isValid={isFieldValid('payment_upon_drawings')}
          />
        </div>
        
        <div>
          <Label htmlFor="paymentTrack" className="text-xs font-medium text-gray-600">
            Payment on Track (%)
          </Label>
          <ValidatedInput
            id="paymentTrack"
            validationType="percentage"
            value={data.price_details?.payment_upon_track_installation || ''}
            onValueChange={(value: string) => handleValidatedChange('payment_upon_track_installation', value, 'paymentPercentage')}
            onBlur={() => markFieldTouched('payment_upon_track_installation')}
            placeholder="33"
            className="text-sm"
            errorMessage={getFieldError('payment_upon_track_installation')}
            isValid={isFieldValid('payment_upon_track_installation')}
          />
        </div>
      </div>
    </div>
  </CollapsibleSection>
  );
};