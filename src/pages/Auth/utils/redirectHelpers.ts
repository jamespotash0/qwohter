/**
 * Redirect Helper Utilities
 * Handles post-authentication redirects
 */

import { NavigateFunction } from 'react-router-dom';

const REDIRECT_URL_KEY = 'auth_redirect_url';
const EXCLUDED_ROUTES = ['/sign-in', '/create-account'];

/**
 * Redirect user after successful authentication
 * Goes to saved URL if exists, otherwise dashboard
 */
export const redirectAfterAuth = (navigate: NavigateFunction) => {
  const savedUrl = localStorage.getItem(REDIRECT_URL_KEY);

  if (savedUrl && !EXCLUDED_ROUTES.includes(savedUrl)) {
    localStorage.removeItem(REDIRECT_URL_KEY);
    navigate(savedUrl);
  } else {
    navigate('/dashboard');
  }
};

/**
 * Save current URL for redirect after auth
 */
export const saveRedirectUrl = (url: string) => {
  if (!EXCLUDED_ROUTES.includes(url)) {
    localStorage.setItem(REDIRECT_URL_KEY, url);
  }
};

/**
 * Clear saved redirect URL
 */
export const clearRedirectUrl = () => {
  localStorage.removeItem(REDIRECT_URL_KEY);
};
