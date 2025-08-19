import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Contact } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { QuoteDataPanelProps, FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

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
}) => (
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
        <Input
          id="contactEmail"
          value={data.quote_details?.contactEmail || data.quote_details?.email || ''}
          onChange={(e) => onFieldChange('quote_details', 'contactEmail', e.target.value)}
          placeholder="contact@company.com"
          className="text-sm"
        />
      </div>
      
      <div>
        <Label htmlFor="phone" className="text-xs font-medium text-gray-600">
          Phone
        </Label>
        <Input
          id="phone"
          value={data.quote_details?.phone || ''}
          onChange={(e) => onFieldChange('quote_details', 'phone', e.target.value)}
          placeholder="(973) 884-0474"
          className="text-sm"
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
        <Input
          id="website"
          value={data.quote_details?.website || ''}
          onChange={(e) => onFieldChange('quote_details', 'website', e.target.value)}
          placeholder="contemporarywalls.com"
          className="text-sm"
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