import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FormFieldProps } from '../types';

export const FormField: React.FC<FormFieldProps> = ({
  selectedModel,
  disabled = false,
  value,
  onChange,
  placeholder,
  label,
  required = false
}) => {
  const isDisabled = disabled || !selectedModel;
  const displayPlaceholder = placeholder || (selectedModel ? `Select ${label.toLowerCase()}` : "Select model first");

  return (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>
        {label}{required && ' *'}
      </Label>
      <Select 
        value={value} 
        onValueChange={onChange}
        disabled={isDisabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={displayPlaceholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50">
          {/* Options will be provided by parent component */}
        </SelectContent>
      </Select>
    </div>
  );
};

// Generic field wrapper with options
interface SelectFieldProps extends FormFieldProps {
  options: string[];
}

export const SelectField: React.FC<SelectFieldProps> = ({
  options,
  ...props
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.label.toLowerCase().replace(/\s+/g, '-')}>
        {props.label}{props.required && ' *'}
      </Label>
      <Select 
        value={props.value} 
        onValueChange={props.onChange}
        disabled={props.disabled || !props.selectedModel}
      >
        <SelectTrigger>
          <SelectValue placeholder={props.placeholder || (props.selectedModel ? `Select ${props.label.toLowerCase()}` : "Select model first")} />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};