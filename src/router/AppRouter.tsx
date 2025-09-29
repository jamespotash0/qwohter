import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary, QuoteErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "./ProtectedRoute";
import { MainLayout } from "@/components/common/layout/MainLayout";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages for better performance
import { lazy } from "react";

// Public pages
const Landing = lazy(() => import("@/pages/Landing"));
const DemoContact = lazy(() => import("@/pages/DemoContact"));

// Authentication pages
const Auth = lazy(() => import("@/pages/Auth"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const PendingApproval = lazy(() => import("@/pages/PendingApproval"));
const AccessDenied = lazy(() => import("@/pages/AccessDenied"));

// Main application pages
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Team = lazy(() => import("@/pages/Team"));
const Settings = lazy(() => import("@/pages/Settings"));
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
 * Enhanced routing structure for Wall Quote Wizard
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

          {/* Authentication routes (public) */}
          <Route path="/sign-in" element={<Auth />} />
          <Route path="/create-account" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Legacy redirects */}
          <Route path="/auth" element={<Navigate to="/sign-in" replace />} />
          <Route path="/login" element={<Navigate to="/sign-in" replace />} />
          <Route path="/signup" element={<Navigate to="/create-account" replace />} />
          
          {/* Main application routes (protected by MainLayout) */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Analytics and reporting */}
          <Route path="/analytics" element={<Analytics />} />

          {/* Team and organization management (requires Admin or Owner role) */}
          <Route path="/team" element={
            <ProtectedRoute requiresRole="Admin">
              <Team />
            </ProtectedRoute>
          } />

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

          {/* Quote editing by proposal number */}
          <Route path="/quotes/edit/:proposalNumber" element={
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

          {/* Quote viewing (read-only) - for now, use same component as edit */}
          <Route path="/quotes/view/:proposalNumber" element={
            <QuoteErrorBoundary>
              <QuoteEdit />
            </QuoteErrorBoundary>
          } />

          {/* Future: Quote templates management */}
          <Route path="/quotes/templates" element={<Navigate to="/settings" replace />} />
          
          {/* Legacy route redirects for backward compatibility */}
          <Route path="/newquote" element={<Navigate to="/quotes/new" replace />} />
          <Route path="/quoteedit/:proposalNumber" element={
            <Navigate to="/quotes/edit/:proposalNumber" replace />
          } />
          
          {/* 404 page */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  </ErrorBoundary>
);