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
  { value: 'Google Search', label: 'Google Search' },
  { value: 'Social Media', label: 'Social Media' },
  { value: 'Referral from Friend/Colleague', label: 'Referral from Friend/Colleague' },
  { value: 'Industry Website', label: 'Industry Website' },
  { value: 'Trade Show/Conference', label: 'Trade Show/Conference' },
  { value: 'Online Advertisement', label: 'Online Advertisement' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Email Newsletter', label: 'Email Newsletter' },
  { value: 'Blog Article', label: 'Blog Article' },
  { value: 'Podcast', label: 'Podcast' },
  { value: 'Webinar', label: 'Webinar' },
  { value: 'Existing Customer', label: 'Existing Customer' },
  { value: 'Partner Recommendation', label: 'Partner Recommendation' },
  { value: 'Other', label: 'Other' }
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
    if (selectedValue === 'Other') {
      setIsCustomSelected(true);
      if (customSource) {
        onChange(customSource);
      } else {
        onChange(''); // Clear value when "Other" is selected without custom input
      }
    } else {
      setIsCustomSelected(false);
      // Values and labels now match (both capitalized), so just pass the value directly
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (customValue: string) => {
    setCustomSource(customValue);
    if (isCustomSelected) {
      onChange(customValue);
    }
  };

  // Values and labels now match (both capitalized), so we can use value directly
  const displayValue = isCustomSelected ? 'Other' : value;

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