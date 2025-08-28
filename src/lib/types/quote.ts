export type QuoteStatus = 'Draft' | 'Pending' | 'Submitted' | 'Won' | 'Rejected';

export interface PricingData {
  basePrice: number;
  freight: number;
  total: string;
  paymentUponDrawings: string;
  paymentUponTrackInstallation: string;
}

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