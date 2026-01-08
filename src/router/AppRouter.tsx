import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/common/layout/MainLayout";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { useUser, useAuthStatus } from "@/auth";
import { supabase } from "@/integrations/supabase/client";

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
const ProposalSigningPage = lazy(() => import("@/pages/ProposalSigningPage"));

// Authentication pages
const Auth = lazy(() => import("@/pages/Auth"));
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
const TaskBoard = lazy(() => import("@/pages/TaskBoard"));

// Contacts page
const Contacts = lazy(() => import("@/pages/Contacts"));

// Admin pages - Product Catalog Management
const AdminLayout = lazy(() => import("@/features/admin/components/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("@/features/admin/pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const DomainsPage = lazy(() => import("@/features/admin/pages/DomainsPage").then(m => ({ default: m.DomainsPage })));
const ManufacturersPage = lazy(() => import("@/features/admin/pages/ManufacturersPage").then(m => ({ default: m.ManufacturersPage })));
const ProductLinesPage = lazy(() => import("@/features/admin/pages/ProductLinesPage").then(m => ({ default: m.ProductLinesPage })));
const SeriesPage = lazy(() => import("@/features/admin/pages/SeriesPage").then(m => ({ default: m.SeriesPage })));
const ModelsPage = lazy(() => import("@/features/admin/pages/ModelsPage").then(m => ({ default: m.ModelsPage })));
const VariantsPage = lazy(() => import("@/features/admin/pages/VariantsPage").then(m => ({ default: m.VariantsPage })));
const OptionGroupsPage = lazy(() => import("@/features/admin/pages/OptionGroupsPage").then(m => ({ default: m.OptionGroupsPage })));
const OptionValuesPage = lazy(() => import("@/features/admin/pages/OptionValuesPage").then(m => ({ default: m.OptionValuesPage })));
const ModelOptionsPage = lazy(() => import("@/features/admin/pages/ModelOptionsPage").then(m => ({ default: m.ModelOptionsPage })));
const ModelAllowedValuesPage = lazy(() => import("@/features/admin/pages/ModelAllowedValuesPage").then(m => ({ default: m.ModelAllowedValuesPage })));
const RulesPage = lazy(() => import("@/features/admin/pages/RulesPage").then(m => ({ default: m.RulesPage })));

// Products page - HIDDEN for now
// const Products = lazy(() => import("@/pages/Products"));

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing page (public) */}
          <Route path="/" element={<Landing />} />

          {/* Demo contact page (public) */}
          <Route path="/demo" element={<Demo />} />

          {/* Contact us page (public) */}
          <Route path="/contact-us" element={<ContactUs />} />

          {/* E-signature signing page (public - accessed via token) */}
          <Route path="/sign/:token" element={<ProposalSigningPage />} />

          {/* Authentication routes - redirect to dashboard if already logged in */}
          <Route path="/sign-in" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/create-account" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          <Route path="/reset-password" element={<AuthRoute><ResetPassword /></AuthRoute>} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/account-inactive" element={<AccountInactive />} />

          {/* OAuth callback routes */}
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Legacy redirects */}
          <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/signup" element={<Navigate to="/create-account" replace />} />

          {/* Proposal Builder V4 - Full screen Apple-level design */}
          <Route path="/proposals/builder" element={<FormBuilderV4 />} />
          <Route path="/proposals/builder/:id" element={<FormBuilderV4 />} />

          {/* Document Template Editor - DEPRECATED: now using Presentations tab */}

          {/* Proposal Filler - NEW V4 filler mode for entering proposal data */}
          <Route path="/proposals/:proposalId/edit" element={<ProposalFiller />} />

          {/* Admin Panel - Product Catalog Management (full-screen with own layout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products/domains" element={<DomainsPage />} />
            <Route path="products/manufacturers" element={<ManufacturersPage />} />
            <Route path="products/lines" element={<ProductLinesPage />} />
            <Route path="products/series" element={<SeriesPage />} />
            <Route path="products/models" element={<ModelsPage />} />
            <Route path="products/variants" element={<VariantsPage />} />
            <Route path="options/groups" element={<OptionGroupsPage />} />
            <Route path="options/values" element={<OptionValuesPage />} />
            <Route path="config/model-options" element={<ModelOptionsPage />} />
            <Route path="config/allowed-values" element={<ModelAllowedValuesPage />} />
            <Route path="config/rules" element={<RulesPage />} />
          </Route>

          {/* Main application routes (protected by MainLayout with sidebar) */}
          <Route path="*" element={
            <MainLayout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />

          {/* Board workflow */}
          <Route path="/board" element={<Board />} />
          <Route path="/task-board" element={<TaskBoard />} />

          {/* Contacts CRM */}
          <Route path="/contacts" element={<Contacts />} />

          {/* Products catalog - HIDDEN for now */}
          {/* <Route path="/products" element={<Products />} /> */}

                {/* Analytics and reporting */}
                <Route path="/analytics" element={<Analytics />} />

                {/* Application settings */}
                <Route path="/settings" element={<Settings />} />

                {/* Team redirect - now part of settings */}
                <Route path="/team" element={<Navigate to="/settings?tab=team" replace />} />

                {/* Proposals - NEW form-builder based system */}
                <Route path="/proposals" element={<Proposals />} />

                <Route path="/forms" element={<Forms />} />
                <Route path="/forms/library" element={<Forms />} />

                {/* 404 page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
);