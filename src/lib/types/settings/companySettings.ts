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

export interface OrganizationInfo {
  phone?: string;
  fax?: string;
  address?: string;
  website?: string;
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
  };
};

// Helper function to extract primary values for forms
export const extractPrimaryContactInfo = (orgInfo?: OrganizationInfo): CompanyInfoFormData => {
  return {
    phone: orgInfo?.phone || '',
    fax: orgInfo?.fax || '',
    address: orgInfo?.address || '',
    website: orgInfo?.website || '',
  };
};