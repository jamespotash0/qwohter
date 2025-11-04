/**
 * Central export for all React Query hooks
 *
 * Import all hooks from here for consistency:
 * import { useQuotes, useOrganization, useSubscriptionStatus } from '@/hooks/queries';
 */

// Quotes
export {
  useQuotes,
  useQuote,
  useCreateQuote,
  useUpdateQuote,
  useDeleteQuote,
  useUpdateQuoteStatus,
  useArchiveQuote,
  useUnarchiveQuote,
  useSetMainVersion,
  useCreateQuoteVersion,
} from './useQuotes';

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

// Types
export type { UserProfile, Session } from './useAuth';
export type { DashboardStats, QuoteActivity } from './useDashboard';
