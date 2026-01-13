import { supabase } from '@/integrations/supabase/client';
import {
  OrganizationWithCompanyInfo,
  CompanyInfoFormData
} from '@/lib/types/companySettings';

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
            industry,
            found_via,
            phone_number,
            fax_number,
            company_address,
            website,
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

      // First, get the user's membership to find their organization_id
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 [DEBUG] Membership query result:', {
        hasError: !!membershipError,
        error: membershipError,
        hasMembershipData: !!membershipData,
        membershipData,
        userId: user.id
      });

      if (membershipError) throw membershipError;

      const membership = membershipData as { organization_id: string } | null;
      if (!membership?.organization_id) throw new Error('User not associated with an organization');

      const organizationId = membership.organization_id;

      // Now get the organization data
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, industry, found_via, phone_number, fax_number, company_address, website, logo_data, created_at, updated_at')
        .eq('id', organizationId)
        .single();

      console.log('🔍 [DEBUG] Organization query result:', {
        hasError: !!orgError,
        error: orgError,
        hasOrgData: !!orgData,
        orgData
      });

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Organization not found');

      // Type the organization data
      const org = orgData as any;

      // Prepare update data using individual fields instead of JSONB
      const logoData = {
        ...(org.logo_data || {}),
        ...(companyData.logo_data && companyData.logo_data)
      };

      const updateData = {
        phone_number: companyData.phone_number || org.phone_number,
        fax_number: companyData.fax_number || org.fax_number,
        company_address: companyData.company_address || org.company_address,
        website: companyData.website || org.website,
        industry: companyData.industry || org.industry,
        found_via: companyData.found_via || org.found_via,
        logo_data: logoData,
        updated_at: new Date().toISOString()
      };

      console.log('=== Updating Organization ===');
      console.log('Update data:', updateData);
      console.log('Industry from companyData:', companyData.industry);
      console.log('Found via from companyData:', companyData.found_via);

      // Update organization with individual fields
      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId)
        .select(`
          id,
          name,
          industry,
          found_via,
          phone_number,
          fax_number,
          company_address,
          website,
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