import { WallSpecification } from '@/lib/types';
import { OrganizationInfo } from '@/lib/types/settings/companySettings';

export interface QuoteData {
  quote_details?: any;
  job_details?: any;
  wall_details?: {
    id?: string;
    walls?: {
      [wallName: string]: WallSpecification;
    };
  };
  delivery_details?: any;
  labor_details?: any;
  price_details?: any;
  proposal_number?: string;
  project_name?: string;
  customization?: any;
  created_at?: string;
  organization_info?: OrganizationInfo;
}

export interface TemplateHelpers {
  formatDate: (dateString?: string) => string;
  toWords: (num: number | string) => string;
  formatCurrency: (amount?: number | string) => string;
  formatDimensions: (
    lengthFeet?: string,
    lengthInches?: string,
    heightFeet?: string,
    heightInches?: string,
    includeLabels?: boolean
  ) => string;
  getWallCount: (data: QuoteData) => number;
  getWallSystemType: (data: QuoteData) => string;
  isGLModel: (model?: string) => boolean;
  getPanelConfigurationText: (panelCount?: string) => string;
  getMovementOnTrackText: (panelConfiguration?: string) => string;
}

export interface PageBreakStrategy {
  breakAfterSection: string;
  minimumHeight: number;
}