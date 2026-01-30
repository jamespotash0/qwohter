/**
 * Environment detection and configuration utilities
 */

// Get the current environment based on build mode
export const getEnvironment = (): 'development' | 'production' => {
  // Check Vite build-time constants first
  if (typeof __PROD__ !== 'undefined' && __PROD__) return 'production';
  if (typeof __DEV__ !== 'undefined' && __DEV__) return 'development';

  // Fallback to NODE_ENV
  const nodeEnv = import.meta.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  return 'development';
};

// Get the appropriate app URL based on current environment
export const getAppUrl = (): string => {
  if (isProduction()) {
    return import.meta.env.VITE_APP_URL_PRODUCTION || 'https://www.qwohter.com';
  }
  // In development, use the actual browser origin so it works on any port
  return window.location.origin;
};

// Get OAuth redirect URI based on environment
export const getOAuthRedirectUri = (provider: 'google' | 'microsoft'): string => {
  const baseUrl = getAppUrl();
  const path = provider === 'google' ? '/auth/google/callback' : '/auth/outlook/callback';
  return `${baseUrl}${path}`;
};

// Environment checks
export const isDevelopment = () => getEnvironment() === 'development';
export const isProduction = () => getEnvironment() === 'production';

// Debug info (only in non-production)
export const getEnvironmentInfo = () => {
  if (isProduction()) return null;
  
  return {
    environment: getEnvironment(),
    appUrl: getAppUrl(),
    nodeEnv: import.meta.env.NODE_ENV,
    mode: import.meta.env.MODE,
    buildConstants: {
      __DEV__: typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined',
      __PROD__: typeof __PROD__ !== 'undefined' ? __PROD__ : 'undefined',
    }
  };
};