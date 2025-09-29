import { supabase } from '@/integrations/supabase/client';
import {
  OrganizationWithCompanyInfo,
  CompanyInfoFormData
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
            industry,
            phone_number,
            fax_number,
            company_address,
            website,
            quote_start_number,
            logo_data,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data || !(data as any)?.organizations) throw new Error('User not associated with an organization');

      const orgData = (data as any).organizations;

      return orgData as OrganizationWithCompanyInfo;
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
            industry,
            phone_number,
            fax_number,
            company_address,
            website,
            quote_start_number,
            logo_data,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (membershipError) throw membershipError;
      if (!membershipData || !(membershipData as any)?.organizations) throw new Error('User not associated with an organization');

      const orgData = (membershipData as any).organizations;

      // Prepare update data using individual fields instead of JSONB
      const logoData = {
        ...(orgData.logo_data || {}),
        ...(companyData.logo_data && companyData.logo_data)
      };

      const updateData = {
        phone_number: companyData.phone_number || orgData.phone_number,
        fax_number: companyData.fax_number || orgData.fax_number,
        company_address: companyData.company_address || orgData.company_address,
        website: companyData.website || orgData.website,
        quote_start_number: companyData.quote_start_number || orgData.quote_start_number,
        logo_data: logoData,
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Updating organization with individual fields:', {
        orgId: (membershipData as any).organization_id,
        updateData
      });

      // Update organization with individual fields
      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', (membershipData as any).organization_id)
        .select(`
          id,
          name,
          organization_code,
          industry,
          phone_number,
          fax_number,
          company_address,
          website,
          quote_start_number,
          logo_data,
          created_at,
          updated_at
        `)
        .single();

      if (error) throw error;

      return data as OrganizationWithCompanyInfo;
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