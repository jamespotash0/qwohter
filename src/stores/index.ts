// ====================================================================
// ZUSTAND STORES - Local UI State Only
// ====================================================================
//
// Architecture Decision (v3.0.0):
// - Server State → React Query (@/hooks/queries)
// - Local UI State → Zustand (here)
// - Auth State → React Context + React Query (@/auth)
//
// This follows industry best practices used by Linear, Vercel, Stripe
// ====================================================================

// ====================================================================
// UI STORE - Application UI state (theme, sidebar, modals, etc.)
// ====================================================================
// ✅ KEEP - This is local UI state, perfect for Zustand
export {
  useUIStore,
  useTheme,
  useSidebarState,
  useGlobalLoading,
  useModals,
  useToasts,
  useBreadcrumbs,
  useUnsavedChanges,
  useFormErrors,
  useUIActions
} from './ui/uiStore';

// ====================================================================
// APP STORE - Application lifecycle and feature flags
// ====================================================================
// ✅ KEEP - Application-level UI state
export {
  useAppStore,
  useAppInitialized,
  useOnlineStatus,
  useFeatureFlags,
  useAppPerformance,
  useAppInfo,
  useAppActions
} from './app/appStore';

// ====================================================================
// DEPRECATED STORES - Migrated to React Query
// ====================================================================
// ⚠️ These stores have been archived and replaced with React Query hooks

/**
 * @deprecated Use React Query hooks instead
 *
 * Migration guide:
 *
 * QUOTES:
 * - OLD: useQuotesStore((state) => state.quotes)
 * - NEW: const { data: quotes } = useQuotes(userId) from '@/hooks/queries'
 *
 * ORGANIZATION:
 * - OLD: useOrganizationStore((state) => state.currentOrganization)
 * - NEW: const { data: org } = useUserOrganization(userId) from '@/hooks/queries'
 *
 * BOARD:
 * - OLD: useBoardStore((state) => state.projects)
 * - NEW: const { data: projects } = useProjects(orgId) from '@/hooks/queries'
 *
 * REMINDERS:
 * - OLD: useRemindersStore((state) => state.reminders)
 * - NEW: const { data: reminders } = useReminders(orgId) from '@/hooks/queries'
 *
 * AUTH:
 * - OLD: useAuthStore((state) => state.user)
 * - NEW: const user = useUser() from '@/auth'
 */

// Re-export for type compatibility only
// Actual implementations are archived in .archived/
export type { Quote } from './quotes/quotesStore';
export type { Project, WorkflowColumn } from './board/boardStore';
export type { Reminder } from './reminders/remindersStore';
