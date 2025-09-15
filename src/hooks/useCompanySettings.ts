import { useState, useEffect } from 'react';
import { OrganizationWithCompanyInfo, CompanyInfoFormData } from '@/lib/types/settings/companySettings';
import { organizationSettingsService } from '@/services/companySettingsService';

export function useOrganizationSettings() {
  const [organization, setOrganization] = useState<OrganizationWithCompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization from the service
  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await organizationSettingsService.getOrganization();
      setOrganization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization');
    } finally {
      setIsLoading(false);
    }
  };

  // Update company info in the organization
  const updateCompanyInfo = async (data: CompanyInfoFormData): Promise<OrganizationWithCompanyInfo> => {
    try {
      const updatedOrganization = await organizationSettingsService.updateCompanyInfo(data);
      setOrganization(updatedOrganization);
      return updatedOrganization;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update company info');
    }
  };

  // Get the current organization with company info
  const getCompanyInfo = (): OrganizationWithCompanyInfo | null => {
    return organization;
  };

  // Check if organization has company info
  const hasCompanyInfo = (): boolean => {
    if (!organization?.organization_info) {
      console.log('hasCompanyInfo: No organization_info found');
      return false;
    }
    
    const info = organization.organization_info;
    const hasPhone = !!(info.phone?.trim());
    const hasFax = !!(info.fax?.trim());
    const hasAddress = !!(info.address?.trim());
    const hasWebsite = !!(info.website?.trim());
    
    console.log('hasCompanyInfo Debug:', {
      info,
      hasPhone,
      hasFax,
      hasAddress,
      hasWebsite
    });
    
    // Show company info section if ANY data exists
    const result = !!(hasPhone || hasFax || hasAddress || hasWebsite);
    console.log('hasCompanyInfo result:', result);
    return result;
  };

  // Load organization on mount
  useEffect(() => {
    fetchOrganization();
  }, []);

  return {
    organization,
    isLoading,
    error,
    fetchOrganization,
    updateCompanyInfo,
    getCompanyInfo,
    hasCompanyInfo,
  };
}