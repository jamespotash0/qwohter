/**
 * Found Via Selector Component
 *
 * Dropdown for selecting how user found the application with custom option
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface FoundViaSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const FOUND_VIA_OPTIONS = [
  { value: 'google-search', label: 'Google Search' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'referral', label: 'Referral from Friend/Colleague' },
  { value: 'industry-website', label: 'Industry Website' },
  { value: 'trade-show', label: 'Trade Show/Conference' },
  { value: 'online-ad', label: 'Online Advertisement' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'email-newsletter', label: 'Email Newsletter' },
  { value: 'blog-article', label: 'Blog Article' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'existing-customer', label: 'Existing Customer' },
  { value: 'partner-recommendation', label: 'Partner Recommendation' },
  { value: 'other', label: 'Other' }
];

export const FoundViaSelector: React.FC<FoundViaSelectorProps> = ({
  value = '',
  onChange,
  required = false,
  disabled = false
}) => {
  const [customSource, setCustomSource] = useState('');
  const [isCustomSelected, setIsCustomSelected] = useState(
    value && !FOUND_VIA_OPTIONS.find(option => option.value === value)
  );

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'other') {
      setIsCustomSelected(true);
      if (customSource) {
        onChange(customSource);
      }
    } else {
      setIsCustomSelected(false);
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (customValue: string) => {
    setCustomSource(customValue);
    if (isCustomSelected) {
      onChange(customValue);
    }
  };

  // Determine what should be shown in the select
  const displayValue = isCustomSelected ? 'other' : value;

  return (
    <div className="space-y-3">
      <Label htmlFor="found-via" className="text-slate-700 font-medium text-sm">
        How did you find out about us? {required && <span className="text-red-500">*</span>}
      </Label>

      <Select
        value={displayValue}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
          <SelectValue placeholder="Select how you found us" />
        </SelectTrigger>
        <SelectContent>
          {FOUND_VIA_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCustomSelected && (
        <div className="space-y-2">
          <Label htmlFor="custom-source" className="text-slate-600 text-sm">
            Please tell us how you found us
          </Label>
          <Input
            id="custom-source"
            type="text"
            value={customSource}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="How did you find out about us?"
            className="bg-slate-50 border-slate-200 h-12"
            disabled={disabled}
            required={required && isCustomSelected}
          />
        </div>
      )}
    </div>
  );
};