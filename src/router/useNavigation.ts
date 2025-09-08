import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Enhanced navigation hook for Wall Quote Wizard
 * 
 * Provides type-safe navigation methods for all application routes
 * with additional context and error handling.
 */
export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Core navigation methods
  const goToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const goToQuotes = useCallback(() => {
    navigate('/quotes');
  }, [navigate]);

  const goToAnalytics = useCallback(() => {
    navigate('/analytics');
  }, [navigate]);

  const goToTeam = useCallback(() => {
    navigate('/team');
  }, [navigate]);

  const goToSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  // Quote-specific navigation
  const createNewQuote = useCallback(() => {
    navigate('/quotes/new');
  }, [navigate]);

  const editQuote = useCallback((proposalNumber: string) => {
    if (!proposalNumber) {
      console.error('Proposal number is required for quote editing');
      return;
    }
    navigate(`/quotes/edit/${encodeURIComponent(proposalNumber)}`);
  }, [navigate]);

  const viewQuote = useCallback((proposalNumber: string) => {
    if (!proposalNumber) {
      console.error('Proposal number is required for quote viewing');
      return;
    }
    navigate(`/quotes/view/${encodeURIComponent(proposalNumber)}`);
  }, [navigate]);

  // Utility navigation methods
  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  const replaceCurrent = useCallback((path: string) => {
    navigate(path, { replace: true });
  }, [navigate]);

  // Authentication navigation
  const goToAuth = useCallback((returnTo?: string) => {
    const state = returnTo ? { from: { pathname: returnTo } } : undefined;
    navigate('/auth', { state });
  }, [navigate]);

  const returnToIntendedDestination = useCallback(() => {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }, [navigate, location.state]);

  // Route information helpers
  const isCurrentRoute = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isQuoteRoute = useCallback(() => {
    return location.pathname.startsWith('/quotes');
  }, [location.pathname]);

  const getCurrentQuoteProposalNumber = useCallback((): string | null => {
    const match = location.pathname.match(/\/quotes\/(?:edit|view)\/(.+)/);
    return match ? decodeURIComponent(match[1] as any) : null;
  }, [location.pathname]);

  const isEditMode = useCallback(() => {
    return location.pathname.includes('/quotes/edit/');
  }, [location.pathname]);

  const isViewMode = useCallback(() => {
    return location.pathname.includes('/quotes/view/');
  }, [location.pathname]);

  // Breadcrumb helper
  const getBreadcrumbs = useCallback(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    const breadcrumbs = [
      { label: 'Dashboard', path: '/dashboard' }
    ];

    if (segments[0] === 'quotes') {
      breadcrumbs.push({ label: 'Quotes', path: '/quotes' });
      
      if (segments[1] === 'new') {
        breadcrumbs.push({ label: 'New Quote', path: '/quotes/new' });
      } else if (segments[1] === 'edit' && segments[2]) {
        breadcrumbs.push({ 
          label: `Edit Quote ${decodeURIComponent(segments[2])}`, 
          path: `/quotes/edit/${segments[2]}` 
        });
      } else if (segments[1] === 'view' && segments[2]) {
        breadcrumbs.push({ 
          label: `View Quote ${decodeURIComponent(segments[2])}`, 
          path: `/quotes/view/${segments[2]}` 
        });
      }
    } else if (segments[0] === 'analytics') {
      breadcrumbs.push({ label: 'Analytics', path: '/analytics' });
    } else if (segments[0] === 'team') {
      breadcrumbs.push({ label: 'Team', path: '/team' });
    } else if (segments[0] === 'settings') {
      breadcrumbs.push({ label: 'Settings', path: '/settings' });
    }

    return breadcrumbs;
  }, [location.pathname]);

  return {
    // Core navigation
    goToDashboard,
    goToQuotes,
    goToAnalytics,
    goToTeam,
    goToSettings,
    
    // Quote navigation
    createNewQuote,
    editQuote,
    viewQuote,
    
    // Utility navigation
    goBack,
    goForward,
    replaceCurrent,
    
    // Authentication
    goToAuth,
    returnToIntendedDestination,
    
    // Route information
    isCurrentRoute,
    isQuoteRoute,
    getCurrentQuoteProposalNumber,
    isEditMode,
    isViewMode,
    getBreadcrumbs,
    
    // Current location info
    currentPath: location.pathname,
    currentSearch: location.search,
    currentHash: location.hash,
  };
};