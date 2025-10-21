// Global State Management System for Qwohter
// Built with Zustand for lightweight, performant state management

// ====================================================================
// AUTH STORE - Authentication and user profile management
// ====================================================================
export {
  useAuthStore,
  useUser,
  useProfile,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useAuthActions
} from './auth/authStore';

// ====================================================================
// QUOTES STORE - Quote data management with CRUD operations
// ====================================================================
export {
  useQuotesStore,
  useQuotes,
  useCurrentQuote,
  useQuotesLoading,
  useQuotesError,
  useQuotesFilters,
  useQuotesPagination,
  useFilteredQuotes,
  useQuotesActions
} from './quotes/quotesStore';

// ====================================================================
// UI STORE - Application UI state, modals, toasts, theming
// ====================================================================
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
// APP STORE - Application lifecycle, feature flags, performance
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

// ====================================================================
// ORGANIZATION STORE - Organization and team management
// ====================================================================
export {
  useOrganizationStore,
  useCurrentOrganization,
  useOrganizationMembers,
  useInviteTokens,
  useCurrentUserRole,
  useOrganizationLoading
} from './organization/organizationStore';

// ====================================================================
// STORE UTILITIES AND HOOKS
// ====================================================================

/**
 * Combined hook for common application state
 * 
 * @example
 * const { user, isLoading, quotes, theme } = useAppState();
 */
import { useUser, useAuthLoading } from './auth/authStore';
import { useQuotes, useQuotesLoading } from './quotes/quotesStore';
import { useTheme, useGlobalLoading } from './ui/uiStore';
import { useAppInitialized } from './app/appStore';

export const useAppState = () => ({
  // Auth state
  user: useUser(),
  isAuthenticated: useUser() !== null,
  authLoading: useAuthLoading(),
  
  // Data state
  quotes: useQuotes(),
  quotesLoading: useQuotesLoading(),
  
  // UI state
  theme: useTheme(),
  globalLoading: useGlobalLoading(),
  
  // App state
  isAppInitialized: useAppInitialized(),
  
  // Combined loading state
  isLoading: useAuthLoading() || useQuotesLoading() || useGlobalLoading().loading,
});

/**
 * Hook for common application actions
 * 
 * @example
 * const { signIn, createQuote, showToast } = useAppActions();
 */
import { useAuthActions } from './auth/authStore';
import { useQuotesActions } from './quotes/quotesStore';
import { useUIActions } from './ui/uiStore';
import { useAppActions as useAppStoreActions } from './app/appStore';

export const useAppGlobalActions = () => ({
  // Auth actions
  ...useAuthActions(),
  
  // Data actions
  ...useQuotesActions(),
  
  // UI actions
  ...useUIActions(),
  
  // App actions
  ...useAppStoreActions(),
});

/**
 * Development utilities for debugging store state
 */
export const devUtils = {
  // Log all store states
  logStores: () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('📊 Store State Debug');
    console.log('Auth:', useAuthStore.getState());
    console.log('Quotes:', useQuotesStore.getState());
    console.log('UI:', useUIStore.getState());
    console.log('App:', useAppStore.getState());
    console.groupEnd();
  },
  
  // Reset all stores (development only)
  resetAllStores: () => {
    if (process.env.NODE_ENV !== 'development') {
      console.warn('Store reset is only available in development');
      return;
    }
    
    console.log('🔄 Resetting all stores...');
    useAppStore.getState().reset();
  },
  
  // Performance metrics
  getPerformanceReport: () => {
    const appState = useAppStore.getState();
    const quotesCount = useQuotesStore.getState().quotes.length;
    const toastsCount = useUIStore.getState().toasts.length;
    
    return {
      initialized: appState.isInitialized,
      performance: appState.performance,
      dataSize: {
        quotes: quotesCount,
        toasts: toastsCount,
      },
      lastSync: appState.lastSync,
      environment: appState.environment,
    };
  },
};

// Re-export store instances for advanced use cases
import { useAuthStore } from './auth/authStore';
import { useQuotesStore } from './quotes/quotesStore';
import { useUIStore } from './ui/uiStore';
import { useAppStore } from './app/appStore';
import { useOrganizationStore } from './organization/organizationStore';

export const stores = {
  auth: useAuthStore,
  quotes: useQuotesStore,
  ui: useUIStore,
  app: useAppStore,
  organization: useOrganizationStore,
};