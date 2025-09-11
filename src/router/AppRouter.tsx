import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary, QuoteErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "./ProtectedRoute";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load pages for better performance
import { lazy } from "react";

// Authentication pages
const Auth = lazy(() => import("@/pages/Auth"));

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Root redirect to dashboard for authenticated users */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Authentication routes (public) */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />
          
          {/* Main application routes (protected) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Analytics and reporting */}
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />
          
          {/* Team and organization management */}
          <Route path="/team" element={
            <ProtectedRoute>
              <Team />
            </ProtectedRoute>
          } />
          
          {/* Application settings */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Quote management routes (nested structure) */}
          <Route path="/quotes" element={
            <ProtectedRoute>
              <QuotesList />
            </ProtectedRoute>
          } />
          
          {/* Quote creation workflow */}
          <Route path="/quotes/new" element={
            <ProtectedRoute>
              <QuoteErrorBoundary>
                <NewQuote />
              </QuoteErrorBoundary>
            </ProtectedRoute>
          } />
          
          {/* Quote editing by proposal number */}
          <Route path="/quotes/edit/:proposalNumber" element={
            <ProtectedRoute>
              <QuoteErrorBoundary>
                <QuoteEdit />
              </QuoteErrorBoundary>
            </ProtectedRoute>
          } />
          
          {/* Incomplete quote editing with dedicated wizard */}
          <Route path="/quotes/edit-incomplete/:proposalNumber" element={
            <ProtectedRoute>
              <QuoteErrorBoundary>
                <QuoteEditIncomplete />
              </QuoteErrorBoundary>
            </ProtectedRoute>
          } />
          
          {/* Quote viewing (read-only) - for now, use same component as edit */}
          <Route path="/quotes/view/:proposalNumber" element={
            <ProtectedRoute>
              <QuoteErrorBoundary>
                <QuoteEdit />
              </QuoteErrorBoundary>
            </ProtectedRoute>
          } />
          
          {/* Future: Quote templates management */}
          <Route path="/quotes/templates" element={
            <ProtectedRoute>
              <Navigate to="/settings" replace />
            </ProtectedRoute>
          } />
          
          {/* Legacy route redirects for backward compatibility */}
          <Route path="/newquote" element={<Navigate to="/quotes/new" replace />} />
          <Route path="/quoteedit/:proposalNumber" element={
            <Navigate to="/quotes/edit/:proposalNumber" replace />
          } />
          
          {/* 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </ErrorBoundary>
);