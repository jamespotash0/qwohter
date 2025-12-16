import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AppRouter } from "@/router";
import { AuthProvider } from "@/auth/AuthProvider";
import { queryClient } from "@/lib/queryClient";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import "@/utils/debugImpersonate"; // Registers window.impersonate() in dev

/**
 * Main App component - Industry Standard Architecture
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

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;