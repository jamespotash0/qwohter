/**
 * React Query Hooks for Organization
 *
 * Comprehensive hooks using organizationService for all organization operations.
 * Replaces organizationStore with React Query patterns for proper cache management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateQueries } from '@/lib/queryClient';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchOrganizationByUserId,
  fetchOrganizationById,
  updateOrganization,
  fetchOrganizationMembers,
  fetchInviteTokens,
  checkSubscriptionStatus,
  type Organization,
  type OrganizationMember,
  type UserMembership,
  type InviteToken,
  type UpdateOrganizationData,
  type SubscriptionStatus,
} from '@/services/organizationService';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Use User Organization
 *
 * Fetches user's organization membership with organization details
 *
 * @param userId - User ID to fetch membership for
 * @param enabled - Whether to enable the query (default: true)
 * @returns User membership with organization data
 */
export function useUserOrganization(userId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.organization.byUser(userId),
    queryFn: () => fetchOrganizationByUserId(userId),
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - organization data changes infrequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Use Organization by ID
 *
 * Fetches organization details by organization ID
 *
 * @param organizationId - Organization ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Organization data
 */
export function useOrganizationById(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.organization.detail(organizationId),
    queryFn: () => fetchOrganizationById(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Use Organization Members
 *
 * Fetches organization members with profile data
 * React Query automatically handles request deduplication and race conditions
 *
 * @param organizationId - Organization ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Organization members with profiles
 */
export function useOrganizationMembers(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.organization.members(organizationId),
    queryFn: () => fetchOrganizationMembers(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 60 * 1000, // 1 minute - member lists change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    // React Query automatically handles:
    // - Request deduplication (multiple rapid calls = 1 network request)
    // - Stale request cancellation (prevents race conditions)
    // - Cache updates and background refetching
  });
}

/**
 * Hook: Use Invite Tokens
 *
 * Fetches invite tokens for organization
 *
 * @param organizationId - Organization ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Invite tokens
 */
export function useInviteTokens(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.organization.invites(organizationId),
    queryFn: () => fetchInviteTokens(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 30 * 1000, // 30 seconds - invite tokens can change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook: Use Subscription Status
 *
 * Fetches subscription status for organization
 *
 * @param organizationId - Organization ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Subscription status
 */
export function useSubscriptionStatus(organizationId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.subscription.status(organizationId),
    queryFn: () => checkSubscriptionStatus(organizationId),
    enabled: !!organizationId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - subscription status is important but stable
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook: Update Organization
 *
 * Updates organization settings with optimistic updates
 *
 * @returns Mutation object for updating organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      updates
    }: {
      organizationId: string;
      updates: UpdateOrganizationData;
    }) => {
      return updateOrganization(organizationId, updates);
    },

    onMutate: async ({ organizationId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.organization.detail(organizationId)
      });

      // Snapshot for rollback
      const previousOrg = queryClient.getQueryData<Organization>(
        queryKeys.organization.detail(organizationId)
      );

      // Optimistically update
      queryClient.setQueryData<Organization>(
        queryKeys.organization.detail(organizationId),
        (old) => {
          if (!old) return old;
          return { ...old, ...updates };
        }
      );

      return { previousOrg, organizationId };
    },

    onSuccess: (updatedOrg, variables) => {
      toast.success('Organization updated successfully');

      // Invalidate all organization queries
      invalidateQueries.allOrganization();
    },

    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrg && context?.organizationId) {
        queryClient.setQueryData(
          queryKeys.organization.detail(context.organizationId),
          context.previousOrg
        );
      }

      console.error('Failed to update organization:', error);
      toast.error('Failed to update organization');
    },
  });
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook: Use Current Organization
 *
 * Convenience hook that combines user organization membership with organization details
 * Useful for getting all org data in a single hook
 *
 * @param userId - User ID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Combined organization data with membership info
 */
export function useCurrentOrganization(userId: string, enabled: boolean = true) {
  const { data: membership, isLoading: membershipLoading, error: membershipError } =
    useUserOrganization(userId, enabled);

  return {
    organization: membership?.organization || null,
    organizationId: membership?.organization_id || null,
    role: membership?.role || null,
    status: membership?.status || null, //membership_status
    joinedAt: membership?.joined_at || null,
    isLoading: membershipLoading,
    error: membershipError,
    hasOrganization: !!membership?.organization,
    isActive: membership?.status === 'Active', //membership_status
  };
}

/**
 * Hook: Use Organization Context
 *
 * Convenience hook that provides complete organization context
 * Includes: organization, members, invite tokens, and subscription status
 *
 * @param userId - User ID
 * @param enabled - Whether to enable the queries (default: true)
 * @returns Complete organization context
 */
export function useOrganizationContext(userId: string, enabled: boolean = true) {
  // Get user's organization
  const {
    organization,
    organizationId,
    role,
    status, //membership_status
    isLoading: orgLoading,
  } = useCurrentOrganization(userId, enabled);

  // Get members (only fetch if we have an org)
  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
  } = useOrganizationMembers(organizationId || '', !!organizationId && enabled);

  // Get invite tokens (only fetch if we have an org)
  const {
    data: inviteTokens,
    isLoading: tokensLoading,
    error: tokensError,
  } = useInviteTokens(organizationId || '', !!organizationId && enabled);

  // Get subscription status (only fetch if we have an org)
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useSubscriptionStatus(organizationId || '', !!organizationId && enabled);

  return {
    // Organization data
    organization,
    organizationId,
    role,
    status, //membership_status

    // Members
    members: members || [],
    membersCount: members?.length || 0,

    // Invite tokens
    inviteTokens: inviteTokens || [],
    pendingInvites: inviteTokens?.filter((t) => !t.is_used) || [],

    // Subscription
    subscription,
    hasAccess: subscription?.hasAccess || false,
    subscriptionStatus: subscription?.status || null,

    // Loading states
    isLoading: orgLoading || membersLoading || tokensLoading || subscriptionLoading,
    isOrgLoading: orgLoading,
    areMembersLoading: membersLoading,
    areTokensLoading: tokensLoading,
    isSubscriptionLoading: subscriptionLoading,

    // Errors
    errors: {
      organization: null,
      members: membersError,
      tokens: tokensError,
      subscription: subscriptionError,
    },

    // Helpers
    hasOrganization: !!organization,
    isActive: status === 'Active', //membership_status
    isOwner: role === 'Owner',
    isAdmin: role === 'Admin' || role === 'Owner',
    canManageMembers: role === 'Admin' || role === 'Owner',
    canManageOrganization: role === 'Owner',

    // Helper functions (for compatibility with old useMembership hook)
    getUserRole: () => role,
  };
}

// ============================================================================
// Membership Mutation Hooks
// ============================================================================

/**
 * Hook: Invite Member
 *
 * Invites a new member to the organization via email invitation
 */
export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role, department }: { email: string; role: 'Admin' | 'Member'; department?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current user's profile for inviter name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const inviterName = profile?.full_name || 'Your teammate';

      // Get organization details
      const { data: organization } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Use team invitation service to send invite
      const { teamInvitationService } = await import('@/services/teamInvitationService');

      const result = await teamInvitationService.inviteMember({
        organizationId,
        organizationName: organization.name,
        email,
        role,
        invitedBy: user.id,
        inviterName,
        department,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate invite tokens list to show new invitation
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invites(organizationId),
      });
    },
  });
}

/**
 * Hook: Remove Member
 *
 * Removes a member from the organization
 */
export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Member removed successfully');
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(organizationId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}

/**
 * Hook: Update Member Role
 *
 * Updates a member's role in the organization
 */
export function useUpdateMemberRole(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, role }: { membershipId: string; role: 'Owner' | 'Admin' | 'Member' }) => {
      const { data, error } = await supabase
        .from('memberships')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { role }) => {
      toast.success(`Role updated to ${role}`);
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(organizationId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

/**
 * Hook: Update Member Status
 *
 * Updates a member's status (Pending/Active/Suspended)
 */
export function useUpdateMemberStatus(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, status }: { membershipId: string; status: 'Active' | 'Suspended' }) => { //membership_status
      const { data, error } = await supabase
        .from('memberships')
        .update({
          status, //membership_status
          updated_at: new Date().toISOString(),
          joined_at: status === 'Active' ? new Date().toISOString() : undefined, //membership_status
        })
        .eq('id', membershipId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => { //membership_status
      toast.success(`Status updated to ${status}`); //membership_status
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(organizationId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Hook: Approve Member (Convenience wrapper)
 *
 * Approves a pending member by setting status to 'Active'
 */
export function useApproveMember(organizationId: string) {
  const { mutate, ...rest } = useUpdateMemberStatus(organizationId);

  return {
    ...rest,
    mutate: (membershipId: string) => mutate({ membershipId, status: 'Active' }), //membership_status
  };
}

/**
 * Hook: Suspend Member (Convenience wrapper)
 *
 * Suspends a member by setting status to 'Suspended'
 */
export function useSuspendMember(organizationId: string) {
  const { mutate, ...rest } = useUpdateMemberStatus(organizationId);

  return {
    ...rest,
    mutate: (membershipId: string) => mutate({ membershipId, status: 'Suspended' }), //membership_status
  };
}

/**
 * Hook: Revoke Invitation
 *
 * Revokes/cancels a pending invitation by deleting the invite token
 */
export function useRevokeInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteToken: string) => {
      const { teamInvitationService } = await import('@/services/teamInvitationService');
      const result = await teamInvitationService.cancelInvitation(inviteToken);

      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke invitation');
      }

      return result;
    },
    onSuccess: () => {
      toast.success('Invitation revoked successfully');
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invites(organizationId),
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke invitation: ${error.message}`);
    },
  });
}
