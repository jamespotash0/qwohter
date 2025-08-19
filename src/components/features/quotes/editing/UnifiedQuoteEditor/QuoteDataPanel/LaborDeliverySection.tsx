import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

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
}) => (
  <CollapsibleSection
    title="Labor & Delivery"
    icon={<Truck className="w-4 h-4 text-orange-500" />}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-3">
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
            {/* <SelectItem value="Mixed">Mixed</SelectItem> */}
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
            {/* <SelectItem value="Fixed">Fixed</SelectItem> */}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="trackDelivery" className="text-xs font-medium text-gray-600">
            Track Delivery (Weeks)
          </Label>
          <Input
            id="trackDelivery"
            value={data.delivery_details?.trackDeliveryWeeks || ''}
            onChange={(e) => onFieldChange('delivery_details', 'trackDeliveryWeeks', e.target.value)}
            placeholder="4"
            className="text-sm"
          />
        </div>
        
        <div>
          <Label htmlFor="panelDelivery" className="text-xs font-medium text-gray-600">
            Panel Delivery (Weeks)
          </Label>
          <Input
            id="panelDelivery"
            value={data.delivery_details?.panelDeliveryWeeks || ''}
            onChange={(e) => onFieldChange('delivery_details', 'panelDeliveryWeeks', e.target.value)}
            placeholder="8"
            className="text-sm"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="trackInstall" className="text-xs font-medium text-gray-600">
            Track Install (Days)
          </Label>
          <Input
            id="trackInstall"
            value={data.delivery_details?.trackInstallationDays || ''}
            onChange={(e) => onFieldChange('delivery_details', 'trackInstallationDays', e.target.value)}
            placeholder="2"
            className="text-sm"
          />
        </div>
        
        <div>
          <Label htmlFor="panelInstall" className="text-xs font-medium text-gray-600">
            Panel Install (Days)
          </Label>
          <Input
            id="panelInstall"
            value={data.delivery_details?.panelInstallationDays || ''}
            onChange={(e) => onFieldChange('delivery_details', 'panelInstallationDays', e.target.value)}
            placeholder="3"
            className="text-sm"
          />
        </div>
      </div>
    </div>
  </CollapsibleSection>
);