import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ValidatedInput } from '@/components/ui/validated-input';
import { Contact } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { QuoteDataPanelProps, FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import { useFormValidation } from '@/hooks/useFormValidation';

interface ContactInfoSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange
}) => {
  const { validateAndUpdate, getFieldError, isFieldValid, markFieldTouched } = useFormValidation();
  
  const handleValidatedChange = (field: string, value: string, validationType?: string) => {
    const sanitizedValue = validateAndUpdate(field, value, validationType);
    onFieldChange('quote_details', field, sanitizedValue);
  };

  return (
  <CollapsibleSection
    title="Contact Info"
    icon={<Contact className="w-4 h-4 text-blue-500" />}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-3">
      <div>
        <Label htmlFor="contactName" className="text-xs font-medium text-gray-600">
          Contact Name
        </Label>
        <Input
          id="contactName"
          value={data.quote_details?.contactName || ''}
          onChange={(e) => onFieldChange('quote_details', 'contactName', e.target.value)}
          placeholder="Ed Michinski"
          className="text-sm"
        />
      </div>
      
      <div>
        <Label htmlFor="contactEmail" className="text-xs font-medium text-gray-600">
          Contact Email
        </Label>
        <ValidatedInput
          id="contactEmail"
          validationType="email"
          value={data.quote_details?.contactEmail || data.quote_details?.email || ''}
          onValueChange={(value) => handleValidatedChange('contactEmail', value, 'email')}
          onBlur={() => markFieldTouched('contactEmail')}
          placeholder="contact@company.com"
          className="text-sm"
          errorMessage={getFieldError('contactEmail')}
          isValid={isFieldValid('contactEmail')}
        />
      </div>
      
      <div>
        <Label htmlFor="phone" className="text-xs font-medium text-gray-600">
          Phone
        </Label>
        <ValidatedInput
          id="phone"
          validationType="phone"
          value={data.quote_details?.phone || ''}
          onValueChange={(value) => handleValidatedChange('phone', value, 'phone')}
          onBlur={() => markFieldTouched('phone')}
          placeholder="(973) 884-0474"
          className="text-sm"
          errorMessage={getFieldError('phone')}
          isValid={isFieldValid('phone')}
        />
      </div>
      
      <div>
        <Label htmlFor="fax" className="text-xs font-medium text-gray-600">
          Fax
        </Label>
        <Input
          id="fax"
          value={data.quote_details?.fax || ''}
          onChange={(e) => onFieldChange('quote_details', 'fax', e.target.value)}
          placeholder="Fax number"
          className="text-sm"
        />
      </div>
      
      <div>
        <Label htmlFor="website" className="text-xs font-medium text-gray-600">
          Website
        </Label>
        <ValidatedInput
          id="website"
          validationType="website"
          value={data.quote_details?.website || ''}
          onValueChange={(value) => handleValidatedChange('website', value, 'website')}
          onBlur={() => markFieldTouched('website')}
          placeholder="www.contemporarywalls.com"
          className="text-sm"
          errorMessage={getFieldError('website')}
          isValid={isFieldValid('website')}
        />
      </div>
      
      <div>
        <Label htmlFor="address" className="text-xs font-medium text-gray-600">
          Address
        </Label>
        <Textarea
          id="address"
          value={data.quote_details?.address || ''}
          onChange={(e) => onFieldChange('quote_details', 'address', e.target.value)}
          placeholder="567 Commerce St, Franklin Lakes, NJ, 07417"
          className="text-sm resize-none"
          rows={2}
        />
      </div>
    </div>
  </CollapsibleSection>
  );
};