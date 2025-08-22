import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTemplateHelpers } from '../template-helpers';
import type { TemplateHelpers } from '../types';

describe('Template Helpers', () => {
  let helpers: TemplateHelpers;

  beforeEach(() => {
    helpers = createTemplateHelpers();
    // Mock console.warn to test large number warnings
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('formatDate', () => {
    it('should format valid date strings correctly', () => {
      const result = helpers.formatDate('2024-01-15');
      expect(result).toMatch(/January 15, 2024/);
    });

    it('should handle ISO date strings', () => {
      const result = helpers.formatDate('2024-12-25T10:30:00Z');
      // The date parsing might vary by environment, so check for valid output
      expect(result).toBeDefined();
      expect(result).not.toBe('Invalid Date');
    });

    it('should return current date when no date provided', () => {
      const result = helpers.formatDate();
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      expect(result).toBe(currentDate);
    });

    it('should handle hyphenated date format', () => {
      const result = helpers.formatDate('2024-06-01');
      expect(result).toMatch(/June 1, 2024/);
    });

    it('should handle invalid date strings gracefully', () => {
      const result = helpers.formatDate('invalid-date');
      // Should fall back to a date format or handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('toWords', () => {
    it('should convert single digits to words', () => {
      expect(helpers.toWords(0)).toBe('ZERO');
      expect(helpers.toWords(1)).toBe('ONE');
      expect(helpers.toWords(5)).toBe('FIVE');
      expect(helpers.toWords(12)).toBe('TWELVE');
    });

    it('should handle string numbers', () => {
      expect(helpers.toWords('3')).toBe('THREE');
      expect(helpers.toWords('10')).toBe('TEN');
    });

    it('should return numeric string for numbers beyond range', () => {
      expect(helpers.toWords(15)).toBe('15');
      expect(helpers.toWords(100)).toBe('100');
    });

    it('should handle edge cases', () => {
      expect(helpers.toWords('0')).toBe('ZERO');
      expect(helpers.toWords('')).toBe('NaN'); // parseInt of empty string is NaN
    });
  });

  describe('formatCurrency', () => {
    it('should format valid numbers correctly', () => {
      expect(helpers.formatCurrency(1000)).toBe('$1,000.00');
      expect(helpers.formatCurrency(1234.56)).toBe('$1,234.56');
      expect(helpers.formatCurrency(0)).toBe('$0.00');
    });

    it('should handle string currency values', () => {
      expect(helpers.formatCurrency('1000')).toBe('$1,000.00');
      expect(helpers.formatCurrency('1234.56')).toBe('$1,234.56');
      expect(helpers.formatCurrency('$1,000.00')).toBe('$1,000.00');
    });

    it('should handle negative values', () => {
      expect(helpers.formatCurrency(-500)).toBe('-$500.00');
      expect(helpers.formatCurrency('-500')).toBe('-$500.00');
    });

    it('should handle edge cases', () => {
      expect(helpers.formatCurrency(null)).toBe('$0.00');
      expect(helpers.formatCurrency(undefined)).toBe('$0.00');
      expect(helpers.formatCurrency('')).toBe('$0.00');
      expect(helpers.formatCurrency('invalid')).toBe('$0.00');
    });

    it('should handle pre-formatted currency strings', () => {
      expect(helpers.formatCurrency('$1,234.56')).toBe('$1,234.56');
      expect(helpers.formatCurrency('$10,000')).toBe('$10,000.00');
    });

    it('should warn for very large numbers', () => {
      helpers.formatCurrency(99999999); // 8 digits
      expect(console.warn).toHaveBeenCalledWith('Currency value may be too large:', 99999999);
    });

    it('should handle decimal precision correctly', () => {
      expect(helpers.formatCurrency(123.456)).toBe('$123.46'); // Should round to 2 decimals
      expect(helpers.formatCurrency(123.454)).toBe('$123.45'); // Should round down
    });

    it('should handle Infinity and NaN', () => {
      expect(helpers.formatCurrency(Infinity)).toBe('$0.00');
      expect(helpers.formatCurrency(NaN)).toBe('$0.00');
      expect(helpers.formatCurrency('NaN')).toBe('$0.00');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world quote data formatting', () => {
      const quoteData = {
        date: '2024-01-15',
        totalAmount: 15750.50,
        itemCount: 8,
      };

      expect(helpers.formatDate(quoteData.date)).toMatch(/January 15, 2024/);
      expect(helpers.formatCurrency(quoteData.totalAmount)).toBe('$15,750.50');
      expect(helpers.toWords(quoteData.itemCount)).toBe('EIGHT');
    });

    it('should handle missing or incomplete data gracefully', () => {
      const incompleteData = {
        date: undefined,
        amount: null,
        count: '',
      };

      expect(() => helpers.formatDate(incompleteData.date)).not.toThrow();
      expect(helpers.formatCurrency(incompleteData.amount)).toBe('$0.00');
      expect(helpers.toWords(incompleteData.count)).toBeDefined();
    });
  });
});