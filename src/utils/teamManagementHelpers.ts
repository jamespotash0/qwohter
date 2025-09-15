/**
 * Team Management Helper Utilities
 * 
 * Extracted from Team.tsx to provide reusable team management functionality
 * including member invitations, organization code management, and member actions
 */

import { sanitizeInput } from "@/utils/security";

export type Role = 'admin' | 'member' | 'owner';

export interface InviteMemberData {
  organizationId: string;
  email: string;
  role: Role;
}

export interface TeamOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Team management helper functions
 */
export const teamManagementHelpers = {
  /**
   * Get organization code for admin users
   */
  getOrganizationCode: async (
    _userId: string, 
    currentOrganization: any, 
    currentUserRole: string | null
  ): Promise<string | null> => {
    try {
      // For now, use the existing organization hook until RPC function is deployed
      // This is secure because the useOrganizations hook uses RLS policies
      if (currentOrganization?.organization_code) {
        // Only return code if user has admin privileges (checked by UI state)
        if (['admin', 'owner'].includes(currentUserRole || '')) {
          return currentOrganization.organization_code;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching organization code:', error);
      return null;
    }
  },

  /**
   * Copy organization code to clipboard
   */
  copyOrganizationCode: async (orgCode: string): Promise<TeamOperationResult> => {
    try {
      await navigator.clipboard.writeText(orgCode);
      return {
        success: true,
        data: { message: 'Organization code copied to clipboard' }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to copy organization code'
      };
    }
  },

  /**
   * Invite a new member to the organization
   */
  inviteMember: async (
    { organizationId, email, role }: InviteMemberData,
    inviteFunction: (orgId: string, email: string, role?: 'admin' | 'member') => Promise<any>
  ): Promise<TeamOperationResult> => {
    if (!email || !organizationId) {
      return {
        success: false,
        error: 'Email and organization ID are required'
      };
    }

    try {
      // Sanitize email input
      const sanitizedEmail = sanitizeInput.email(email);
      
      // Filter role to match what inviteFunction accepts (owner role is not supported for invitations)
      const inviteRole = role === 'owner' ? 'admin' : role as 'admin' | 'member';
      await inviteFunction(organizationId, sanitizedEmail, inviteRole);
      
      return {
        success: true,
        data: { 
          message: `Invitation sent to ${sanitizedEmail}`,
          email: sanitizedEmail,
          role 
        }
      };
    } catch (error) {
      console.error('Error inviting member:', error);
      return {
        success: false,
        error: 'Failed to send invitation'
      };
    }
  },

  /**
   * Handle member management actions (approve, reject, remove, update role)
   */
  handleMemberAction: async (
    action: 'approve' | 'reject' | 'remove' | 'updateRole',
    memberId: string,
    actionFunction: (memberId: string, ...args: any[]) => Promise<void>,
    ...additionalArgs: any[]
  ): Promise<TeamOperationResult> => {
    if (!memberId) {
      return {
        success: false,
        error: 'Member ID is required'
      };
    }

    try {
      await actionFunction(memberId, ...additionalArgs);
      
      const actionMessages = {
        approve: 'Member approved successfully',
        reject: 'Member rejected successfully',
        remove: 'Member removed successfully',
        updateRole: 'Member role updated successfully'
      };

      return {
        success: true,
        data: { 
          message: actionMessages[action],
          action,
          memberId 
        }
      };
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
      
      const errorMessages = {
        approve: 'Failed to approve member',
        reject: 'Failed to reject member', 
        remove: 'Failed to remove member',
        updateRole: 'Failed to update member role'
      };

      return {
        success: false,
        error: errorMessages[action]
      };
    }
  },

  /**
   * Calculate team statistics from members array
   */
  calculateTeamStats: (members: any[]) => {
    const activeMembersCount = members.filter(m => m.status === 'active').length;
    const pendingMembersCount = members.filter(m => m.status === 'pending').length;
    const totalMembersCount = members.length;
    
    const roleDistribution = members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      activeMembersCount,
      pendingMembersCount,
      totalMembersCount,
      roleDistribution
    };
  },

  /**
   * Validate member permissions for actions
   */
  canPerformAction: (
    currentUserRole: string | null, 
    targetMemberRole: string, 
    targetMemberId: string, 
    currentUserId: string,
    action: string
  ): boolean => {
    // Can't perform actions on yourself (except certain actions)
    if (targetMemberId === currentUserId && !['updateOwnProfile'].includes(action)) {
      return false;
    }

    // Only admins and owners can manage members
    if (!['admin', 'owner'].includes(currentUserRole || '')) {
      return false;
    }

    // Can't modify owner roles
    if (targetMemberRole === 'owner' && action.includes('role')) {
      return false;
    }

    return true;
  }
};