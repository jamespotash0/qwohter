/**
 * Sentry Initialization and Configuration
 *
 * Why: Centralized error tracking and performance monitoring setup.
 * What we track:
 * - Unhandled exceptions and promise rejections
 * - Performance metrics (page loads, API calls)
 * - User context (ID, email, org) for debugging
 * - Release versions for tracking when bugs were introduced
 *
 * What we DON'T track:
 * - Passwords, payment info, API keys
 * - Personal customer data from quotes
 * - Sensitive business information
 */

import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE; // 'development' or 'production'
const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'unknown';

export const initializeSentry = () => {
  // Only initialize in production or if explicitly enabled in dev
  const shouldInitialize =
    ENVIRONMENT === 'production' ||
    import.meta.env.VITE_SENTRY_ENABLED === 'true';

  if (!shouldInitialize || !SENTRY_DSN) {
    console.log('[Sentry] Not initialized:', {
      environment: ENVIRONMENT,
      hasDSN: !!SENTRY_DSN,
      enabled: import.meta.env.VITE_SENTRY_ENABLED
    });
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `qwohter@${APP_VERSION}`,

    // Performance Monitoring
    integrations: [
      // Browser tracing for page loads and navigation
      Sentry.browserTracingIntegration({
        // Trace all fetch/XHR requests
        traceFetch: true,
        traceXHR: true,

        // Track navigation performance
        enableLongTask: true,
        enableInp: true,
      }),

      // Replay user sessions when errors occur (privacy-safe)
      Sentry.replayIntegration({
        // Only record sessions with errors (save bandwidth and privacy)
        maskAllText: true, // Mask all text content for privacy
        blockAllMedia: true, // Block images/videos
        maskAllInputs: true, // Mask form inputs
        networkDetailAllowUrls: [
          // Only capture network details for our own APIs
          window.location.origin,
        ],
      }),
    ],

    // Performance sampling
    // Sample 100% in dev, 10% in production (to reduce quota usage)
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Session replay sampling
    // Capture 10% of normal sessions, 100% of error sessions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter out known noise
    beforeSend(event, hint) {
      // Don't send events in development (unless explicitly enabled)
      if (ENVIRONMENT === 'development' && !import.meta.env.VITE_SENTRY_ENABLED) {
        return null;
      }

      // Filter out browser extension errors (not our code)
      if (event.exception?.values) {
        const exceptionValue = event.exception.values[0];
        const message = exceptionValue?.value || '';

        // Browser extension errors
        if (
          message.includes('chrome-extension://') ||
          message.includes('moz-extension://') ||
          message.includes('safari-extension://')
        ) {
          return null;
        }

        // Ad blocker interference
        if (message.includes('adblock') || message.includes('AdBlock')) {
          return null;
        }
      }

      // Scrub sensitive data from event
      if (event.request?.data) {
        const data = event.request.data as Record<string, any>;

        // Remove sensitive fields
        const sensitiveFields = [
          'password',
          'token',
          'apiKey',
          'api_key',
          'secret',
          'creditCard',
          'credit_card',
          'ssn',
          'stripe_key',
        ];

        sensitiveFields.forEach(field => {
          if (data[field]) {
            data[field] = '[REDACTED]';
          }
        });
      }

      return event;
    },

    // Ignore known third-party errors
    ignoreErrors: [
      // Browser extension errors
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      // Network errors (often user connection issues, not bugs)
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      // Cancelled requests (user navigated away)
      'AbortError',
      'The operation was aborted',
    ],
  });

  console.log('[Sentry] Initialized successfully', {
    environment: ENVIRONMENT,
    release: APP_VERSION,
  });
};

/**
 * Set user context for better error tracking
 * Call this after successful login
 */
export const setSentryUser = (user: {
  id: string;
  email?: string;
  organizationId?: string;
  organizationName?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    // Custom context
    organization_id: user.organizationId,
    organization_name: user.organizationName,
  });
};

/**
 * Clear user context on logout
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Manually capture an exception with context
 */
export const captureException = (
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) => {
  if (context?.tags) {
    Sentry.setTags(context.tags);
  }

  if (context?.extra) {
    Sentry.setContext('additional_info', context.extra);
  }

  Sentry.captureException(error);
};

/**
 * Track a custom event (use sparingly - only for critical business events)
 */
export const trackEvent = (
  eventName: string,
  data?: Record<string, any>
) => {
  Sentry.captureMessage(eventName, {
    level: 'info',
    extra: data,
  });
};
