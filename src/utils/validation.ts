/**
 * Enhanced Validation Utilities
 *
 * Comprehensive validation for forms with user-friendly error messages
 */

import levenshtein from 'js-levenshtein';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validators = {
  /**
   * Validate email address with comprehensive checks
   */
  email: (email: string): ValidationResult => {
    if (!email || email.trim() === '') {
      return { isValid: false, error: 'Email address is required' };
    }

    const trimmedEmail = email.trim();

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    // Length checks
    if (trimmedEmail.length > 254) {
      return { isValid: false, error: 'Email address is too long' };
    }

    // Local part (before @) checks
    const [localPart, domain] = trimmedEmail.split('@');
    if (localPart!.length > 64) {
      return { isValid: false, error: 'Email address is invalid' };
    }

    // Domain checks
    if (domain!.length > 253) {
      return { isValid: false, error: 'Email domain is too long' };
    }

    // Check for consecutive dots
    if (trimmedEmail.includes('..')) {
      return { isValid: false, error: 'Email address cannot contain consecutive dots' };
    }

    // Check for valid domain format
    const domainParts = domain!.split('.');
    if (domainParts.length < 2 || domainParts.some(part => part.length === 0)) {
      return { isValid: false, error: 'Please enter a valid email domain' };
    }

    // Check for common typos in popular domains (only suggest for close matches, don't reject exact matches)
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];

    const lowerDomain = domain!.toLowerCase();

    // Only suggest corrections for typos (distance > 0 but <= 2), don't reject exact matches
    const suggestedDomain = commonDomains.find(d => {
      const distance = levenshtein(d, lowerDomain);
      return distance > 0 && distance <= 2;
    });

    if (suggestedDomain) {
      return { isValid: false, error: `Did you mean ${suggestedDomain}?` };
    }

    return { isValid: true };
  },

  


  /**
   * Validate password with security requirements
   */
  password: (password: string): ValidationResult => {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
      return { isValid: false, error: 'Password is too long (max 128 characters)' };
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!hasUppercase || !hasLowercase) {
      return { isValid: false, error: 'Password must contain both uppercase and lowercase letters' };
    }

    if (!hasNumber) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }

    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);
    if (!hasSpecial) {
      return { isValid: false, error: 'Password must contain at least one special character (!@#$%&*)' };
    }

    // Check for common weak passwords
    const weakPasswords = [
      '12345678', 'password', 'qwerty123', 'abc12345',
      'password1', 'iloveyou', 'letmein01', 'welcome1',
      'admin123', 'monkey123', 'dragon12', 'master12',
      'Qwerty123', 'Password1', 'Abcd1234',
    ];
    if (weakPasswords.some(w => w.toLowerCase() === password.toLowerCase())) {
      return { isValid: false, error: 'This is a commonly used password — please choose something stronger' };
    }

    return { isValid: true };
  },

  /**
   * Validate full name
   */
  fullName: (name: string): ValidationResult => {
    if (!name || name.trim() === '') {
      return { isValid: false, error: 'Full name is required' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Full name must be at least 2 characters' };
    }

    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Full name is too long (max 100 characters)' };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
    }

    // Check for at least two parts (first and last name)
    const parts = trimmedName.split(/\s+/).filter(part => part.length > 0);
    if (parts.length < 2) {
      return { isValid: false, error: 'Please enter both first and last name' };
    }

    return { isValid: true };
  },

  /**
   * Validate organization name
   */
  organizationName: (name: string): ValidationResult => {
    if (!name || name.trim() === '') {
      return { isValid: false, error: 'Organization name is required' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Organization name must be at least 2 characters' };
    }

    if (trimmedName.length > 100) {
      return { isValid: false, error: 'Organization name is too long (max 100 characters)' };
    }

    // Allow letters, numbers, spaces, and common business characters
    const orgRegex = /^[a-zA-Z0-9\s\-&.,()]+$/;
    if (!orgRegex.test(trimmedName)) {
      return { isValid: false, error: 'Organization name contains invalid characters' };
    }

    return { isValid: true };
  },

  /**
   * Validate organization code
   */
  organizationCode: (code: string): ValidationResult => {
    if (!code || code.trim() === '') {
      return { isValid: false, error: 'Organization code is required' };
    }

    const trimmedCode = code.trim().toUpperCase();

    if (trimmedCode.length < 4 || trimmedCode.length > 12) {
      return { isValid: false, error: 'Organization code must be 4-12 characters' };
    }

    // Only allow alphanumeric characters
    const codeRegex = /^[A-Z0-9]+$/;
    if (!codeRegex.test(trimmedCode)) {
      return { isValid: false, error: 'Organization code can only contain letters and numbers' };
    }

    return { isValid: true };
  },

  /**
   * Validate phone number
   */
  phoneNumber: (phone: string): ValidationResult => {
    if (!phone || phone.trim() === '') {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');

    if (digitsOnly.length !== 10) {
      return { isValid: false, error: 'Phone number must be 10 digits' };
    }

    // Check for invalid patterns
    if (/^(\d)\1{9}$/.test(digitsOnly)) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }

    return { isValid: true };
  },

  /**
   * Validate website URL
   */
  website: (url: string): ValidationResult => {
    if (!url || url.trim() === '') {
      return { isValid: false, error: 'Website is required' };
    }

    const trimmedUrl = url.trim();

    // Add protocol if missing
    let fullUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = 'https://' + fullUrl;
    }

    try {
      const urlObj = new URL(fullUrl);

      // Check for valid domain
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return { isValid: false, error: 'Please enter a valid website URL' };
      }

      // Check for at least one dot in hostname
      if (!urlObj.hostname.includes('.')) {
        return { isValid: false, error: 'Please enter a valid website URL (e.g., company.com)' };
      }

      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Please enter a valid website URL' };
    }
  }
};

export interface PasswordRequirements {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  score: number;
  level: PasswordStrengthLevel;
  requirements: PasswordRequirements;
}

/**
 * Evaluate password strength with granular requirement checks
 */
export const getPasswordStrength = (password: string): PasswordStrength => {
  const requirements: PasswordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;

  let level: PasswordStrengthLevel;
  if (score <= 1) {
    level = 'weak';
  } else if (score <= 2) {
    level = 'fair';
  } else if (score <= 4) {
    level = 'good';
  } else {
    level = 'strong';
  }

  return { score, level, requirements };
};

/**
 * Format phone number as user types
 */
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limitedDigits = digitsOnly.slice(0, 10);

  // Format based on length
  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6) {
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  }
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

/**
 * Get clean phone number (digits only)
 */
export const getCleanPhoneNumber = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '');
};

/**
 * Format website URL for display
 */
export const formatWebsiteUrl = (url: string): string => {
  if (!url) return '';

  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return 'https://' + trimmed;
  }
  return trimmed;
};