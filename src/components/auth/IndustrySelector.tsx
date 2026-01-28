/**
 * Industry Selector Component
 *
 * Dropdown for selecting organization industry with custom option
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export interface IndustrySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const INDUSTRY_OPTIONS = [
  { value: 'Construction', label: 'Construction' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Education', label: 'Education' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Energy & Utilities', label: 'Energy & Utilities' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Non-Profit', label: 'Non-Profit' },
  { value: 'Government', label: 'Government' },
  { value: 'Other', label: 'Other' }
];

export const IndustrySelector: React.FC<IndustrySelectorProps> = ({
  value = '',
  onChange,
  required = false,
  disabled = false
}) => {
  const [customIndustry, setCustomIndustry] = useState('');
  const [isCustomSelected, setIsCustomSelected] = useState(
    value && !INDUSTRY_OPTIONS.find(option => option.value === value)
  );

  const handleSelectChange = (selectedValue: string) => {
    if (selectedValue === 'Other') {
      setIsCustomSelected(true);
      if (customIndustry) {
        onChange(customIndustry);
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
    setCustomIndustry(customValue);
    if (isCustomSelected) {
      onChange(customValue);
    }
  };

  // Values and labels now match (both capitalized), so we can use value directly
  const displayValue = isCustomSelected ? 'Other' : value;

  return (
    <div className="space-y-2">
      <Label
        htmlFor="industry"
        className="text-[#171717] font-medium text-sm"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        Industry {required && <span className="text-red-500">*</span>}
      </Label>

      <Select
        value={displayValue}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-[#f7f2e9]/50 border-[#171717]/10 h-12 rounded-full hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70 focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white">
          <SelectValue placeholder="Select your industry" />
        </SelectTrigger>
        <SelectContent>
          {INDUSTRY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCustomSelected && (
        <div className="space-y-2">
          <Label
            htmlFor="custom-industry"
            className="text-[#171717]/60 text-sm"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            Please specify your industry
          </Label>
          <Input
            id="custom-industry"
            type="text"
            value={customIndustry}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter your industry"
            className="bg-[#f7f2e9]/50 border-[#171717]/10 h-12 rounded-full placeholder:text-[#171717]/40 hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70 focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white"
            disabled={disabled}
            required={required && isCustomSelected}
          />
        </div>
      )}
    </div>
  );
};