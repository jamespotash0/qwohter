/**
 * @deprecated This store has been migrated to React Query
 * Use hooks from @/hooks/queries instead
 *
 * Migration:
 * - import { useUserOrganization, useOrganizationMembers } from '@/hooks/queries'
 * - const { data: org } = useUserOrganization(userId)
 * - const { data: members } = useOrganizationMembers(organizationId)
 *
 * Types are still exported for backward compatibility
 */

// Re-export types from service layer
export type { Organization, OrganizationMember, UserMembership, InviteToken } from '@/services/organizationService';
