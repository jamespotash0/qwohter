export type QuoteStatus = 'Incomplete' | 'Draft' | 'Pending' | 'Submitted' | 'Won' | 'Rejected' | 'Completed';

import { EnhancedPricingData } from '@/lib/types/pricing/enhancedPricing';

// Use enhanced pricing data structure
export type PricingData = EnhancedPricingData;

export interface QuoteCustomization {
  customSections?: Array<{
    id: string;
    title: string;
    content: string;
    isVisible: boolean;
    isRequired: boolean;
    dependencies?: string[];
  }>;
  customHTML?: string;
  isCustomized?: boolean;
  lastModified?: Date;
  version?: number;
}