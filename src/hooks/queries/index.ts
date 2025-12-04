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
} from './useForms';

// PDF Templates
export {
  usePdfTemplates,
  usePdfTemplate,
  useFormPdfTemplates,
  useLinkPdfTemplate,
  useUnlinkPdfTemplate,
} from './usePdfTemplates';

// Document Number Sequences
export {
  useDocumentSequences,
  useDocumentSequence,
  useCreateDocumentSequence,
  useUpdateDocumentSequence,
  useUpsertDocumentSequence,
  formatDocumentNumberPreview,
  DEFAULT_PREFIXES,
} from './useDocumentSequences';

// Types
export type { UserProfile, Session } from './useAuth';
export type { DashboardStats } from './useDashboard';
export type { Form } from './useForms';
export type { PdfTemplate, FormPdfTemplate } from './usePdfTemplates';
export type { DocumentNumberSequence, CreateSequenceData, UpdateSequenceData } from './useDocumentSequences';
