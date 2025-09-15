import React, { forwardRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { inputRestrictions } from '@/utils/formValidation';
import { cn } from '@/lib/utils';

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  validationType?: 
    | 'email'
    | 'phone' 
    | 'website'
    | 'address'
    | 'numbersOnly'
    | 'numbersWithDecimals'
    | 'numbersWithFractionsHyphen'
    | 'currency'
    | 'percentage';
  errorMessage?: string;
  isValid?: boolean;
  onValueChange?: (value: string) => void;
  onValidatedChange?: (value: string, isValid: boolean) => void;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ 
    className, 
    validationType,
    errorMessage,
    isValid = true,
    onValueChange,
    onValidatedChange,
    onKeyDown,
    onBlur,
    ...props 
  }, ref) => {
    
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      // Apply input restrictions based on validation type
      switch (validationType) {
        case 'numbersOnly':
          inputRestrictions.numbersOnly(e);
          break;
        case 'numbersWithDecimals':
        case 'currency':
        case 'percentage':
          inputRestrictions.numbersWithDecimals(e);
          break;
        case 'numbersWithFractionsHyphen':
          inputRestrictions.numbersWithFractionsHyphen(e);
          break;
        case 'phone':
          inputRestrictions.phone(e);
          break;
      }
      
      onKeyDown?.(e);
    }, [validationType, onKeyDown]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onValueChange?.(value);
      onValidatedChange?.(value, isValid);
    }, [onValueChange, onValidatedChange, isValid]);

    const inputClassName = cn(
      "transition-colors duration-200",
      errorMessage && !isValid
        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
        : isValid === false 
        ? "border-red-500 focus:border-red-500 focus:ring-red-200"
        : "border-input focus:border-ring",
      className
    );

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          className={inputClassName}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          onBlur={onBlur}
          {...props}
        />
        {errorMessage && !isValid && (
          <p className="text-xs text-red-500 animate-in slide-in-from-left-1 duration-200">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";