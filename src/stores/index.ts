
// This follows industry best practices used by Linear, Vercel, Stripe
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
  useUIActions,
  usePagePreferences,
  useSidebarSections,
  type PagePreferences,
  type DataDensity,
} from './ui/uiStore';
// ====================================================================
export {
  useAppStore,
  useAppInitialized,
  useOnlineStatus,
  useFeatureFlags,
  useAppPerformance,
  useAppInfo,
  useAppActions
} from './app/appStore';
