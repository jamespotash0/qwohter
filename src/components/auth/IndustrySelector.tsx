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
  { value: 'construction', label: 'Construction' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'financial-services', label: 'Financial Services' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'non-profit', label: 'Non-Profit' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' }
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
    if (selectedValue === 'other') {
      setIsCustomSelected(true);
      if (customIndustry) {
        onChange(customIndustry);
      }
    } else {
      setIsCustomSelected(false);
      onChange(selectedValue);
    }
  };

  const handleCustomChange = (customValue: string) => {
    setCustomIndustry(customValue);
    if (isCustomSelected) {
      onChange(customValue);
    }
  };

  // Determine what should be shown in the select
  const displayValue = isCustomSelected ? 'other' : value;

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