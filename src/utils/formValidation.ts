// Comprehensive Form Validation Utility
// Handles all form validation requirements across the application

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  sanitizedValue?: string;
}

export class FormValidator {
  
  // Email validation - must have @ and .com
  static validateEmail(email: string): ValidationResult {
    if (!email.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    const sanitized = email.trim().toLowerCase();
    
    // Must contain @ and end with .com
    if (!sanitized.includes('@')) {
      return { 
        isValid: false, 
        errorMessage: 'Email must contain @' 
      };
    }
    
    if (!sanitized.endsWith('.com')) {
      return { 
        isValid: false, 
        errorMessage: 'Email must end with .com' 
      };
    }
    
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
    if (!emailRegex.test(sanitized)) {
      return { 
        isValid: false, 
        errorMessage: 'Invalid email format' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: sanitized 
    };
  }
  
  // Phone validation - must be 10 digits, format to (xxx) xxx-xxxx
  static validatePhone(phone: string): ValidationResult {
    if (!phone.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length !== 10) {
      return { 
        isValid: false, 
        errorMessage: 'Phone number must be 10 digits' 
      };
    }
    
    // Format as (xxx) xxx-xxxx
    const formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    
    return { 
      isValid: true, 
      sanitizedValue: formatted 
    };
  }
  
  // Website validation - must start with www.
  static validateWebsite(website: string): ValidationResult {
    if (!website.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    const sanitized = website.trim().toLowerCase();
    
    if (!sanitized.startsWith('www.')) {
      return { 
        isValid: false, 
        errorMessage: 'Website must start with www.' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: sanitized 
    };
  }
  
  // Numbers only validation - no alphabetical letters allowed
  static validateNumbersOnly(value: string, allowDecimals = false): ValidationResult {
    if (!value.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    const pattern = allowDecimals ? /^[0-9]*\.?[0-9]*$/ : /^[0-9]*$/;
    
    if (!pattern.test(value)) {
      return { 
        isValid: false, 
        errorMessage: allowDecimals ? 'Only numbers and decimals allowed' : 'Only numbers allowed'
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: value 
    };
  }
  
  // Inches validation - numbers with optional fraction (/)
  static validateInches(value: string): ValidationResult {
    if (!value.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    // Allow numbers, decimals, and fractions (/)
    const pattern = /^[0-9]*\.?[0-9]*\/?[0-9]*$/;
    
    if (!pattern.test(value)) {
      return { 
        isValid: false, 
        errorMessage: 'Only numbers and fractions (/) allowed' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: value 
    };
  }

  // Inches validation with spaces and hyphens - for fractional inputs like "3 3/4" or "3-3/4"
  static validateInchesWithFractionsHyphen(value: string): ValidationResult {
    if (!value.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    // Allow numbers, spaces, hyphens, and fractions (/) - matches the input restriction
    // Examples: "3", "3.5", "3/4", "3 3/4", "3-3/4"
    const pattern = /^[0-9]*\.?[0-9]*[\s\-]?[0-9]*\/[0-9]*$|^[0-9]*\.?[0-9]*$/;
    
    if (!pattern.test(value)) {
      return { 
        isValid: false, 
        errorMessage: 'Enter numbers with optional fractions (e.g., 3 3/4 or 3-3/4)' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: value 
    };
  }
  
  // Hyphen-separated numbers validation (e.g., 7-11)
  static validateHyphenNumbers(value: string): ValidationResult {
    if (!value.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    // Allow single numbers or hyphen-separated numbers
    const pattern = /^[0-9]+(-[0-9]+)?$/;
    
    if (!pattern.test(value)) {
      return { 
        isValid: false, 
        errorMessage: 'Enter a number or hyphen-separated numbers (e.g., 7-11)' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: value 
    };
  }
  
  // Currency validation - numbers with decimals
  static validateCurrency(value: string): ValidationResult {
    if (!value.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    // Remove dollar signs and spaces for validation
    const cleaned = value.replace(/[\$\s]/g, '');
    
    const pattern = /^[0-9]+(\.[0-9]{1,2})?$/;
    
    if (!pattern.test(cleaned)) {
      return { 
        isValid: false, 
        errorMessage: 'Enter a valid dollar amount (e.g., 100.50)' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: cleaned 
    };
  }
  
  // Percentage validation
  static validatePercentage(value: string): ValidationResult {
    if (!value.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    const cleaned = value.replace('%', '');
    const number = parseFloat(cleaned);
    
    if (isNaN(number) || number < 0 || number > 100) {
      return { 
        isValid: false, 
        errorMessage: 'Enter a valid percentage (0-100)' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: cleaned 
    };
  }
  
  // Address validation placeholder - would integrate with Mapbox
  static validateAddress(address: string): ValidationResult {
    if (!address.trim()) {
      return { isValid: true }; // Allow empty for optional fields
    }
    
    // For now, just basic validation - integrate with Mapbox later
    if (address.trim().length < 5) {
      return { 
        isValid: false, 
        errorMessage: 'Address too short' 
      };
    }
    
    return { 
      isValid: true, 
      sanitizedValue: address.trim() 
    };
  }
  
  // Input sanitization to prevent malicious content
  static sanitizeInput(value: string): string {
    return value
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
}

// Field-specific validation functions
export const fieldValidators = {
  // Contact Info fields
  email: (value: string) => FormValidator.validateEmail(value),
  phone: (value: string) => FormValidator.validatePhone(value),
  website: (value: string) => FormValidator.validateWebsite(value),
  address: (value: string) => FormValidator.validateAddress(value),
  
  // Wall system fields
  lengthFeet: (value: string) => FormValidator.validateNumbersOnly(value),
  lengthInches: (value: string) => FormValidator.validateInches(value),
  heightFeet: (value: string) => FormValidator.validateNumbersOnly(value),
  heightInches: (value: string) => FormValidator.validateInches(value),
  panelCount: (value: string) => FormValidator.validateNumbersOnly(value),
  quantity: (value: string) => FormValidator.validateNumbersOnly(value),
  
  // Fractional inches validation (for spaces and hyphens)
  numbersWithFractionsHyphen: (value: string) => FormValidator.validateInchesWithFractionsHyphen(value),
  
  // Pricing fields
  basePrice: (value: string) => FormValidator.validateCurrency(value),
  freight: (value: string) => FormValidator.validateCurrency(value),
  paymentPercentage: (value: string) => FormValidator.validatePercentage(value),
  
  // Labor & Delivery fields
  shopDrawingWeeks: (value: string) => FormValidator.validateHyphenNumbers(value),
  trackDeliveryWeeks: (value: string) => FormValidator.validateHyphenNumbers(value),
  panelDeliveryWeeks: (value: string) => FormValidator.validateHyphenNumbers(value),
  trackInstallationDays: (value: string) => FormValidator.validateHyphenNumbers(value),
  panelInstallationDays: (value: string) => FormValidator.validateHyphenNumbers(value),
};

// Input restriction helpers - prevent invalid characters from being typed
export const inputRestrictions = {
  numbersOnly: (e: React.KeyboardEvent) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    // Always allow control keys
    if (allowedKeys.includes(e.key)) return;
    
    // Always allow numbers 0-9
    if (e.key >= '0' && e.key <= '9') return;
    
    // Block everything else
    e.preventDefault();
    e.stopPropagation();
  },
  
  numbersWithDecimals: (e: React.KeyboardEvent) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.'];
    if (allowedKeys.includes(e.key)) return;
    if (e.key >= '0' && e.key <= '9') return;
    e.preventDefault();
  },
  
  numbersWithFractionsHyphen: (e: React.KeyboardEvent) => {
    const allowedKeys = [' ', '-', 'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '.', '/'];
    if (allowedKeys.includes(e.key)) return;
    if (e.key >= '0' && e.key <= '9') return;
    e.preventDefault();
  },
  
  phone: (e: React.KeyboardEvent) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '(', ')', '-', ' '];
    if (allowedKeys.includes(e.key)) return;
    if (e.key >= '0' && e.key <= '9') return;
    e.preventDefault();
  }
};