/**
 * Router module exports for Qwohter
 * 
 * Provides enhanced routing structure with:
 * - Type-safe navigation hooks
 * - Protected routes with authentication
 * - Lazy loading for performance
 * - SEO-friendly URLs
 */

export { AppRouter } from './AppRouter';
export { ProtectedRoute } from './ProtectedRoute';
export { useNavigation } from './useNavigation';

// Route constants for type safety
export const ROUTES = {
  // Authentication
  AUTH: '/auth',
  LOGIN: '/login',
  SIGNUP: '/signup',

  // Main application
  ROOT: '/',
  DASHBOARD: '/dashboard',
  ANALYTICS: '/analytics',
  TEAM: '/team',
  SETTINGS: '/settings',

  // Proposals (form-builder system)
  PROPOSALS: '/proposals',
  PROPOSAL_EDIT: '/proposals/:proposalId/edit',

  // Forms
  FORMS: '/forms',
} as const;

// Helper functions for route generation
export const generateProposalEditRoute = (proposalId: string) =>
  `/proposals/${encodeURIComponent(proposalId)}/edit`;

// Route type helpers
export type AppRoute = typeof ROUTES[keyof typeof ROUTES];