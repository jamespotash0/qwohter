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
  { value: 'Referral', label: 'Referral' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Trade Show', label: 'Trade Show' },
  { value: 'Online Ad', label: 'Online Ad' },
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
    <div className="space-y-2">
      <Label
        htmlFor="found-via"
        className="text-[#171717] font-medium text-sm"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        How did you find out about us? {required && <span className="text-red-500">*</span>}
      </Label>

      <Select
        value={displayValue}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-[#f7f2e9]/50 border-[#171717]/10 h-12 rounded-full hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70 focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white">
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
          <Label
            htmlFor="custom-source"
            className="text-[#171717]/60 text-sm"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Please tell us how you found us
          </Label>
          <Input
            id="custom-source"
            type="text"
            value={customSource}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="How did you find out about us?"
            className="bg-[#f7f2e9]/50 border-[#171717]/10 h-12 rounded-full placeholder:text-[#171717]/40 hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70 focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white"
            disabled={disabled}
            required={required && isCustomSelected}
          />
        </div>
      )}
    </div>
  );
};