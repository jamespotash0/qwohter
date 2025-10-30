import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useQuotesStore } from '../quotes/quotesStore';
import { useUIStore } from '../ui/uiStore';

interface AppState {
  // Application lifecycle
  isInitialized: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  
  // Application metadata
  version: string;
  buildDate: string;
  environment: 'development' | 'staging' | 'production';
  
  // Feature flags
  features: {
    advancedQuoteEditor: boolean;
    wallSystemBuilder: boolean;
    teamManagement: boolean;
    analytics: boolean;
    apiIntegration: boolean;
  };
  
  // Performance monitoring
  performance: {
    loadTime: number | null;
    renderTime: number | null;
    memoryUsage: number | null;
  };
  
  // Actions
  initialize: () => Promise<void>;
  syncData: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
  updateFeatureFlag: (flag: keyof AppState['features'], enabled: boolean) => void;
  recordPerformance: (metric: keyof AppState['performance'], value: number) => void;
  
  // Utilities
  reset: () => void;
  getAppInfo: () => { version: string; buildDate: string; environment: string };
}

const initialFeatures = {
  advancedQuoteEditor: true,
  wallSystemBuilder: true,
  teamManagement: true,
  analytics: true,
  apiIntegration: false,
};

export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial state
      isInitialized: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastSync: null,
      version: '1.0.0',
      buildDate: new Date().toISOString(),
      environment: (import.meta.env.MODE as any) || 'development',
      features: initialFeatures,
      performance: {
        loadTime: null,
        renderTime: null,
        memoryUsage: null,
      },

      // Initialize the entire application
      initialize: async () => {
        const startTime = performance.now();

        try {

          // ✅ v3.0.0: Auth initialization now handled by AuthProvider
          // OLD: await useAuthStore.getState().initialize();
          // NEW: AuthProvider handles this automatically

          // ✅ v3.0.0: Quote store initialization removed
          // OLD: await useQuotesStore.getState().initialize();
          // NEW: React Query handles initialization automatically via useQuotes() hook
          
          // Set up online/offline listeners
          if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
              get().setOnlineStatus(true);
              get().syncData();
            });
            
            window.addEventListener('offline', () => {
              get().setOnlineStatus(false);
            });
          }
          
          // Record initialization time
          const loadTime = performance.now() - startTime;
          set({ 
            isInitialized: true, 
            lastSync: new Date(),
            performance: { 
              ...get().performance, 
              loadTime 
            }
          });
          
        } catch (error) {
          console.error('❌ Application initialization failed:', error);
          
          // Add error toast
          useUIStore.getState().addToast({
            title: 'Initialization Error',
            description: 'Failed to initialize application. Please refresh the page.',
            type: 'error',
            duration: 0, // Don't auto-dismiss
          });
          
          throw error;
        }
      },

      // Sync data across all stores
      syncData: async () => {
        const { isOnline } = get();
        
        if (!isOnline) {
          return;
        }
        
        try {
          useUIStore.getState().setGlobalLoading(true, 'Syncing data...');

          // Re-fetch quotes if user is authenticated
          // Check Supabase session directly instead of old auth store
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await useQuotesStore.getState().fetchQuotes({ refresh: true });
          }

          set({ lastSync: new Date() });
        } catch (error) {
          console.error('❌ Data sync failed:', error);
          
          useUIStore.getState().addToast({
            title: 'Sync Failed',
            description: 'Failed to sync latest data. Please try again.',
            type: 'error',
          });
        } finally {
          useUIStore.getState().setGlobalLoading(false);
        }
      },

      // Set online status
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        
        // Show toast notification
        useUIStore.getState().addToast({
          title: isOnline ? 'Back Online' : 'Offline',
          description: isOnline 
            ? 'Connection restored. Syncing latest data...' 
            : 'Working offline. Changes will sync when connection is restored.',
          type: isOnline ? 'success' : 'warning',
        });
      },

      // Update feature flag
      updateFeatureFlag: (flag: keyof AppState['features'], enabled: boolean) => {
        set((state) => ({
          features: { ...state.features, [flag]: enabled }
        }));
        
      },

      // Record performance metrics
      recordPerformance: (metric: keyof AppState['performance'], value: number) => {
        set((state) => ({
          performance: { ...state.performance, [metric]: value }
        }));
        
      },

      // Reset entire application state
      reset: () => {
        
        // Reset all stores
        // Note: Auth is managed by AuthProvider - use signOut instead
        useQuotesStore.getState()._setQuotes([]);
        useUIStore.getState().resetUI();
        
        // Reset app store
        set({
          isInitialized: false,
          lastSync: null,
          features: initialFeatures,
          performance: {
            loadTime: null,
            renderTime: null,
            memoryUsage: null,
          },
        });
        
      },

      // Get application info
      getAppInfo: () => {
        const { version, buildDate, environment } = get();
        return { version, buildDate, environment };
      },
    }))
  )
);

// ✅ v3.0.0: Auth subscription removed
// Auth state changes are now handled by AuthProvider
// Data cleanup on sign out is handled in AuthProvider's handleSignedOut

// Selectors for common app patterns
export const useAppInitialized = () => useAppStore((state) => state.isInitialized);
export const useOnlineStatus = () => useAppStore((state) => state.isOnline);
export const useFeatureFlags = () => useAppStore((state) => state.features);
export const useAppPerformance = () => useAppStore((state) => state.performance);
export const useAppInfo = () => useAppStore((state) => ({
  version: state.version,
  buildDate: state.buildDate,
  environment: state.environment,
  lastSync: state.lastSync,
}));

export const useAppActions = () => useAppStore((state) => ({
  initialize: state.initialize,
  syncData: state.syncData,
  setOnlineStatus: state.setOnlineStatus,
  updateFeatureFlag: state.updateFeatureFlag,
  recordPerformance: state.recordPerformance,
  reset: state.reset,
  getAppInfo: state.getAppInfo,
}));