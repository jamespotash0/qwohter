import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary, QuoteErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/common/layout/MainLayout";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useUser, useAuthStatus } from "@/auth";
import { supabase } from "@/integrations/supabase/client";

// Lazy load pages for better performance
import React from "react";

// Protected auth route wrapper - redirects to dashboard if already logged in AND completed onboarding
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  // ✅ v3.0.0: Use new auth hooks
  const user = useUser();
  const { isInitialized } = useAuthStatus();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState<boolean | null>(null);

  // IMPORTANT: Check if user has completed onboarding (BEFORE any early returns!)
  // Hooks must always be called in the same order - move this BEFORE the loading check
  React.useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setHasCompletedOnboarding(null);
        return;
      }

      try {
        const { data: membership } = await supabase
          .from('memberships')
          .select('id, status') //membership_status
          .eq('user_id', user.id)
          .eq('status', 'Active') //membership_status
          .maybeSingle();

        setHasCompletedOnboarding(!!membership);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setHasCompletedOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user]);

  // Show loading spinner while auth is initializing (prevents flash of sign-in page)
  if (!isInitialized) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--content-button-primary-bg)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in AND has completed onboarding, redirect to dashboard
  if (user && hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public pages
const Landing = lazy(() => import("@/pages/LandingPage"));
const Demo = lazy(() => import("@/pages/Demo"));
const ContactUs = lazy(() => import("@/pages/ContactUs"));

// Authentication pages
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AccessDenied = lazy(() => import("@/pages/AccessDenied"));
const AccountInactive = lazy(() => import("@/pages/AccountInactive"));

// Main application pages - import eagerly to prevent navigation flicker
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
const NotFound = lazy(() => import("@/pages/NotFound"));

// Quote-related pages (grouped under quotes namespace)
const QuotesList = lazy(() => import("@/pages/Quotes"));
const NewQuote = lazy(() => import("@/pages/NewQuote"));
const QuoteEdit = lazy(() => import("@/pages/QuoteEdit"));
const QuoteEditIncomplete = lazy(() => import("@/pages/QuoteEditIncomplete"));

// Form Builder pages - DISABLED until form builder is complete
// const Forms = lazy(() => import("@/pages/Forms"));
// const FormBuilderV2 = lazy(() => import("@/pages/FormBuilderV2"));

// Board pages
const Board = lazy(() => import("@/pages/Board"));
const TaskBoard = lazy(() => import("@/pages/TaskBoard"));

// Contacts page
const Contacts = lazy(() => import("@/pages/Contacts"));

// Products page
const Products = lazy(() => import("@/pages/Products"));

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
          <Route path="/demo" element={<Demo />} />

          {/* Contact us page (public) */}
          <Route path="/contact-us" element={<ContactUs />} />

          {/* Authentication routes - redirect to dashboard if already logged in */}
          <Route path="/sign-in" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/create-account" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          <Route path="/reset-password" element={<AuthRoute><ResetPassword /></AuthRoute>} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/account-inactive" element={<AccountInactive />} />

          {/* Legacy redirects */}
          <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/signup" element={<Navigate to="/create-account" replace />} />

          {/* Main application routes (protected by MainLayout) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Board workflow */}
          <Route path="/board" element={<Board />} />
          <Route path="/task-board" element={<TaskBoard />} />

          {/* Contacts CRM */}
          <Route path="/contacts" element={<Contacts />} />

          {/* Products catalog */}
          <Route path="/products" element={<Products />} />

          {/* Analytics and reporting */}
          <Route path="/analytics" element={<Analytics />} />

          {/* Application settings */}
          <Route path="/settings" element={<Settings />} />

          {/* Team redirect - now part of settings */}
          <Route path="/team" element={<Navigate to="/settings?tab=team" replace />} />

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

          {/* Form Builder routes - DISABLED until form builder is complete */}
          {/* <Route path="/forms" element={<Forms />} /> */}
          {/* <Route path="/forms/builder/:id" element={<FormBuilderV2 />} /> */}
          <Route path="/forms" element={<Navigate to="/dashboard" replace />} />
          <Route path="/forms/*" element={<Navigate to="/dashboard" replace />} />

          {/* Templates routes - DISABLED until template system is complete */}
          <Route path="/templates" element={<Navigate to="/dashboard" replace />} />
          <Route path="/templates/*" element={<Navigate to="/dashboard" replace />} />

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