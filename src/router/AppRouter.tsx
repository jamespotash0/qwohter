import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary, QuoteErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/common/layout/MainLayout";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth/authStore";

// Lazy load pages for better performance
import { lazy } from "react";

// Protected auth route wrapper - redirects to dashboard if already logged in
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  // Don't redirect until auth is initialized
  if (!isInitialized) {
    return <>{children}</>;
  }

  // If user is logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public pages
const Landing = lazy(() => import("@/pages/Landing"));
const DemoContact = lazy(() => import("@/pages/DemoContact"));

// Authentication pages
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const AccessDenied = lazy(() => import("@/pages/AccessDenied"));

// Main application pages - import eagerly to prevent navigation flicker
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Team from "@/pages/Team";
import Settings from "@/pages/Settings";
const Subscription = lazy(() => import("@/pages/Subscription"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Quote-related pages (grouped under quotes namespace)
const QuotesList = lazy(() => import("@/pages/Quotes"));
const NewQuote = lazy(() => import("@/pages/NewQuote"));
const QuoteEdit = lazy(() => import("@/pages/QuoteEdit"));
const QuoteEditIncomplete = lazy(() => import("@/pages/QuoteEditIncomplete"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
);

/**
 * Enhanced routing structure for Qwohter
 * 
 * Features:
 * - Lazy loading for better performance
 * - Nested route structure for better organization
 * - Protected routes with authentication checks
 * - Error boundaries for quote-related operations
 * - SEO-friendly URLs that match business logic
 */
export const AppRouter = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <MainLayout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Landing page (public) */}
          <Route path="/" element={<Landing />} />

          {/* Demo contact page (public) */}
          <Route path="/demo-contact" element={<DemoContact />} />

          {/* Authentication routes - redirect to dashboard if already logged in */}
          <Route path="/sign-in" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/create-account" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          <Route path="/reset-password" element={<AuthRoute><ResetPassword /></AuthRoute>} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Legacy redirects */}
          <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/signup" element={<Navigate to="/create-account" replace />} />
          
          {/* Subscription/billing page */}
          <Route path="/subscription" element={<Subscription />} />

          {/* Main application routes (protected by MainLayout) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Analytics and reporting */}
          <Route path="/analytics" element={<Analytics />} />

          {/* Team and organization management (requires Admin or Owner role) */}
          <Route path="/team" element={<Team />} />

          {/* Application settings */}
          <Route path="/settings" element={<Settings />} />

          {/* Quote management routes (nested structure) */}
          <Route path="/quotes" element={<QuotesList />} />

          {/* Quote creation workflow */}
          <Route path="/quotes/new" element={
            <QuoteErrorBoundary>
              <NewQuote />
            </QuoteErrorBoundary>
          } />

          {/* Quote editing - cleaner route */}
          <Route path="/editor/:proposalNumber" element={
            <QuoteErrorBoundary>
              <QuoteEdit />
            </QuoteErrorBoundary>
          } />

          {/* Incomplete quote editing with dedicated wizard */}
          <Route path="/quotes/edit-incomplete/:proposalNumber" element={
            <QuoteErrorBoundary>
              <QuoteEditIncomplete />
            </QuoteErrorBoundary>
          } />

          {/* Future: Quote templates management */}
          <Route path="/quotes/templates" element={<Navigate to="/settings" replace />} />

          {/* Legacy route redirects for backward compatibility */}
          <Route path="/newquote" element={<Navigate to="/quotes/new" replace />} />
          <Route path="/quoteedit/:proposalNumber" element={<Navigate to="/editor/:proposalNumber" replace />} />
          <Route path="/quotes/edit/:proposalNumber" element={<Navigate to="/editor/:proposalNumber" replace />} />
          <Route path="/quotes/view/:proposalNumber" element={<Navigate to="/editor/:proposalNumber" replace />} />
          
          {/* 404 page */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  </ErrorBoundary>
);