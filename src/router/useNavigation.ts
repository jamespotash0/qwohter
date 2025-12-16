import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Enhanced navigation hook for Qwohter
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

  const goToProposals = useCallback(() => {
    navigate('/proposals');
  }, [navigate]);

  const goToAnalytics = useCallback(() => {
    navigate('/analytics');
  }, [navigate]);

  const goToSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  const goToForms = useCallback(() => {
    navigate('/forms');
  }, [navigate]);

  // Proposal-specific navigation
  const editProposal = useCallback((proposalId: string) => {
    if (!proposalId) {
      console.error('Proposal ID is required for proposal editing');
      return;
    }
    navigate(`/proposals/${encodeURIComponent(proposalId)}/edit`);
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
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
    navigate(from, { replace: true });
  }, [navigate, location.state]);

  // Route information helpers
  const isCurrentRoute = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isProposalRoute = useCallback(() => {
    return location.pathname.startsWith('/proposals');
  }, [location.pathname]);

  const getCurrentProposalId = useCallback((): string | null => {
    const match = location.pathname.match(/\/proposals\/(.+?)\/edit/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [location.pathname]);

  const isEditMode = useCallback(() => {
    return location.pathname.includes('/edit');
  }, [location.pathname]);

  // Breadcrumb helper
  const getBreadcrumbs = useCallback(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);

    const breadcrumbs = [
      { label: 'Dashboard', path: '/dashboard' }
    ];

    if (segments[0] === 'proposals') {
      breadcrumbs.push({ label: 'Proposals', path: '/proposals' });

      if (segments[1] && segments[2] === 'edit') {
        breadcrumbs.push({
          label: `Edit Proposal`,
          path: `/proposals/${segments[1]}/edit`
        });
      }
    } else if (segments[0] === 'analytics') {
      breadcrumbs.push({ label: 'Analytics', path: '/analytics' });
    } else if (segments[0] === 'settings') {
      breadcrumbs.push({ label: 'Settings', path: '/settings' });
    } else if (segments[0] === 'forms') {
      breadcrumbs.push({ label: 'Forms', path: '/forms' });
    }

    return breadcrumbs;
  }, [location.pathname]);

  return {
    // Core navigation
    goToDashboard,
    goToProposals,
    goToAnalytics,
    goToSettings,
    goToForms,

    // Proposal navigation
    editProposal,

    // Utility navigation
    goBack,
    goForward,
    replaceCurrent,

    // Authentication
    goToAuth,
    returnToIntendedDestination,

    // Route information
    isCurrentRoute,
    isProposalRoute,
    getCurrentProposalId,
    isEditMode,
    getBreadcrumbs,

    // Current location info
    currentPath: location.pathname,
    currentSearch: location.search,
    currentHash: location.hash,
  };
};
