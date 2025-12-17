/**
 * Central export for all React Query hooks
 *
 * Import all hooks from here for consistency:
 * import { useOrganization, useSubscriptionStatus } from '@/hooks/queries';
 */


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
} from './useOrganization';

// Dashboard
export { useDashboardStats } from './useDashboard';

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
  useCreateProject,
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
  useArchivedForms,
  useArchiveForm,
  useUnarchiveForm,
  useIsFormInUse,
} from './useForms';

// Types
export type { UserProfile, Session } from './useAuth';
export type { DashboardStats } from './useDashboard';
export type { Form } from './useForms';
