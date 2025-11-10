/**
 * Central export for all React Query hooks
 *
 * Import all hooks from here for consistency:
 * import { useProposals, useOrganization, useSubscriptionStatus } from '@/hooks/queries';
 */

// Proposals (now uses proposals infrastructure)
export {
  useProposals,
  useProposal,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
  useUpdateProposalStatus,
  useArchiveProposal,
  useUnarchiveProposal,
  useSetMainVersion,
  useCreateProposalVersion,
} from './useProposals';

// Organization
export {
  // Query Hooks
  useUserOrganization,
  useOrganizationById,
  useOrganizationMembers,
  useInviteTokens,
  useSubscriptionStatus,

  // Mutation Hooks
  useUpdateOrganization,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useUpdateMemberStatus,
  useApproveMember,
  useSuspendMember,

  // Convenience Hooks
  useCurrentOrganization,
  useOrganizationContext,

  // Legacy
  useOrganization,
} from './useOrganization';

// Dashboard
export {
  useDashboardStats,
  useRecentActivities,
} from './useDashboard';

// Auth
export {
  useUserProfile,
  useSession,
} from './useAuth';

// Reminders
export {
  useReminders,
  useUpcomingReminders,
  useCreateReminder,
  useUpdateReminder,
  useCompleteReminder,
  useDeleteReminder,
} from './useReminders';

// Board
export {
  useProjects,
  useWorkflowColumns,
  useUpdateProject,
  useDeleteProject,
  useCreateWorkflowColumn,
  useUpdateWorkflowColumn,
  useDeleteWorkflowColumn,
  useMoveBoardItem,
} from './useBoard';

// Forms
export {
  useForms,
  useForm,
  useDefaultForm,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useCopyForm,
  useSetDefaultForm,
  useUnsetDefaultForm,
} from './useForms';

// Types
export type { UserProfile, Session } from './useAuth';
export type { DashboardStats, ProposalActivity } from './useDashboard';
export type { Form } from './useForms';
