import { supabase } from '@/integrations/supabase/client';
import { 
  OrganizationWithCompanyInfo, 
  CompanyInfoFormData, 
  convertFormDataToOrganizationInfo 
} from '@/lib/types/settings/companySettings';

class OrganizationSettingsService {
  async getOrganization(): Promise<OrganizationWithCompanyInfo | null> {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's profile to get organization_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) throw new Error('User not associated with an organization');

      // Fetch organization with company info
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Organization not found');

      // Return data as-is with organization_info fallback
      return {
        ...data,
        organization_info: data.organization_info || {}
      } as OrganizationWithCompanyInfo;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }

  async updateCompanyInfo(companyData: CompanyInfoFormData): Promise<OrganizationWithCompanyInfo> {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) throw new Error('User not associated with an organization');

      // Get current organization info to preserve existing data (like logo)
      const { data: currentOrg, error: fetchError } = await supabase
        .from('organizations')
        .select('organization_info')
        .eq('id', profile.organization_id)
        .single();

      if (fetchError) throw fetchError;

      // Merge form data with existing organization info to preserve logo data
      const currentOrgInfo = (currentOrg as any)?.organization_info || {};
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
          .eq('id', profile.organization_id)
          .select('*')
          .single();

        if (error) throw error;

        // Return the updated data with organization_info
        return {
          ...data,
          organization_info: organizationInfo
        } as OrganizationWithCompanyInfo;

      } catch (updateError: any) {
        // If organization_info column doesn't exist, fall back to just fetching the organization
        if (updateError.message?.includes('organization_info')) {
          console.warn('organization_info column does not exist yet. Please apply the migration.');
          
          // Just return the current organization data with the organizationInfo we tried to save
          const { data: orgData, error: fetchError } = await supabase
            .from('organizations')
            .select('id, name, organization_code, created_at, updated_at')
            .eq('id', profile.organization_id)
            .single();

          if (fetchError) throw fetchError;

          return {
            ...orgData,
            organization_info: organizationInfo
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