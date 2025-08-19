import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

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
}) => (
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
        <Input
          id="basePrice"
          type="number"
          value={data.price_details?.basePrice || data.price_details?.base_price || ''}
          onChange={(e) => onFieldChange('price_details', 'basePrice', e.target.value)}
          placeholder="0.00"
          className="text-sm"
        />
      </div>
      
      <div>
        <Label htmlFor="freight" className="text-xs font-medium text-gray-600">
          Estimated Freight + Delivery ($)
        </Label>
        <Input
          id="freight"
          // type="number"
          value={data.price_details?.freight || ''}
          onChange={(e) => onFieldChange('price_details', 'freight', e.target.value)}
          placeholder="0.00"
          className="text-sm"
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
          <Input
            id="paymentDrawings"
            type="number"
            value={data.price_details?.payment_upon_drawings || ''}
            onChange={(e) => onFieldChange('price_details', 'payment_upon_drawings', e.target.value)}
            placeholder="33"
            className="text-sm"
          />
        </div>
        
        <div>
          <Label htmlFor="paymentTrack" className="text-xs font-medium text-gray-600">
            Payment on Track (%)
          </Label>
          <Input
            id="paymentTrack"
            type="number"
            value={data.price_details?.payment_upon_track_installation || ''}
            onChange={(e) => onFieldChange('price_details', 'payment_upon_track_installation', e.target.value)}
            placeholder="33"
            className="text-sm"
          />
        </div>
      </div>
    </div>
  </CollapsibleSection>
);