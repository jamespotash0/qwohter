import { TemplateHelpers, QuoteData } from './types';
import { WallSpecification } from '@/lib/types';

export const createTemplateHelpers = (): TemplateHelpers => ({
  formatDate: (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const localDate = new Date(+parts[0], +parts[1] - 1, +parts[2]); //strict any
      return localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  toWords: (num: number | string): string => {
    if (num === null || num === undefined || num === '' || num === 'undefined') {
      return 'ZERO';
    }
    const n = parseInt(num.toString());
    if (isNaN(n)) {
      return 'ZERO';
    }
    const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];
    return words[n] || n.toString();
  },

  formatCurrency: (amount?: number | string) => {
    if (amount === null || amount === undefined || amount === '') return '$0.00';
    
    let num: number;
    if (typeof amount === 'string') {
      // Handle string currency values that might have formatting
      // Remove everything except digits, decimal points, and minus signs
      const cleanString = amount.replace(/[^0-9.-]/g, '');
      if (cleanString === '' || cleanString === '-') return '$0.00';
      num = parseFloat(cleanString);
    } else {
      num = amount;
    }
    
    // Ensure we have a valid number
    if (isNaN(num) || !isFinite(num)) return '$0.00';
    
    // Handle edge cases for very large numbers (up to 7 digits)
    const absNum = Math.abs(num);
    if (absNum >= 10000000) { // 7+ digits
      // Currency value may be too large - could add proper error handling here
    }
    
    // Use Intl.NumberFormat for proper locale-specific formatting
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true // Ensures comma separators for thousands
    });
    
    const formatted = formatter.format(num);
    
    // Debug logging for development
    // Removed console.log for production
    
    return formatted;
  },

  formatDimensions: (
    lengthFeet?: string,
    lengthInches?: string,
    heightFeet?: string,
    heightInches?: string,
    includeLabels = true
  ) => {
    // Handle undefined/null/empty values properly
    const wf = (lengthFeet && lengthFeet !== 'undefined') ? parseInt(lengthFeet) : 0;
    const hf = (heightFeet && heightFeet !== 'undefined') ? parseInt(heightFeet) : 0;
    
    // Handle fractional inches - preserve the original string if it contains fractions
    const wi = (lengthInches && lengthInches !== 'undefined') ? lengthInches : '0';
    const hi = (heightInches && heightInches !== 'undefined') ? heightInches : '0';
    
    // Format inches to handle both whole numbers and fractions
    const formatInches = (inches: string) => {
      const trimmed = inches.trim();
      
      // If it's just a whole number, return it as is
      if (/^\d+$/.test(trimmed)) {
        return trimmed;
      }
      
      // If it contains fractions, format them properly
      if (trimmed.includes('/')) {
        // Convert "x-x/y" format to "x x/y" format
        return trimmed.replace(/-(\d+\/\d+)/, ' $1');
      }
      
      // Default to the original value, or '0' if empty
      return trimmed || '0';
    };

    const formattedWi = formatInches(wi);
    const formattedHi = formatInches(hi);

    const length = `${wf}'-${formattedWi}"${includeLabels ? ' L' : ''}`;
    const height = `${hf}'-${formattedHi}"${includeLabels ? ' H' : ''}`;
    return `${length} x ${height}`;
  },

  getWallCount: (data: QuoteData) => {
    const walls = data.wall_details?.walls || {};
    return Object.keys(walls).length;
  },

  getWallSystemType: (data: QuoteData) => {
    const walls = data.wall_details?.walls || {};
    const firstWall = Object.values(walls)[0] as WallSpecification;
    return firstWall?.wallSystemType || 'Operable Wall';
  },

  isGLModel: (model?: string) => {
    return model?.includes('GL') || false;
  },

  getPanelConfigurationText: (panelCount?: string) => {
    const count = parseInt(panelCount || '1');
    return count > 1 ? 'Multiple' : 'Single';
  },

  getMovementOnTrackText: (panelConfiguration?: string) => {
    if (panelConfiguration == 'Individual') {
      return "Independent Sliding";
    }
    return "Folding";
  }
});