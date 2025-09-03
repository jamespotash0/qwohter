import { useState, useEffect } from 'react';
import { OrganizationWithCompanyInfo, CompanyInfoFormData } from '@/types/companySettings';
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
    if (!organization?.organization_info) return false;
    
    const info = organization.organization_info;
    const hasPhone = info.phones?.some(p => p.type === 'main' && p.number);
    const hasFax = info.phones?.some(p => p.type === 'fax' && p.number);
    const hasAddress = info.addresses?.some(a => a.address);
    const hasWebsite = info.websites?.some(w => w.url);
    
    return !!(hasPhone && hasFax && hasAddress && hasWebsite);
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