import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  touched?: boolean;  // Whether this field has been touched by the user
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  onFocus,
  placeholder = "Enter dollar amount",
  className,
  disabled = false,
  name,
  id,
  touched = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number to currency string
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  // Parse currency string to number
  const parseCurrency = (str: string): number => {
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Clean input to allow only valid characters
  const cleanInput = (input: string): string => {
    // Remove everything except digits, decimal point, and commas
    return input.replace(/[^0-9.,]/g, '');
  };

  // Initialize display value
  useEffect(() => {
    if (!isFocused) {
      // Show empty string when value is 0 AND field hasn't been touched (show placeholder)
      // If touched, show the formatted $0.00 (user explicitly entered 0)
      if (value === 0 && !touched) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatCurrency(value));
      }
    }
  }, [value, isFocused, touched]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show empty string if value is 0 AND not touched (never filled), otherwise show raw number for editing
    if (value === 0 && !touched) {
      setDisplayValue('');
    } else {
      const rawValue = value.toString();
      setDisplayValue(rawValue);
    }
    // Call the onFocus prop if provided
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Only call onChange if user actually entered something
    // If displayValue is empty and value is already 0, don't call onChange (user just clicked in/out)
    if (displayValue.trim() !== '') {
      const numericValue = parseCurrency(displayValue);
      onChange(numericValue);
      setDisplayValue(formatCurrency(numericValue));
    } else if (value !== 0) {
      // User cleared the field - set to 0
      onChange(0);
      setDisplayValue('');
    } else {
      // displayValue is empty and value is 0 - user just clicked in/out without typing
      // Don't call onChange, just reset display
      setDisplayValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleaned = cleanInput(inputValue);
    
    // Allow empty input
    if (cleaned === '') {
      setDisplayValue('');
      return;
    }

    // Validate the input is a valid number format
    const validNumberPattern = /^[0-9]*\.?[0-9]*$/;
    if (validNumberPattern.test(cleaned)) {
      setDisplayValue(cleaned);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z (Windows/Linux)
        // Allow: Cmd+A, Cmd+C, Cmd+V, Cmd+X, Cmd+Z (Mac)
        (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
        (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
        (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
        (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
        (e.keyCode === 90 && (e.ctrlKey === true || e.metaKey === true)) ||
        // Allow: home, end, left, right, down, up
        (e.keyCode >= 35 && e.keyCode <= 40)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      // Allow decimal point
      if (e.keyCode !== 190 && e.keyCode !== 110) {
        e.preventDefault();
      }
    }
    
    // Only allow one decimal point
    if ((e.keyCode === 190 || e.keyCode === 110) && displayValue.includes('.')) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const cleaned = cleanInput(paste);
    const numericValue = parseCurrency(cleaned);
    
    if (!isNaN(numericValue)) {
      setDisplayValue(cleaned);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      disabled={disabled}
      name={name}
      id={id}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
};
