import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationStore } from "@/stores/organization/organizationStore";
import type { Organization, OrganizationMember, InviteToken } from "@/stores/organization/organizationStore";

// Re-export types from store for backward compatibility
export type { Organization, OrganizationMember, InviteToken };

export const useOrganizations = () => {
  const { toast } = useToast();

  // Get state and actions from Zustand store
  const currentOrganization = useOrganizationStore(state => state.currentOrganization);
  const members = useOrganizationStore(state => state.members);
  const inviteTokens = useOrganizationStore(state => state.inviteTokens);
  const currentUserRole = useOrganizationStore(state => state.currentUserRole);
  const loading = useOrganizationStore(state => state.loading);
  const storeFetchOrganization = useOrganizationStore(state => state.fetchOrganization);
  const storeFetchMembers = useOrganizationStore(state => state.fetchMembers);
  const storeFetchInviteTokens = useOrganizationStore(state => state.fetchInviteTokens);
  const storeSetMembers = useOrganizationStore(state => state.setMembers);
  const storeSetInviteTokens = useOrganizationStore(state => state.setInviteTokens);
  const storeSetOrganization = useOrganizationStore(state => state.setOrganization);

  // These functions are now handled by the store
  // Keep references for backward compatibility
  const fetchUserOrganization = storeFetchOrganization;
  const fetchMembers = storeFetchMembers;

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
        } as any)
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
        } as any);

      if (membershipError) throw membershipError;

      const createdOrganization: Organization = orgData;
      storeSetOrganization(createdOrganization);

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
      console.log('🔄 Starting invitation process for:', email);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address.');
      }

      // Get organization details for the invitation
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name, organization_code')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        throw new Error('Organization not found.');
      }

      console.log('📧 Organization found:', orgData.name);

      // Check if this email already has a pending invitation
      const { data: existingInvites } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (existingInvites && existingInvites.length > 0) {
        throw new Error('An invitation has already been sent to this email address.');
      }

      // Check if user exists and is already a member
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (profile) {
        const { data: existingMembership } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', profile.id)
          .single();

        if (existingMembership) {
          if (existingMembership.status === 'Active') {
            throw new Error('User is already a member of an organization.');
          } else if (existingMembership.organization_id === organizationId && existingMembership.status === 'Pending') {
            throw new Error('User already has a pending invitation to this organization.');
          }
        }
      }

      // Create an invite token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { error: tokenError } = await supabase
        .from('invite_tokens')
        .insert({
          token,
          email,
          organization_id: organizationId,
          organization_code: orgData.organization_code,
          role: role === 'admin' ? 'Admin' : 'Member',
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          is_used: false
        });

      if (tokenError) {
        console.error('Token creation error:', tokenError);
        throw new Error('Failed to create invitation token.');
      }

      console.log('✅ Invitation token created');

      // Create the invitation link
      const inviteLink = `${window.location.origin}/auth?invite=${token}`;

      // Send email using a simple email service or function
      // For now, we'll create a Supabase Edge Function call or use a simple email service
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            to: email,
            organizationName: orgData.name,
            inviteLink: inviteLink,
            inviterName: user.email,
            role: role === 'admin' ? 'Admin' : 'Member',
            expiresAt: expiresAt.toISOString()
          }
        });

        if (emailError) {
          console.error('Email function error:', emailError);
          // For now, don't fail the whole process - just show the link
          console.warn('Email service not available, invitation created but not sent');

          toast({
            title: "Invitation created",
            description: `Invitation token created. Please manually share this link: ${inviteLink}`,
          });
        } else {
          console.log('📧 Email sent successfully via Edge Function');

          toast({
            title: "Invitation sent!",
            description: `Invitation email sent to ${email}. They will receive a link to join ${orgData.name}.`,
          });
        }
      } catch (emailError) {
        console.warn('Email function not available, showing invite link:', emailError);

        // Fallback: Show the invite link to the user to share manually
        toast({
          title: "Invitation link created",
          description: `Please share this link with ${email}: ${inviteLink}`,
        });
      }

      // Refresh invite tokens list
      await fetchInviteTokens(organizationId);

      console.log('✅ Invitation process completed successfully');

      return { email, role, inviteLink };
    } catch (error: any) {
      console.error('❌ Invitation error:', error);

      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      if (!currentOrganization) throw new Error('No organization found');

      // Remove membership record
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('user_id', memberId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      // Refresh members list
      await fetchMembers(currentOrganization.id);

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

      storeSetMembers(members.map(member =>
        member.id === memberId
          ? { ...member, role: role === 'admin' ? 'Admin' : 'Member' }
          : member
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

  // fetchInviteTokens is now handled by the store
  const fetchInviteTokens = storeFetchInviteTokens;

  const resendInvite = async (tokenId: string, email: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const token = inviteTokens.find(t => t.id === tokenId);
      if (!token) throw new Error('Token not found');

      const inviteLink = `${window.location.origin}/auth?invite=${token.token}`;

      // Try to send email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            to: email,
            organizationName: currentOrganization?.name,
            inviteLink: inviteLink,
            inviterName: user?.email || 'Someone',
            role: token.role,
            expiresAt: token.expires_at
          }
        });

        if (emailError) {
          console.warn('Email service failed, showing link to copy');
          toast({
            title: "Email service unavailable",
            description: `Please share this link manually: ${inviteLink}`,
          });
        } else {
          toast({
            title: "Invitation resent!",
            description: `Invitation email sent to ${email}.`,
          });
        }
      } catch (emailError) {
        toast({
          title: "Invitation link ready",
          description: `Please share this link with ${email}: ${inviteLink}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error resending invitation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const revokeInvite = async (tokenId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('invite_tokens')
        .delete()
        .eq('id', tokenId);

      if (error) throw error;

      // Remove from local state
      storeSetInviteTokens(inviteTokens.filter(token => token.id !== tokenId));

      toast({
        title: "Invitation revoked",
        description: `Invitation for ${email} has been revoked.`,
      });
    } catch (error: any) {
      toast({
        title: "Error revoking invitation",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Fetch organization from store (will skip if already cached)
    storeFetchOrganization();
  }, [storeFetchOrganization]);

  useEffect(() => {
    if (currentOrganization) {
      // Fetch members and tokens from store (will skip if already cached)
      storeFetchMembers(currentOrganization.id);
      storeFetchInviteTokens(currentOrganization.id);
    }
  }, [currentOrganization, storeFetchMembers, storeFetchInviteTokens]);

  return {
    currentOrganization,
    members,
    inviteTokens,
    currentUserRole,
    loading,
    createOrganization,
    inviteMember,
    removeMember,
    updateMemberRole,
    approveMember,
    rejectMember,
    resendInvite,
    revokeInvite,
    refreshOrganizations: fetchUserOrganization
  };
};