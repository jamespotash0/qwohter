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
    <div className="space-y-3">
      <Label htmlFor="industry" className="text-slate-700 font-medium text-sm">
        Industry {required && <span className="text-red-500">*</span>}
      </Label>

      <Select
        value={displayValue}
        onValueChange={handleSelectChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
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
          <Label htmlFor="custom-industry" className="text-slate-600 text-sm">
            Please specify your industry
          </Label>
          <Input
            id="custom-industry"
            type="text"
            value={customIndustry}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter your industry"
            className="bg-slate-50 border-slate-200 h-12"
            disabled={disabled}
            required={required && isCustomSelected}
          />
        </div>
      )}
    </div>
  );
};