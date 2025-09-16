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

export interface OrganizationInfo {
  phone?: string;
  fax?: string;
  address?: string;
  website?: string;
  quote_starting_point?: string;
  logo_url?: string;
  logo_file_name?: string;
  logo_public_url?: string;
  logo_updated_at?: string;
}

// Organization with company information (matches database schema)
export interface OrganizationWithCompanyInfo {
  id: string;
  name: string;
  organization_code: string;
  organization_info: OrganizationInfo;
  created_at: string;
  updated_at: string;
}

export interface CompanyInfoFormData {
  phone: string;
  fax: string;
  address: string;
  website: string;
  quote_starting_point: string;
  logo_url?: string;
  logo_file_name?: string;
  logo_public_url?: string;
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

// Helper function to convert simple form data to JSONB structure
export const convertFormDataToOrganizationInfo = (formData: CompanyInfoFormData): OrganizationInfo => {
  return {
    phone: formData.phone || undefined,
    fax: formData.fax || undefined,
    address: formData.address || undefined,
    website: formData.website || undefined,
    quote_starting_point: formData.quote_starting_point || undefined,
    logo_url: formData.logo_url || undefined,
    logo_file_name: formData.logo_file_name || undefined,
    logo_public_url: formData.logo_public_url || undefined,
    logo_updated_at: formData.logo_url ? new Date().toISOString() : undefined,
  };
};

// Helper function to extract primary values for forms
export const extractPrimaryContactInfo = (orgInfo?: OrganizationInfo): CompanyInfoFormData => {
  return {
    phone: orgInfo?.phone || '',
    fax: orgInfo?.fax || '',
    address: orgInfo?.address || '',
    website: orgInfo?.website || '',
    quote_starting_point: orgInfo?.quote_starting_point || '',
    logo_url: orgInfo?.logo_url || undefined,
    logo_file_name: orgInfo?.logo_file_name || undefined,
    logo_public_url: orgInfo?.logo_public_url || undefined,
  };
};