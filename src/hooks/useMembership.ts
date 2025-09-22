/**
 * Membership Management Hook
 *
 * Manages user membership relationships with organizations using the new membership table
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'Pending' | 'Active' | 'Suspended';
  invited_by: string | null;
  plan: string;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipWithDetails extends Membership {
  organization: {
    id: string;
    name: string;
    organization_code: string;
  };
  profile: {
    id: string;
    full_name: string | null;
  };
  inviter?: {
    id: string;
    full_name: string | null;
  };
}

export const useMembership = () => {
  const [currentMembership, setCurrentMembership] = useState<MembershipWithDetails | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<MembershipWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserMembership = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get user's membership with organization details
      const { data: membershipData, error: membershipError } = await supabase
        .from('membership')
        .select(`
          *,
          organization:organizations(id, name, organization_code),
          profile:profiles!user_id(id, full_name),
          inviter:profiles!invited_by(id, full_name)
        `)
        .eq('user_id', user.user.id)
        .single();

      if (membershipError) {
        if (membershipError.code !== 'PGRST116') {
          console.error('Membership error:', membershipError);
          throw membershipError;
        }
        // No membership found - user hasn't completed onboarding
        setCurrentMembership(null);
        return;
      }

      setCurrentMembership(membershipData as MembershipWithDetails);
    } catch (error: any) {
      console.error('Fetch membership error:', error);
      toast({
        title: "Error fetching membership",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizationMembers = async (organizationId: string) => {
    try {
      // Fetch all members of the organization
      const { data: membersData, error: membersError } = await supabase
        .from('membership')
        .select(`
          *,
          organization:organizations(id, name, organization_code),
          profile:profiles!user_id(id, full_name),
          inviter:profiles!invited_by(id, full_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      setOrganizationMembers(membersData as MembershipWithDetails[] || []);
    } catch (error: any) {
      toast({
        title: "Error fetching members",
        description: error.message,
        variant: "destructive",
      });
      setOrganizationMembers([]);
    }
  };

  const inviteMember = async (organizationId: string, email: string, role: 'Admin' | 'Member' = 'Member') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if user exists in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', email) // Assuming we're getting user ID, not email
        .single();

      if (profileError || !profile) {
        throw new Error('User not found. They need to sign up first.');
      }

      // Check if user already has a membership
      const { data: existingMembership } = await supabase
        .from('membership')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (existingMembership) {
        throw new Error('User is already a member of an organization.');
      }

      // Create membership invitation
      const { data, error } = await supabase
        .from('membership')
        .insert({
          user_id: profile.id,
          organization_id: organizationId,
          role,
          status: 'Pending',
          invited_by: user.id,
          plan: 'Free'
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh members list
      await fetchOrganizationMembers(organizationId);

      toast({
        title: "Member invited",
        description: `Invitation sent successfully.`,
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

  const removeMember = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from('membership')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;

      setOrganizationMembers(prev => prev.filter(member => member.id !== membershipId));

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

  const updateMemberRole = async (membershipId: string, role: 'Owner' | 'Admin' | 'Member') => {
    try {
      const { data, error } = await supabase
        .from('membership')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;

      setOrganizationMembers(prev => prev.map(member =>
        member.id === membershipId ? { ...member, role } : member
      ));

      toast({
        title: "Role updated",
        description: `Member role has been updated to ${role}.`,
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

  const updateMemberStatus = async (membershipId: string, status: 'Pending' | 'Active' | 'Suspended') => {
    try {
      const { data, error } = await supabase
        .from('membership')
        .update({
          status,
          updated_at: new Date().toISOString(),
          joined_at: status === 'Active' ? new Date().toISOString() : undefined
        })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;

      setOrganizationMembers(prev => prev.map(member =>
        member.id === membershipId ? { ...member, status } : member
      ));

      // Update current membership if it's the current user
      if (currentMembership?.id === membershipId) {
        setCurrentMembership(prev => prev ? { ...prev, status } : null);
      }

      toast({
        title: "Status updated",
        description: `Member status has been updated to ${status}.`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const approveMember = async (membershipId: string) => {
    return updateMemberStatus(membershipId, 'Active');
  };

  const suspendMember = async (membershipId: string) => {
    return updateMemberStatus(membershipId, 'Suspended');
  };

  const getUserRole = (): 'Owner' | 'Admin' | 'Member' | null => {
    return currentMembership?.role || null;
  };

  const canManageMembers = (): boolean => {
    const role = getUserRole();
    return role === 'Owner' || role === 'Admin';
  };

  const canManageOrganization = (): boolean => {
    const role = getUserRole();
    return role === 'Owner';
  };

  const isActive = (): boolean => {
    return currentMembership?.status === 'Active';
  };

  useEffect(() => {
    fetchUserMembership();
  }, []);

  useEffect(() => {
    if (currentMembership?.organization_id) {
      fetchOrganizationMembers(currentMembership.organization_id);
    }
  }, [currentMembership?.organization_id]);

  return {
    currentMembership,
    organizationMembers,
    loading,
    getUserRole,
    canManageMembers,
    canManageOrganization,
    isActive,
    inviteMember,
    removeMember,
    updateMemberRole,
    updateMemberStatus,
    approveMember,
    suspendMember,
    refreshMembership: fetchUserMembership,
    refreshMembers: fetchOrganizationMembers
  };
};