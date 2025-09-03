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
  phones?: PhoneInfo[];
  addresses?: AddressInfo[];
  websites?: WebsiteInfo[];
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
  const info: OrganizationInfo = {};
  
  if (formData.phone) {
    info.phones = [{ type: 'main', value: formData.phone, number: formData.phone, isPrimary: true }];
  }
  
  if (formData.fax) {
    info.phones = [...(info.phones || []), { type: 'fax', value: formData.fax, number: formData.fax }];
  }
  
  if (formData.address) {
    info.addresses = [{ type: 'business', value: formData.address, address: formData.address, isPrimary: true }];
  }
  
  if (formData.website) {
    info.websites = [{ type: 'main', value: formData.website, url: formData.website, isPrimary: true }];
  }  
  return info;
};

// Helper function to extract primary values for forms
export const extractPrimaryContactInfo = (orgInfo?: OrganizationInfo): CompanyInfoFormData => {
  return {
    phone: orgInfo?.phones?.find(p => p.type === 'main' || p.isPrimary)?.number || '',
    fax: orgInfo?.phones?.find(p => p.type === 'fax')?.number || '',
    address: orgInfo?.addresses?.find(a => a.isPrimary)?.address || '',
    website: orgInfo?.websites?.find(w => w.isPrimary)?.url || '',
  };
};