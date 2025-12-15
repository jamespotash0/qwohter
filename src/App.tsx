import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AppRouter } from "@/router";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/auth/AuthProvider";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import "@/utils/debugImpersonate"; // Registers window.impersonate() in dev

/**
 * Main App component - Industry Standard Architecture
 *
 * v3.0.0 CHANGES:
 * - REPLACED: Zustand authStore with AuthProvider (React Context + React Query)
 * - REPLACED: initializeAuth() with automatic AuthProvider initialization
 * - REPLACED: Flag-based race protection with AuthEventMutex
 *
 * Features:
 * - React Query for ALL server state (auth, quotes, org, etc.)
 * - Single Supabase auth listener (registered in AuthProvider)
 * - Zero race conditions (mutex-based serialization)
 * - Automatic session restoration and token refresh
 * - Clean hooks API (useUser, useSession, useProfile)
 */
const App = () => {
  // Automatic version checking to prevent stale client issues
  // Checks every 5 minutes for new deployments
  useVersionCheck({
    checkInterval: 5 * 60 * 1000, // 5 minutes
    autoReloadDelay: 30, // 30 seconds
  });

  useEffect(() => {
    // One-time cleanup of old manual localStorage cache keys
    // This can be removed after all users have migrated to v3.0.0
    const cleanupOldCache = () => {
      const oldCacheKeys = [
        // Quote store old cache keys
        'quotes_cache',
        'quotes_cache_time',
        'quotes_timestamp',
        'quotes_last_fetch',

        // Organization store old cache keys
        'org_cached_organization',
        'org_cached_members',
        'org_cached_user_role',
        'org_cache_timestamp',
        'org_last_member_fetch',

        // Auth store old cache keys
        'auth_cached_profile',
        'auth_cache_timestamp',

        // Sidebar old cache keys
        'sidebar_cached_profile',
        'sidebar_cached_role',
        'sidebar_cache_timestamp',

        // Subscription old cache keys (matches patterns)
        'subscription_status_cache',
        'subscription_cache_timestamp',
        'subscription_last_check',
      ];

      let cleanedCount = 0;

      // Remove exact match keys
      oldCacheKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });

      // Remove wildcard patterns (any key starting with 'subscription_')
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('subscription_') && !key.includes('REACT_QUERY')) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });

      if (cleanedCount > 0) {
        console.log(`[v2.0.0-hybrid] Cleaned up ${cleanedCount} old localStorage cache keys`);
        console.log('[v2.0.0-hybrid] Now using single React Query cache: REACT_QUERY_OFFLINE_CACHE');
      }
    };

    cleanupOldCache();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppRouter />
            </TooltipProvider>
            {/* React Query DevTools - only in development */}
            <ReactQueryDevtools initialIsOpen={false} position="bottom" />
          </AuthProvider>
        </QueryClientProvider>
        {/* Vercel Analytics - tracks page views and Web Vitals */}
        <Analytics />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;