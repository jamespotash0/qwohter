/**
 * Validation Utilities Tests
 *
 * Comprehensive tests for form validation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  validators,
  formatPhoneNumber,
  getCleanPhoneNumber,
  formatWebsiteUrl,
} from '@/utils/validation';

describe('validators', () => {
  describe('email', () => {
    it('should accept valid email addresses', () => {
      expect(validators.email('test@example.com').isValid).toBe(true);
      expect(validators.email('user.name@domain.org').isValid).toBe(true);
      expect(validators.email('user+tag@gmail.com').isValid).toBe(true);
      expect(validators.email('user@sub.domain.com').isValid).toBe(true);
    });

    it('should reject empty email', () => {
      const result = validators.email('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is required');
    });

    it('should reject whitespace-only email', () => {
      const result = validators.email('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is required');
    });

    it('should reject invalid email formats', () => {
      expect(validators.email('invalid').isValid).toBe(false);
      expect(validators.email('invalid@').isValid).toBe(false);
      expect(validators.email('@domain.com').isValid).toBe(false);
      expect(validators.email('user@domain').isValid).toBe(false);
    });

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@test.com';
      const result = validators.email(longEmail);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address is too long');
    });

    it('should reject email with local part too long', () => {
      const longLocal = 'a'.repeat(65) + '@test.com';
      const result = validators.email(longLocal);
      expect(result.isValid).toBe(false);
    });

    it('should reject consecutive dots', () => {
      const result = validators.email('test..user@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email address cannot contain consecutive dots');
    });

    it('should suggest corrections for common typos', () => {
      const result = validators.email('user@gmial.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Did you mean gmail.com?');
    });

    it('should suggest hotmail for homail typo', () => {
      const result = validators.email('user@hotmal.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Did you mean hotmail.com?');
    });

    it('should accept exact common domains without suggestion', () => {
      expect(validators.email('user@gmail.com').isValid).toBe(true);
      expect(validators.email('user@yahoo.com').isValid).toBe(true);
      expect(validators.email('user@hotmail.com').isValid).toBe(true);
      expect(validators.email('user@outlook.com').isValid).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = validators.email('  test@example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('password', () => {
    it('should accept valid passwords', () => {
      expect(validators.password('password1').isValid).toBe(true);
      expect(validators.password('MySecure123').isValid).toBe(true);
      expect(validators.password('a1bcdefgh').isValid).toBe(true);
    });

    it('should reject empty password', () => {
      const result = validators.password('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validators.password('pass1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'a1' + 'b'.repeat(127);
      const result = validators.password(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is too long (max 128 characters)');
    });

    it('should reject password without numbers', () => {
      const result = validators.password('abcdefgh');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one letter and one number');
    });

    it('should reject password without letters', () => {
      const result = validators.password('12345678');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one letter and one number');
    });

    it('should reject common weak passwords', () => {
      expect(validators.password('12345678').isValid).toBe(false);
      expect(validators.password('password').isValid).toBe(false);
      expect(validators.password('qwerty123').isValid).toBe(false);
      expect(validators.password('abc12345').isValid).toBe(false);
    });

    it('should reject weak passwords case-insensitively', () => {
      expect(validators.password('PASSWORD').isValid).toBe(false);
      expect(validators.password('Qwerty123').isValid).toBe(false);
    });
  });

  describe('fullName', () => {
    it('should accept valid full names', () => {
      expect(validators.fullName('John Doe').isValid).toBe(true);
      expect(validators.fullName('Mary Jane Watson').isValid).toBe(true);
      expect(validators.fullName("O'Brien Smith").isValid).toBe(true);
      expect(validators.fullName('Anne-Marie Johnson').isValid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validators.fullName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name is required');
    });

    it('should reject whitespace-only name', () => {
      const result = validators.fullName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name is required');
    });

    it('should reject name shorter than 2 characters', () => {
      const result = validators.fullName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name must be at least 2 characters');
    });

    it('should reject name longer than 100 characters', () => {
      const longName = 'John ' + 'Doe'.repeat(40);
      const result = validators.fullName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Full name is too long (max 100 characters)');
    });

    it('should reject names with invalid characters', () => {
      expect(validators.fullName('John123').isValid).toBe(false);
      expect(validators.fullName('John@Doe').isValid).toBe(false);
      expect(validators.fullName('John_Doe').isValid).toBe(false);
    });

    it('should reject single word names (require first and last)', () => {
      const result = validators.fullName('John');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter both first and last name');
    });

    it('should trim whitespace', () => {
      const result = validators.fullName('  John Doe  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('organizationName', () => {
    it('should accept valid organization names', () => {
      expect(validators.organizationName('Acme Corp').isValid).toBe(true);
      expect(validators.organizationName('Smith & Sons').isValid).toBe(true);
      expect(validators.organizationName('Company, Inc.').isValid).toBe(true);
      expect(validators.organizationName('ABC (Holdings)').isValid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validators.organizationName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Organization name is required');
    });

    it('should reject name shorter than 2 characters', () => {
      const result = validators.organizationName('A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Organization name must be at least 2 characters');
    });

    it('should reject name longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = validators.organizationName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Organization name is too long (max 100 characters)');
    });

    it('should reject invalid characters', () => {
      expect(validators.organizationName('Company@Inc').isValid).toBe(false);
      expect(validators.organizationName('Company#1').isValid).toBe(false);
    });

    it('should accept numbers in organization names', () => {
      expect(validators.organizationName('Company 123').isValid).toBe(true);
      expect(validators.organizationName('21st Century Fox').isValid).toBe(true);
    });
  });

  describe('organizationCode', () => {
    it('should accept valid organization codes', () => {
      expect(validators.organizationCode('ACME').isValid).toBe(true);
      expect(validators.organizationCode('ABC123').isValid).toBe(true);
      expect(validators.organizationCode('COMPANY2024').isValid).toBe(true);
    });

    it('should reject empty code', () => {
      const result = validators.organizationCode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Organization code is required');
    });

    it('should reject code shorter than 4 characters', () => {
      const result = validators.organizationCode('ABC');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Organization code must be 4-12 characters');
    });

    it('should reject code longer than 12 characters', () => {
      const result = validators.organizationCode('ABCDEFGHIJKLM');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Organization code must be 4-12 characters');
    });

    it('should reject special characters', () => {
      expect(validators.organizationCode('ABC-123').isValid).toBe(false);
      expect(validators.organizationCode('ABC_123').isValid).toBe(false);
      expect(validators.organizationCode('ABC 123').isValid).toBe(false);
    });

    it('should be case-insensitive (converts to uppercase)', () => {
      expect(validators.organizationCode('abcd').isValid).toBe(true);
      expect(validators.organizationCode('AbCd').isValid).toBe(true);
    });
  });

  describe('phoneNumber', () => {
    it('should accept valid 10-digit phone numbers', () => {
      expect(validators.phoneNumber('5551234567').isValid).toBe(true);
      expect(validators.phoneNumber('(555) 123-4567').isValid).toBe(true);
      expect(validators.phoneNumber('555-123-4567').isValid).toBe(true);
      expect(validators.phoneNumber('555.123.4567').isValid).toBe(true);
    });

    it('should reject empty phone number', () => {
      const result = validators.phoneNumber('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should reject phone numbers not exactly 10 digits', () => {
      expect(validators.phoneNumber('12345').isValid).toBe(false);
      expect(validators.phoneNumber('123456789').isValid).toBe(false);
      expect(validators.phoneNumber('12345678901').isValid).toBe(false);
    });

    it('should reject invalid patterns (all same digit)', () => {
      expect(validators.phoneNumber('1111111111').isValid).toBe(false);
      expect(validators.phoneNumber('0000000000').isValid).toBe(false);
    });
  });

  describe('website', () => {
    it('should accept valid website URLs', () => {
      expect(validators.website('https://example.com').isValid).toBe(true);
      expect(validators.website('http://example.com').isValid).toBe(true);
      expect(validators.website('example.com').isValid).toBe(true);
      expect(validators.website('www.example.com').isValid).toBe(true);
      expect(validators.website('sub.domain.example.com').isValid).toBe(true);
    });

    it('should reject empty URL', () => {
      const result = validators.website('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Website is required');
    });

    it('should reject invalid URLs', () => {
      expect(validators.website('not-a-url').isValid).toBe(false);
      expect(validators.website('example').isValid).toBe(false);
    });

    it('should reject URLs with no valid domain', () => {
      const result = validators.website('https://a');
      expect(result.isValid).toBe(false);
    });

    it('should auto-prepend https:// if missing protocol', () => {
      const result = validators.website('example.com');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('formatPhoneNumber', () => {
  it('should format empty string', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  it('should format partial numbers', () => {
    expect(formatPhoneNumber('5')).toBe('(5');
    expect(formatPhoneNumber('55')).toBe('(55');
    expect(formatPhoneNumber('555')).toBe('(555');
    expect(formatPhoneNumber('5551')).toBe('(555) 1');
    expect(formatPhoneNumber('55512')).toBe('(555) 12');
    expect(formatPhoneNumber('555123')).toBe('(555) 123');
    expect(formatPhoneNumber('5551234')).toBe('(555) 123-4');
  });

  it('should format complete 10-digit number', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
  });

  it('should strip non-digit characters', () => {
    expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
  });

  it('should limit to 10 digits', () => {
    expect(formatPhoneNumber('55512345678901')).toBe('(555) 123-4567');
  });
});

describe('getCleanPhoneNumber', () => {
  it('should return digits only', () => {
    expect(getCleanPhoneNumber('(555) 123-4567')).toBe('5551234567');
    expect(getCleanPhoneNumber('555-123-4567')).toBe('5551234567');
    expect(getCleanPhoneNumber('555.123.4567')).toBe('5551234567');
  });

  it('should handle empty string', () => {
    expect(getCleanPhoneNumber('')).toBe('');
  });
});

describe('formatWebsiteUrl', () => {
  it('should add https:// prefix if missing', () => {
    expect(formatWebsiteUrl('example.com')).toBe('https://example.com');
    expect(formatWebsiteUrl('www.example.com')).toBe('https://www.example.com');
  });

  it('should not add prefix if already present', () => {
    expect(formatWebsiteUrl('https://example.com')).toBe('https://example.com');
    expect(formatWebsiteUrl('http://example.com')).toBe('http://example.com');
  });

  it('should handle empty string', () => {
    expect(formatWebsiteUrl('')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(formatWebsiteUrl('  example.com  ')).toBe('https://example.com');
  });
});
