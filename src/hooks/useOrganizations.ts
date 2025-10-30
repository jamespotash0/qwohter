/**
 * @deprecated This hook has been migrated to React Query
 *
 * Please use the new hooks from @/hooks/queries/useOrganization:
 * - useCurrentOrganization(userId) - Get current user's organization
 * - useOrganizationMembers(organizationId) - Get organization members
 * - useInviteMember(organizationId) - Invite a member
 * - useRemoveMember(organizationId) - Remove a member
 * - useApproveMember(organizationId) - Approve a member
 * - useUpdateMemberRole(organizationId) - Update member role
 * - useUpdateMemberStatus(organizationId) - Update member status
 */

import { useCurrentOrganization, useOrganizationMembers, useInviteMember, useRemoveMember, useApproveMember, useSuspendMember, useUpdateMemberRole } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';
import { toast } from 'sonner';

/**
 * Temporary compatibility hook - DO NOT USE IN NEW CODE
 * This exists only to prevent 404 errors during migration
 */
export function useOrganizations() {
  const user = useUser();
  const { organization, members: membersList = [], role } = useCurrentOrganization(user?.id) as any;

  const { mutate: inviteMemberMutation } = useInviteMember(organization?.id || '');
  const { mutate: removeMemberMutation } = useRemoveMember(organization?.id || '');
  const { mutate: approveMemberMutation } = useApproveMember(organization?.id || '');

  console.warn('[useOrganizations] DEPRECATED: Please migrate to React Query hooks from @/hooks/queries');

  return {
    // Legacy compatibility
    currentOrganization: organization,
    members: membersList,
    currentUserRole: role,
    inviteTokens: [], // Not implemented in compatibility layer

    // Methods - minimal implementation for compatibility
    inviteMember: async (orgId: string, email: string, role: 'admin' | 'member') => {
      inviteMemberMutation({ email, role: role === 'admin' ? 'Admin' : 'Member' });
    },
    removeMember: async (memberId: string) => {
      removeMemberMutation(memberId);
    },
    approveMember: async (memberId: string) => {
      approveMemberMutation(memberId);
    },
    rejectMember: async (memberId: string) => {
      toast.error('Reject member not implemented in compatibility layer');
    },
    resendInvite: async (tokenId: string, email: string) => {
      toast.error('Resend invite not implemented in compatibility layer');
    },
    revokeInvite: async (tokenId: string, email: string) => {
      toast.error('Revoke invite not implemented in compatibility layer');
    },
  };
}
