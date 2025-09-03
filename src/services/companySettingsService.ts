import { supabase } from '@/integrations/supabase/client';
import { 
  OrganizationWithCompanyInfo, 
  CompanyInfoFormData, 
  convertFormDataToOrganizationInfo 
} from '@/types/companySettings';

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
        .select('id, name, organization_code, created_at, updated_at')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;

      // Ensure organization_info exists (handle both cases: column exists or doesn't)
      return {
        id: data?.id || '',
        name: data?.name || '',
        organization_code: data?.organization_code || '',
        created_at: data?.created_at || '',
        updated_at: data?.updated_at || '',
        organization_info: ((data as any)?.organization_info) || {}
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

      // Convert form data to JSONB structure
      const organizationInfo = convertFormDataToOrganizationInfo(companyData);

      // Try to update organization with company info in JSONB format
      // If column doesn't exist, we'll catch the error and return a mock response
      try {
        const { data, error } = await supabase
          .from('organizations')
          .update({
            organization_info: organizationInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.organization_id)
          .select('id, name, organization_code, created_at, updated_at')
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