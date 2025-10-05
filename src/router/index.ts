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
  
  // Quotes (nested structure)
  QUOTES: '/quotes',
  QUOTES_NEW: '/quotes/new',
  QUOTES_EDIT: '/quotes/edit',
  QUOTES_VIEW: '/quotes/view',
  QUOTES_TEMPLATES: '/quotes/templates',
  
  // Legacy redirects
  // LEGACY_NEW_QUOTE: '/newquote',
  // LEGACY_QUOTE_EDIT: '/quoteedit',
} as const;

// Helper functions for route generation
export const generateQuoteEditRoute = (proposalNumber: string) => 
  `${ROUTES.QUOTES_EDIT}/${encodeURIComponent(proposalNumber)}`;

export const generateQuoteViewRoute = (proposalNumber: string) => 
  `${ROUTES.QUOTES_VIEW}/${encodeURIComponent(proposalNumber)}`;

// Route type helpers
export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
export type QuoteRoute = typeof ROUTES.QUOTES | typeof ROUTES.QUOTES_NEW | string; // string for dynamic quote routes