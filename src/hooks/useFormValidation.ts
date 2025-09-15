import { useState, useCallback } from 'react';
import { fieldValidators, FormValidator, ValidationResult } from '@/utils/formValidation';

export interface ValidationState {
  [fieldName: string]: {
    isValid: boolean;
    errorMessage?: string;
    touched: boolean;
  };
}

export interface UseFormValidationReturn {
  validationState: ValidationState;
  validateField: (fieldName: string, value: string, validatorKey?: string) => ValidationResult;
  validateAndUpdate: (fieldName: string, value: string, validatorKey?: string) => string;
  markFieldTouched: (fieldName: string) => void;
  clearValidation: (fieldName: string) => void;
  hasErrors: () => boolean;
  getFieldError: (fieldName: string) => string | undefined;
  isFieldValid: (fieldName: string) => boolean;
}

export const useFormValidation = (): UseFormValidationReturn => {
  const [validationState, setValidationState] = useState<ValidationState>({});

  const validateField = useCallback((
    fieldName: string, 
    value: string, 
    validatorKey?: string
  ): ValidationResult => {
    const validator = validatorKey 
      ? fieldValidators[validatorKey as keyof typeof fieldValidators]
      : fieldValidators[fieldName as keyof typeof fieldValidators];

    if (!validator) {
      // If no specific validator, just sanitize
      return {
        isValid: true,
        sanitizedValue: FormValidator.sanitizeInput(value)
      };
    }

    return validator(value);
  }, []);

  const validateAndUpdate = useCallback((
    fieldName: string, 
    value: string, 
    validatorKey?: string
  ): string => {
    const result = validateField(fieldName, value, validatorKey);
    
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        isValid: result.isValid,
        errorMessage: result.errorMessage,
        touched: prev[fieldName]?.touched || false
      }
    }));

    // Return sanitized value or original value
    return result.sanitizedValue || value;
  }, [validateField]);

  const markFieldTouched = useCallback((fieldName: string) => { //new due to strict error
    setValidationState(prev => ({
      ...prev,
      [fieldName]: {
        isValid: prev[fieldName]?.isValid ?? true,
        errorMessage: prev[fieldName]?.errorMessage,
        touched: true
      }
    }));
  }, []);

  const clearValidation = useCallback((fieldName: string) => {
    setValidationState(prev => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
  }, []);

  const hasErrors = useCallback((): boolean => {
    return Object.values(validationState).some(field => !field.isValid && field.touched);
  }, [validationState]);

  const getFieldError = useCallback((fieldName: string): string | undefined => {
    const field = validationState[fieldName];
    return field?.touched && !field.isValid ? field.errorMessage : undefined;
  }, [validationState]);

  const isFieldValid = useCallback((fieldName: string): boolean => {
    const field = validationState[fieldName];
    return field ? field.isValid : true;
  }, [validationState]);

  return {
    validationState,
    validateField,
    validateAndUpdate,
    markFieldTouched,
    clearValidation,
    hasErrors,
    getFieldError,
    isFieldValid
  };
};