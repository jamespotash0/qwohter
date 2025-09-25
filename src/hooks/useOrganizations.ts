import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogoData } from "@/lib/types/settings/companySettings";

export interface Organization {
  id: string;
  name: string;
  organization_code: string;
  phone_number?: string;
  fax_number?: string;
  company_address?: string;
  website?: string;
  quote_start_number?: string;
  logo_data?: LogoData;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  role: 'admin' | 'member';
  status: 'pending' | 'active' | 'suspended';
  joined_at: string;
  email: string;
  full_name?: string;
}


export const useOrganizations = () => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserOrganization = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get user's profile first
      // Get user's organization through membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          organization_id,
          role,
          organizations (
            id,
            name,
            organization_code,
            created_at,
            updated_at,
            phone_number,
            fax_number,
            company_address,
            website,
            quote_start_number,
            logo_data
          )
        `)
        .eq('user_id', user.user.id)
        .eq('status', 'Active')
        .single() as any;

      if (membershipError) {
        console.error('Membership error:', membershipError);
        throw membershipError;
      }

      if (membershipData?.organization_id) {
        // If user has an organization, use the data from the join
        const orgData = membershipData.organizations;

        if (!orgData) {
          console.error('Organization data not found');
          // Don't throw here, just set role without organization
          setCurrentUserRole(membershipData.role as 'admin' | 'member');
        } else {
          const orgWithInfo = orgData as Organization;
          setCurrentOrganization(orgWithInfo);
          setCurrentUserRole(membershipData.role as 'admin' | 'member');
        }
      }
    } catch (error: any) {
      console.error('Fetch organization error:', error);
      toast({
        title: "Error fetching organization",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (organizationId: string) => {
    try {
      // Fetch members from memberships table with profile details
      const { data: membersData, error: membersError } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          status,
          joined_at,
          profile:profiles!user_id(id, email, full_name)
        `)
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Transform data to match OrganizationMember interface
      const transformedData = (membersData || [])
        .filter((membership: any) => membership && membership.user_id && membership.profile) // Filter out null/undefined memberships
        .map((membership: any) => ({
          id: membership.user_id, // Use user_id as the member ID
          organization_id: membership.organization_id || '',
          role: (membership.role as 'admin' | 'member') || 'member',
          status: (membership.status as 'pending' | 'active' | 'suspended') || 'active',
          joined_at: membership.joined_at || new Date().toISOString(),
          email: membership.profile?.email || '',
          full_name: membership.profile?.full_name || undefined
        }));

      setMembers(transformedData);
    } catch (error: any) {
      toast({
        title: "Error fetching members",
        description: error.message,
        variant: "destructive",
      });
      setMembers([]);
    }
  };

  const createOrganization = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create organization
      const orgCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create organization with individual fields (no organization_info JSONB)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          organization_code: orgCode,
          // Initialize with empty individual fields
          phone_number: '',
          fax_number: '',
          company_address: '',
          website: '',
          quote_start_number: '',
          logo_data: {}
        })
        .select(`
          id,
          name,
          organization_code,
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

      if (orgError) throw orgError;
      if (!orgData) throw new Error('Failed to create organization');

      // Create membership record instead of updating profile
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          role: 'Owner', // Owner role for organization creator
          status: 'Active',
          plan: 'Free',
          joined_at: new Date().toISOString()
        });

      if (membershipError) throw membershipError;

      const createdOrganization: Organization = orgData;
      setCurrentOrganization(createdOrganization);

      toast({
        title: "Organization created",
        description: `${name} has been created successfully.`,
      });

      return createdOrganization;
    } catch (error: any) {
      toast({
        title: "Error creating organization",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const inviteMember = async (organizationId: string, email: string, role: 'admin' | 'member' = 'member') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single() as any;

      if (profileError || !profile) {
        throw new Error('User not found. They need to sign up first.');
      }

      // Check if user already has an organization
      if (profile.organization_id) {
        throw new Error('User is already a member of another organization.');
      }

      // Update user's profile to join organization
      const { data, error } = await (supabase as any)
        .from('profiles')
        .update({
          organization_id: organizationId,
          role,
          joined_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      // Refresh members list
      await fetchMembers(organizationId);
      
      toast({
        title: "Member invited",
        description: `${email} has been added to the organization.`,
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error inviting member",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      // Remove organization association from profile
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          organization_id: null,
          role: 'member',
          joined_at: null
        })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(member => member.id !== memberId));
      
      toast({
        title: "Member removed",
        description: "Member has been removed from the organization.",
      });
    } catch (error: any) {
      toast({
        title: "Error removing member",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    try {
      const { data, error } = await (supabase as any).rpc('update_member_role', {
        member_id: memberId,
        new_role: role
      });

      if (error) throw error;

      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role } : member
      ));
      
      toast({
        title: "Role updated",
        description: `Member has been ${role === 'admin' ? 'promoted to admin' : 'changed to member'} successfully.`,
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const approveMember = async (memberId: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('approve_member', {
        member_id: memberId
      });

      if (error) throw error;

      // Refresh members list
      if (currentOrganization) {
        await fetchMembers(currentOrganization.id);
      }
      
      toast({
        title: "Member approved",
        description: "Member has been approved and can now access the organization.",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error approving member",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const rejectMember = async (memberId: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('reject_member', {
        member_id: memberId
      });

      if (error) throw error;

      // Refresh members list
      if (currentOrganization) {
        await fetchMembers(currentOrganization.id);
      }
      
      toast({
        title: "Member rejected",
        description: "Member request has been rejected.",
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error rejecting member",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchUserOrganization();
  }, []);

  useEffect(() => {
    if (currentOrganization) {
      fetchMembers(currentOrganization.id);
    }
  }, [currentOrganization]);

  return {
    currentOrganization,
    members,
    currentUserRole,
    loading,
    createOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
    approveMember,
    rejectMember,
    refreshOrganizations: fetchUserOrganization
  };
};