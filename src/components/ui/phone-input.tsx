/**
 * Phone Number Input Component
 *
 * Auto-formatting phone input with validation
 */

import React, { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneNumber, validators } from "@/utils/validation";
import { cn } from "@/lib/utils";

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  label?: string;
  error?: string;
  showValidation?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    value = '',
    onChange,
    onValidationChange,
    label = 'Phone Number',
    error,
    showValidation = true,
    className,
    required,
    disabled,
    placeholder = "(555) 123-4567",
    ...props
  }, ref) => {
    const [internalError, setInternalError] = useState<string | undefined>();
    const [touched, setTouched] = useState(false);

    const displayError = error || (touched && showValidation ? internalError : undefined);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formattedValue = formatPhoneNumber(rawValue);

      // Validate the formatted value
      const validation = validators.phoneNumber(formattedValue);
      setInternalError(validation.isValid ? undefined : validation.error);

      // Call validation change callback
      if (onValidationChange) {
        onValidationChange(validation.isValid, validation.error);
      }

      // Call onChange with formatted value
      if (onChange) {
        onChange(formattedValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label
            htmlFor={props.id}
            className="text-[#171717] font-medium text-sm"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        <Input
          {...props}
          ref={ref}
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "bg-[#f7f2e9]/50 border-[#171717]/10 h-12 rounded-full placeholder:text-[#171717]/40 hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70 focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white",
            displayError && "border-red-500 focus:border-red-500",
            className
          )}
          autoComplete="tel"
          inputMode="numeric"
          maxLength={14} // (555) 123-4567
        />

        {displayError && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-red-600">{displayError}</span>
          </div>
        )}

        {!displayError && touched && showValidation && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-green-600">✓ Valid phone number</span>
          </div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";