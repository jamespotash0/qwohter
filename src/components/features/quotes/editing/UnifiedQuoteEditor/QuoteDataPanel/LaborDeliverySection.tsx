import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ValidatedInput } from '@/components/ui/validated-input';
import { Truck } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import { useFormValidation } from '@/hooks/useFormValidation';

interface LaborDeliverySectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

export const LaborDeliverySection: React.FC<LaborDeliverySectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange
}) => {
  const { validateAndUpdate, getFieldError, isFieldValid, markFieldTouched } = useFormValidation();
  
  const handleValidatedDeliveryChange = (field: string, value: string, validationType?: string) => {
    const sanitizedValue = validateAndUpdate(field, value, validationType);
    onFieldChange('delivery_details', field, sanitizedValue);
  };

  const handleValidatedLaborChange = (field: string, value: string, validationType?: string) => {
    const sanitizedValue = validateAndUpdate(field, value, validationType);
    onFieldChange('labor_details', field, sanitizedValue);
  };

  return (
  <CollapsibleSection
    title="Labor & Delivery"
    icon={<Truck className="w-4 h-4 text-orange-500" />}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label htmlFor="laborType" className="text-xs font-medium text-gray-600">
          Labor Type
        </Label>
        <Select
          value={data.labor_details?.laborType || ''}
          onValueChange={(value) => onFieldChange('labor_details', 'laborType', value)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select labor type" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem value="Union">Union</SelectItem>
            <SelectItem value="Non-Union">Non-Union</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="wageRate" className="text-xs font-medium text-gray-600">
          Wage Rate
        </Label>
        <Select
          value={data.labor_details?.wageRate || ''}
          onValueChange={(value) => onFieldChange('labor_details', 'wageRate', value)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select wage rate" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem value="Prevailing">Prevailing</SelectItem>
            <SelectItem value="Standard">Standard</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
      
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label htmlFor="shopDrawing" className="text-xs font-medium text-gray-600">
          Shop Drawing (Weeks)
        </Label>
        <ValidatedInput
          id="shopDrawing"
          validationType="numbersWithHyphen"
          value={data.delivery_details?.shopDrawingWeeks || ''}
          onValueChange={(value: string) => handleValidatedDeliveryChange('shopDrawingWeeks', value, 'shopDrawingWeeks')}
          onBlur={() => markFieldTouched('shopDrawingWeeks')}
          placeholder="2 or 7-11"
          className="text-sm"
          errorMessage={getFieldError('shopDrawingWeeks')}
          isValid={isFieldValid('shopDrawingWeeks')}
        />
      </div>
      
      <div>
        <Label htmlFor="trackDelivery" className="text-xs font-medium text-gray-600">
          Track Delivery (Weeks)
        </Label>
        <ValidatedInput
          id="trackDelivery"
          validationType="numbersWithHyphen"
          value={data.delivery_details?.trackDeliveryWeeks || ''}
          onValueChange={(value: string) => handleValidatedDeliveryChange('trackDeliveryWeeks', value, 'trackDeliveryWeeks')}
          onBlur={() => markFieldTouched('trackDeliveryWeeks')}
          placeholder="4 or 7-11"
          className="text-sm"
          errorMessage={getFieldError('trackDeliveryWeeks')}
          isValid={isFieldValid('trackDeliveryWeeks')}
        />
      </div>
      
      <div>
        <Label htmlFor="panelDelivery" className="text-xs font-medium text-gray-600">
          Panel Delivery (Weeks)
        </Label>
        <ValidatedInput
          id="panelDelivery"
          validationType="numbersWithHyphen"
          value={data.delivery_details?.panelDeliveryWeeks || ''}
          onValueChange={(value: string) => handleValidatedDeliveryChange('panelDeliveryWeeks', value, 'panelDeliveryWeeks')}
          onBlur={() => markFieldTouched('panelDeliveryWeeks')}
          placeholder="8 or 7-11"
          className="text-sm"
          errorMessage={getFieldError('panelDeliveryWeeks')}
          isValid={isFieldValid('panelDeliveryWeeks')}
        />
      </div>
    </div>
      
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label htmlFor="trackInstall" className="text-xs font-medium text-gray-600">
          Track Install (Days)
        </Label>
        <ValidatedInput
          id="trackInstall"
          validationType="numbersWithHyphen"
          value={data.delivery_details?.trackInstallationDays || ''}
          onValueChange={(value: string) => handleValidatedDeliveryChange('trackInstallationDays', value, 'trackInstallationDays')}
          onBlur={() => markFieldTouched('trackInstallationDays')}
          placeholder="2 or 7-11"
          className="text-sm"
          errorMessage={getFieldError('trackInstallationDays')}
          isValid={isFieldValid('trackInstallationDays')}
        />
      </div>
      
      <div>
        <Label htmlFor="panelInstall" className="text-xs font-medium text-gray-600">
          Panel Install (Days)
        </Label>
        <ValidatedInput
          id="panelInstall"
          validationType="numbersWithHyphen"
          value={data.delivery_details?.panelInstallationDays || ''}
          onValueChange={(value: string) => handleValidatedDeliveryChange('panelInstallationDays', value, 'panelInstallationDays')}
          onBlur={() => markFieldTouched('panelInstallationDays')}
          placeholder="3 or 7-11"
          className="text-sm"
          errorMessage={getFieldError('panelInstallationDays')}
          isValid={isFieldValid('panelInstallationDays')}
        />
      </div>
    </div>
  </CollapsibleSection>
  );
};