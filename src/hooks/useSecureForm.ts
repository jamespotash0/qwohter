import { useState, useCallback } from 'react';
import { sanitizeInput, /*validateSecurity*/ } from '@/utils/security';

interface FormField {
  value: string;
  error: string | null;
  dirty: boolean;
}

interface FormValidationRules {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'email' | 'number' | 'uuid';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => string | null;
  };
}

export function useSecureForm<T extends Record<string, FormField>>(
  initialFields: T,
  validationRules?: FormValidationRules
) {
  const [fields, setFields] = useState<T>(initialFields);

  const validateField = useCallback((name: string, value: string): string | null => {
    const rules = validationRules?.[name];
    if (!rules) return null;

    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      return `${name} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value.trim()) return null;

    // Length validations
    if (rules.minLength && value.length < rules.minLength) {
      return `${name} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `${name} cannot exceed ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return `${name} format is invalid`;
    }

    // Type-specific validation
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'number':
          if (isNaN(Number(value))) {
            return `${name} must be a valid number`;
          }
          break;
        case 'uuid':
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            return `${name} must be a valid UUID`;
          }
          break;
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    return null;
  }, [validationRules]);

  const updateField = useCallback((name: keyof T, value: string) => {
    // Sanitize input based on type
    let sanitizedValue = value;
    const rules = validationRules?.[name as string];
    
    if (rules?.type) {
      switch (rules.type) {
        case 'string':
          sanitizedValue = sanitizeInput.string(value);
          break;
        case 'email':
          sanitizedValue = sanitizeInput.email(value);
          break;
        case 'number':
          sanitizedValue = sanitizeInput.number(value).toString();
          break;
        case 'uuid':
          sanitizedValue = sanitizeInput.uuid(value);
          break;
        default:
          sanitizedValue = sanitizeInput.string(value);
      }
    } else {
      sanitizedValue = sanitizeInput.string(value);
    }

    // Validate the sanitized value
    const error = validateField(name as string, sanitizedValue);

    setFields(prev => ({
      ...prev,
      [name]: {
        value: sanitizedValue,
        error,
        dirty: true
      }
    }));
  }, [validateField, validationRules]);

  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newFields = { ...fields };

    Object.keys(fields).forEach(name => {
      const field = fields[name as keyof T];
      const error = validateField(name, field.value);
      
      newFields[name as keyof T] = {
        ...field,
        error,
        dirty: true
      };

      if (error) isValid = false;
    });

    setFields(newFields);
    return isValid;
  }, [fields, validateField]);

  const resetForm = useCallback(() => {
    setFields(initialFields);
  }, [initialFields]);

  const getFieldValues = useCallback(() => {
    const values: Record<string, string> = {};
    Object.keys(fields).forEach(name => {
      values[name] = fields[name as keyof T].value;
    });
    return values;
  }, [fields]);

  const hasErrors = Object.values(fields).some(field => field.error !== null);
  const isDirty = Object.values(fields).some(field => field.dirty);

  return {
    fields,
    updateField,
    validateAll,
    resetForm,
    getFieldValues,
    hasErrors,
    isDirty
  };
}