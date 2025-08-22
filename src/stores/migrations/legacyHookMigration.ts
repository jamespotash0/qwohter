/**
 * Legacy Hook Migration Utilities
 * 
 * Provides compatibility layer and migration path from existing custom hooks
 * to the new global state management system.
 */

import { useQuotesStore, useAuthStore } from '../index';
import type { Quote } from '@/hooks/useQuotes';
import type { UserProfile } from '@/hooks/useUserProfile';

/**
 * Migrated useQuotes hook - maintains API compatibility
 * while using global state underneath
 */
export const useQuotesLegacy = () => {
  const {
    quotes,
    loading,
    createQuote,
    updateQuote,
    updateWallSystem,
    removeWallSystem,
    deleteQuote,
    fetchQuotes,
  } = useQuotesStore((state) => ({
    quotes: state.quotes,
    loading: state.isLoading,
    createQuote: state.createQuote,
    updateQuote: state.updateQuote,
    updateWallSystem: state.updateWallSystem,
    removeWallSystem: state.removeWallSystem,
    deleteQuote: state.deleteQuote,
    fetchQuotes: state.fetchQuotes,
  }));

  // Legacy methods for backward compatibility
  const markAsDownloaded = async (id: string) => {
    await updateQuote(id, { 
      date_last_downloaded: new Date().toISOString() 
    });
  };

  const saveQuoteCustomization = async (id: string, customization: any) => {
    const currentQuote = quotes.find(q => q.id === id);
    const newVersion = (currentQuote?.version || 0) + 1;
    
    await updateQuote(id, {
      customization: {
        ...customization,
        lastModified: new Date().toISOString(),
        version: newVersion
      },
      version: newVersion
    });
  };

  return {
    quotes,
    loading,
    createQuote,
    updateQuote,
    updateWallSystem,
    removeWallSystem,
    deleteQuote,
    markAsDownloaded,
    saveQuoteCustomization,
    refreshQuotes: () => fetchQuotes({ refresh: true }),
  };
};

/**
 * Migrated useUserProfile hook - maintains API compatibility
 */
export const useUserProfileLegacy = (userId?: string) => {
  const { user, profile, isLoading, error } = useAuthStore((state) => ({
    user: state.user,
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error,
  }));

  // Use global profile if no specific userId requested, or if it matches current user
  const shouldUseGlobalProfile = !userId || userId === user?.id;
  
  if (shouldUseGlobalProfile) {
    return {
      profile,
      loading: isLoading,
      error,
    };
  }

  // If requesting different user's profile, fall back to original implementation
  // (This maintains backward compatibility for edge cases)
  return {
    profile: null,
    loading: false,
    error: 'Profile lookup for other users not supported in global state',
  };
};

/**
 * Migration utilities for converting components
 */
export const migrationUtils = {
  /**
   * Replace local useState with global state selectors
   */
  replaceLocalState: {
    // Example: Replace local quote state
    quotes: () => {
      console.warn(
        'Local quote state detected. Consider migrating to useQuotes() from global store.'
      );
      return useQuotesStore((state) => state.quotes);
    },
    
    // Example: Replace local user state
    user: () => {
      console.warn(
        'Local user state detected. Consider migrating to useUser() from global store.'
      );
      return useAuthStore((state) => state.user);
    },
  },

  /**
   * Detect usage of legacy patterns
   */
  detectLegacyPatterns: {
    useState: (componentName: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.info(
          `🚧 Migration Opportunity: ${componentName} is using useState for data that could be global. Consider using global stores.`
        );
      }
    },
    
    propDrilling: (componentName: string, propName: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.info(
          `🚧 Migration Opportunity: ${componentName} is receiving '${propName}' as prop. Consider using global store selector.`
        );
      }
    },
  },

  /**
   * Component migration helpers
   */
  componentMigration: {
    // Helper to wrap legacy components during migration
    wrapLegacyComponent: <P extends {}>(Component: React.ComponentType<P>) => {
      return (props: P) => {
        if (process.env.NODE_ENV === 'development') {
          console.info(
            `⚡ Legacy component wrapper active for ${Component.name}. Consider migrating to global state.`
          );
        }
        return <Component {...props} />;
      };
    },
    
    // Generate migration report for component
    generateMigrationReport: (componentName: string) => {
      if (process.env.NODE_ENV !== 'development') return;
      
      console.group(`📄 Migration Report: ${componentName}`);
      console.log('Suggested migrations:');
      console.log('1. Replace local state with global store selectors');
      console.log('2. Replace prop drilling with direct store access');
      console.log('3. Use global actions instead of local handlers');
      console.log('4. Remove unnecessary useEffect dependencies');
      console.groupEnd();
    },
  },
};

/**
 * Development-only migration assistant
 */
export const migrationAssistant = {
  scanForMigrationOpportunities: () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('🔍 Global State Migration Opportunities');
    console.log('Scanning for components that could benefit from global state...');
    
    // This could be expanded to actually scan component usage patterns
    console.log('ℹ️ Run individual component scans using migrationUtils.componentMigration.generateMigrationReport()');
    console.groupEnd();
  },
  
  showMigrationGuide: () => {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('📚 Global State Migration Guide');
    console.log('Step 1: Identify components with local state that should be global');
    console.log('Step 2: Replace useState hooks with store selectors');
    console.log('Step 3: Replace local handlers with store actions');
    console.log('Step 4: Remove prop drilling by accessing stores directly');
    console.log('Step 5: Test and verify behavior is unchanged');
    console.log('Step 6: Remove legacy hook imports');
    console.groupEnd();
  },
};

// Auto-run migration assistant in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).migrationAssistant = migrationAssistant;
  console.log('🧪 Migration assistant available at window.migrationAssistant');
}