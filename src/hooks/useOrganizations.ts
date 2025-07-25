import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Organization {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'suspended';
  invited_by?: string;
  joined_at: string;
  email: string;
  full_name?: string;
}


export const useOrganizations = () => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserOrganization = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get user's organization from their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          organization_id,
          role,
          organizations:organization_id (
            id,
            name,
            created_at,
            updated_at,
            created_by
          )
        `)
        .eq('id', user.user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData?.organizations) {
        setCurrentOrganization(profileData.organizations as Organization);
        setCurrentUserRole(profileData.role as 'owner' | 'admin' | 'member');
      }
    } catch (error: any) {
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
      // Fetch members from profiles table
      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, invited_by, joined_at, organization_id')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Transform data to match OrganizationMember interface
      const transformedData = membersData
        .filter(profile => profile && profile.id) // Filter out null/undefined profiles
        .map(profile => ({
          id: profile.id,
          organization_id: profile.organization_id,
          role: (profile.role as 'owner' | 'admin' | 'member') || 'member',
          status: (profile.status as 'pending' | 'active' | 'suspended') || 'active',
          invited_by: profile.invited_by || null,
          joined_at: profile.joined_at || new Date().toISOString(),
          email: profile.email || '',
          full_name: profile.full_name || null
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
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          created_by: user.id,
          organization_code: orgCode
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user's profile to link to this organization and set as owner
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: orgData.id,
          role: 'owner'
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setCurrentOrganization(orgData);
      
      toast({
        title: "Organization created",
        description: `${name} has been created successfully.`,
      });
      
      return orgData;
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
        .single();

      if (profileError) {
        throw new Error('User not found. They need to sign up first.');
      }

      // Check if user already has an organization
      if (profile.organization_id) {
        throw new Error('User is already a member of another organization.');
      }

      // Update user's profile to join organization
      const { data, error } = await supabase
        .from('profiles')
        .update({
          organization_id: organizationId,
          role,
          invited_by: user.id,
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
      const { error } = await supabase
        .from('profiles')
        .update({
          organization_id: null,
          role: 'member',
          invited_by: null,
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
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role } : member
      ));
      
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
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
      const { data, error } = await supabase.rpc('approve_member', {
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
      const { data, error } = await supabase.rpc('reject_member', {
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