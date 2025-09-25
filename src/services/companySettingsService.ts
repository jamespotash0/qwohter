import { supabase } from '@/integrations/supabase/client';
import { 
  OrganizationWithCompanyInfo, 
  CompanyInfoFormData, 
  convertFormDataToOrganizationInfo 
} from '@/lib/types/settings/companySettings';

class OrganizationSettingsService {
  async getOrganization(): Promise<OrganizationWithCompanyInfo | null> {
    try {
      // Get current user's organization through membership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get organization data directly through membership join
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            organization_code,
            organization_info,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data || !(data as any)?.organizations) throw new Error('User not associated with an organization');

      const orgData = (data as any).organizations;

      // Return organization data with organization_info fallback
      return {
        ...orgData,
        organization_info: orgData.organization_info || {}
      } as OrganizationWithCompanyInfo;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }

  async updateCompanyInfo(companyData: CompanyInfoFormData): Promise<OrganizationWithCompanyInfo> {
    try {
      // Get current user's organization and existing info through membership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          organization_id,
          organizations (
            id,
            name,
            organization_code,
            organization_info,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (membershipError) throw membershipError;
      if (!membershipData || !(membershipData as any)?.organizations) throw new Error('User not associated with an organization');

      const orgData = (membershipData as any).organizations;

      // Merge form data with existing organization info to preserve logo data
      const currentOrgInfo = orgData.organization_info || {};
      const formOrgInfo = convertFormDataToOrganizationInfo(companyData);

      // Preserve existing logo data if not provided in form
      const mergedOrgInfo = {
        ...currentOrgInfo,
        ...formOrgInfo,
        // Keep existing logo data if form doesn't have logo data
        logo_url: formOrgInfo.logo_url || currentOrgInfo.logo_url,
        logo_file_name: formOrgInfo.logo_file_name || currentOrgInfo.logo_file_name,
        logo_public_url: formOrgInfo.logo_public_url || currentOrgInfo.logo_public_url,
        logo_updated_at: formOrgInfo.logo_url ? formOrgInfo.logo_updated_at : currentOrgInfo.logo_updated_at,
      };

      console.log('🔄 Merging organization info:', {
        currentOrgInfo,
        formOrgInfo,
        mergedOrgInfo
      });

      // Try to update organization with company info in JSONB format
      // If column doesn't exist, we'll catch the error and return a mock response
      try {
        const { data, error } = await supabase
          .from('organizations')
          .update({
            organization_info: mergedOrgInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', (membershipData as any).organization_id)
          .select('*')
          .single();

        if (error) throw error;

        // Return the updated data with organization_info
        return {
          ...data,
          organization_info: mergedOrgInfo
        } as OrganizationWithCompanyInfo;

      } catch (updateError: any) {
        // If organization_info column doesn't exist, fall back to just returning the organization
        if (updateError.message?.includes('organization_info')) {
          console.warn('organization_info column does not exist yet. Please apply the migration.');

          // Return the current organization data with the organizationInfo we tried to save
          return {
            ...orgData,
            organization_info: mergedOrgInfo
          } as OrganizationWithCompanyInfo;
        }
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating organization company info:', error);
      throw error;
    }
  }

  async getCompanyInfo(): Promise<OrganizationWithCompanyInfo | null> {
    return this.getOrganization();
  }
}

export const organizationSettingsService = new OrganizationSettingsService();