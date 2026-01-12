import { Suspense, lazy } from "react";
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
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/utils/debugImpersonate"; // Registers window.impersonate() in dev

// Lazy load signing page (public, no auth required)
const ProposalSigningPage = lazy(() => import("@/pages/ProposalSigningPage"));

/**
 * Main App component - Industry Standard Architecture
 * Features:
 * - React Query for ALL server state (auth, proposals, org, etc.)
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

  // Check if this is the public signing page - render without AuthProvider
  // This completely bypasses all auth logic for the signing page
  const isSigningPage = window.location.pathname.startsWith('/sign/');

  if (isSigningPage) {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                <Routes>
                  <Route path="/sign/:token" element={<ProposalSigningPage />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
        <Analytics />
      </ErrorBoundary>
    );
  }

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
          {import.meta.env.DEV && (
            <ReactQueryDevtools initialIsOpen={false} position="bottom" />
          )}
        </AuthProvider>
      </QueryClientProvider>
      {/* Vercel Analytics - tracks page views and Web Vitals */}
      <Analytics />
    </ErrorBoundary>
  );
};

export default App;