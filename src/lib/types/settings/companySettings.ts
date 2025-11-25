/**
 * Organization-based company settings types using JSONB structure
 * Allows multiple entries of each type for better flexibility
 */

export interface ContactInfo {
  type: string;
  value: string;
  isPrimary?: boolean;
}

export interface PhoneInfo extends ContactInfo {
  number: string;
}

export interface AddressInfo extends ContactInfo {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface WebsiteInfo extends ContactInfo {
  url: string;
}

// EmailInfo removed - not using emails in organization_info

export interface LogoInfo {
  logo_url?: string;
  logo_file_name?: string;
  logo_public_url?: string;
  logo_updated_at?: string;
}

export interface LogoData {
  logo_url?: string;
  logo_file_name?: string;
  logo_public_url?: string;
  logo_updated_at?: string;
}

// Organization info structure for templates (flattened from individual fields)
export interface OrganizationInfo {
  name?: string;
  industry?: string;
  phone?: string;
  fax?: string;
  address?: string;
  website?: string;
  logo_url?: string;
  logo_public_url?: string;
}

// Organization with company information (matches actual database schema)
export interface OrganizationWithCompanyInfo {
  id: string;
  name: string;
  
  industry?: string;
  found_via?: string;
  phone_number?: string;
  fax_number?: string;
  company_address?: string;
  website?: string;
  quote_start_number?: string;
  logo_data?: LogoData;
  created_at: string;
  updated_at: string;
}

export interface CompanyInfoFormData {
  phone_number: string;
  fax_number: string;
  company_address: string;
  website: string;
  quote_start_number: string;
  industry?: string;
  found_via?: string;
  logo_data?: LogoData;
}

export interface OrganizationSettingsStore {
  organization: OrganizationWithCompanyInfo | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchOrganization: () => Promise<void>;
  updateCompanyInfo: (data: CompanyInfoFormData) => Promise<OrganizationWithCompanyInfo>;
  getCompanyInfo: () => OrganizationWithCompanyInfo | null;
}

// CompanySettingsPageProps removed - Settings page now handles auth internally

// Helper function to extract values for forms
export const extractCompanyInfoForForm = (org?: OrganizationWithCompanyInfo): CompanyInfoFormData => {
  return {
    phone_number: org?.phone_number || '',
    fax_number: org?.fax_number || '',
    company_address: org?.company_address || '',
    website: org?.website || '',
    quote_start_number: org?.quote_start_number || '',
    logo_data: org?.logo_data || undefined,
  };
};