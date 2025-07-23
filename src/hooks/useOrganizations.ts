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
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export const useOrganizations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<(OrganizationMember & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
      
      // Set the first organization as current if none is selected
      if (data && data.length > 0 && !currentOrganization) {
        setCurrentOrganization(data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching organizations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (organizationId: string) => {
    try {
      // Fetch members with their profile information separately
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Fetch profiles for all members
      const userIds = membersData.map(member => member.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine members with their profiles
      const transformedData = membersData.map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          ...member,
          role: member.role as 'owner' | 'admin' | 'member',
          profile: profile as Profile
        };
      }).filter(member => member.profile); // Filter out members without profiles

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
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          created_by: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      setOrganizations(prev => [orgData, ...prev]);
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

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', profile.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this organization.');
      }

      // Add member
      const { data, error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: profile.id,
          role,
          invited_by: user.id
        })
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
      const { error } = await supabase
        .from('organization_members')
        .delete()
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
        .from('organization_members')
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

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (currentOrganization) {
      fetchMembers(currentOrganization.id);
    }
  }, [currentOrganization]);

  return {
    organizations,
    currentOrganization,
    setCurrentOrganization,
    members,
    loading,
    createOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
    refreshOrganizations: fetchOrganizations
  };
};