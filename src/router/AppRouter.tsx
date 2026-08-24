import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { MainLayout } from "@/components/common/layout/MainLayout";
import { ScrollToTop } from "@/components/common/ScrollToTop";
import { Canonical } from "@/components/common/Canonical";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useUser, useAuthStatus } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
// DISABLED FOR PRODUCTION TESTING
// import { AdaFloatingWidget } from "@/components/features/ada";

import React from "react";

// Auth-aware Ada wrapper - DISABLED FOR PRODUCTION TESTING
// const AdaWithAuthCheck: React.FC = () => {
//   const user = useUser();
//   const location = useLocation();
//
//   // List of paths where Ada should NOT appear (public/auth pages)
//   const publicPaths = [
//     '/sign-in',
//     '/create-account',
//     '/forgot-password',
//     '/reset-password',
//     '/access-denied',
//     '/account-inactive',
//     '/invalid-invitation',
//     '/auth',
//     '/login',
//     '/signup',
//     '/',
//     '/demo',
//     '/contact-us',
//     '/privacy-policy',
//     '/privacy-notice',
//     '/terms-of-service',
//     '/faq',
//     '/legal',
//     '/cookie-settings',
//     '/accessibility-statement',
//     '/do-not-sell-my-personal-information',
//     '/404',
//   ];
//
//   // Check if current path is a public page or starts with /sign (signing page)
//   const isPublicPage = publicPaths.includes(location.pathname) ||
//     location.pathname.startsWith('/sign/');
//
//   // Don't render Ada on public pages or when not authenticated
//   if (!user || isPublicPage) {
//     return null;
//   }
//
//   return <AdaFloatingWidget />;
// };

// Protected auth route wrapper - redirects to dashboard if already logged in AND completed onboarding
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  // ✅ v3.0.0: Use new auth hooks
  const user = useUser();
  const { isInitialized } = useAuthStatus();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);

  // Check if URL has invite token - if so, let Auth.tsx handle the loading state
  const hasInviteToken = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return !!(urlParams.get('invite') || urlParams.get('appinvite'));
  }, []);

  // IMPORTANT: Check if user has completed onboarding OR is super admin (BEFORE any early returns!)
  // Hooks must always be called in the same order - move this BEFORE the loading check
  React.useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setHasCompletedOnboarding(null);
        setIsSuperAdmin(false);
        return;
      }

      try {
        // First check if user is a super admin - they bypass organization requirement
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .maybeSingle() as { data: { is_super_admin: boolean } | null; error: unknown };

        if (profile?.is_super_admin) {
          setIsSuperAdmin(true);
          setHasCompletedOnboarding(true);
          return;
        }

        // Otherwise check for active membership
        const { data: membership } = await supabase
          .from('memberships')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'Active')
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
  // Skip this spinner if there's an invite token - Auth.tsx shows its own "Validating invitation..." spinner
  if (!isInitialized && !hasInviteToken) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--content-button-primary-bg)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in AND has completed onboarding, redirect appropriately
  if (user && hasCompletedOnboarding) {
    // Super admins go to admin panel, regular users go to dashboard
    return <Navigate to={isSuperAdmin ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
};

// Public pages
const Landing = lazy(() => import("@/pages/LandingPage"));
const Demo = lazy(() => import("@/pages/Demo"));
const ContactUs = lazy(() => import("@/pages/ContactUs"));

// Legal pages (public)
const PrivacyPolicy = lazy(() => import("@/pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/legal/TermsOfService"));
const FAQ = lazy(() => import("@/pages/legal/FAQ"));
const Legal = lazy(() => import("@/pages/legal/Legal"));
const CookieSettings = lazy(() => import("@/pages/legal/CookieSettings"));
const AccessibilityStatement = lazy(() => import("@/pages/legal/AccessibilityStatement"));
const DoNotSell = lazy(() => import("@/pages/legal/DoNotSell"));
const ProposalSigningPage = lazy(() => import("@/pages/ProposalSigningPage"));

// Authentication pages - import eagerly to prevent loading spinner flash
// Auth is needed immediately on login/signup and handles its own loading states
import Auth from "@/pages/Auth";
import InvalidInvitation from "@/pages/InvalidInvitation";
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const AccessDenied = lazy(() => import("@/pages/AccessDenied"));
const AccountInactive = lazy(() => import("@/pages/AccountInactive"));
const GoogleCallback = lazy(() => import("@/pages/Auth/GoogleCallback"));

// Main application pages - import eagerly to prevent navigation flicker
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
const NotFound = lazy(() => import("@/pages/NotFound"));

// Proposals pages (NEW - form-builder system)
const Proposals = lazy(() => import("@/pages/Proposals"));

// Form Builder pages
const Forms = lazy(() => import("@/pages/Forms"));
const FormBuilderV4 = lazy(() => import("@/pages/FormBuilderV4"));

// Document Template pages - DEPRECATED: moved to _deprecated, using Presentations now

// Proposal Filler (NEW V4 - filler mode)
const ProposalFiller = lazy(() => import("@/pages/ProposalFiller"));

// Board pages
const Board = lazy(() => import("@/pages/Board"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const TaskBoard = lazy(() => import("@/pages/TaskBoard"));

// Contacts page
const Contacts = lazy(() => import("@/pages/Contacts"));

// Back office: purchase order acknowledgment variance
const VarianceQueue = lazy(() => import("@/pages/VarianceQueue"));
const SalesOrders = lazy(() => import("@/pages/SalesOrders"));
const SalesOrderDetail = lazy(() => import("@/pages/SalesOrderDetail"));

// Calendar page
const Calendar = lazy(() => import("@/pages/Calendar"));

// Notifications centre
const Notifications = lazy(() => import("@/pages/Notifications"));

// Admin pages - Product Catalog Management
const AdminLayout = lazy(() => import("@/features/admin/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("@/features/admin/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminInvitePage = lazy(() => import("@/features/admin/pages/AdminInvitePage").then(m => ({ default: m.AdminInvitePage })));

// Products page - HIDDEN for now
// const Products = lazy(() => import("@/pages/Products"));

// Dev preview pages (only in development)
const ErrorBoundaryPreview = lazy(() => import("@/pages/dev/ErrorBoundaryPreview"));

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
 * - Error boundaries for proposal-related operations
 * - SEO-friendly URLs that match business logic
 */
export const AppRouter = () => (
  <ErrorBoundary>
    <BrowserRouter>
      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Keep <link rel="canonical"> in sync with the route */}
      <Canonical />

      {/* Ada - Global AI Assistant (DISABLED FOR PRODUCTION TESTING) */}
      {/* <AdaWithAuthCheck /> */}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing page (public) */}
          <Route path="/" element={<Landing />} />

          {/* Demo contact page (public) */}
          <Route path="/demo" element={<Demo />} />

          {/* Contact us page (public) */}
          <Route path="/contact-us" element={<ContactUs />} />

          {/* Legal pages (public) */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/privacy-notice" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/cookie-settings" element={<CookieSettings />} />
          <Route path="/accessibility-statement" element={<AccessibilityStatement />} />
          <Route path="/do-not-sell-my-personal-information" element={<DoNotSell />} />

          {/* E-signature signing page (public - accessed via token) */}
          <Route path="/sign/:token" element={<ProposalSigningPage />} />

          {/* Dev preview pages (only accessible in development) */}
          {import.meta.env.DEV && (
            <Route path="/dev/error-test" element={<ErrorBoundaryPreview />} />
          )}

          {/* 404 page - outside MainLayout for full screen */}
          <Route path="/404" element={<NotFound />} />

          {/* Authentication routes - redirect to dashboard if already logged in */}
          <Route path="/sign-in" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/create-account" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          {/* NOT wrapped in AuthRoute: a recovery link establishes a session, and AuthRoute
              would redirect the (already-onboarded) user to /dashboard before they can set a
              new password. This page manages its own recovery session. */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/account-inactive" element={<AccountInactive />} />
          <Route path="/invalid-invitation" element={<InvalidInvitation />} />

          {/* OAuth callback routes */}
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Legacy redirects */}
          <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          {/* Public signup is disabled - redirect to sign-in */}
          <Route path="/signup" element={<Navigate to="/sign-in" replace />} />

          {/* Proposal Builder V4 - Full screen Apple-level design */}
          <Route path="/proposals/builder" element={<FormBuilderV4 />} />
          <Route path="/proposals/builder/:id" element={<FormBuilderV4 />} />

          {/* Document Template Editor - DEPRECATED: now using Presentations tab */}

          {/* Proposal Filler - NEW V4 filler mode for entering proposal data */}
          <Route path="/proposals/:proposalId/edit" element={<ProposalFiller />} />

          {/* Admin Panel - Product Catalog Management (full-screen with own layout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="appinvite" element={<AdminInvitePage />} />
          </Route>

          {/* Main application routes (protected by MainLayout with sidebar) */}
          <Route path="*" element={
            <MainLayout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />

          {/* Board workflow */}
          <Route path="/project-board" element={<Board />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/task-board" element={<TaskBoard />} />

          {/* Contacts CRM */}
          <Route path="/contacts" element={<Contacts />} />

          {/* Back office: acknowledgment variance queue */}
          <Route path="/acknowledgments" element={<VarianceQueue />} />
          <Route path="/orders" element={<SalesOrders />} />
          <Route path="/orders/:orderId" element={<SalesOrderDetail />} />

          {/* Calendar */}
          <Route path="/calendar" element={<Calendar />} />

          {/* Products catalog - HIDDEN for now */}
          {/* <Route path="/products" element={<Products />} /> */}

                {/* Analytics and reporting */}
                <Route path="/analytics" element={<Analytics />} />

                {/* Notifications - "View all" target from the top bar bell */}
                <Route path="/notifications" element={<Notifications />} />

                {/* Application settings */}
                <Route path="/settings" element={<Settings />} />

                {/* Team redirect - now part of settings */}
                <Route path="/team" element={<Navigate to="/settings?tab=team" replace />} />

                {/* Proposals - NEW form-builder based system */}
                <Route path="/proposals" element={<Proposals />} />

                <Route path="/forms" element={<Forms />} />
                <Route path="/forms/library" element={<Forms />} />

                {/* Catch-all redirects to full-screen 404 */}
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </MainLayout>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
);