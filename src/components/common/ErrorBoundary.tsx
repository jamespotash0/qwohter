/**
 * Global Error Boundary
 *
 * Why: Catches unhandled React errors and prevents white screen of death
 * What it does:
 * - Catches component errors during rendering, lifecycle, and constructors
 * - Sends error details to Sentry for debugging
 * - Shows user-friendly fallback UI
 * - Allows user to recover (go back or reload)
 *
 * When to use:
 * - Wrap the entire app (done in App.tsx)
 * - Wrap critical features (quotes editor, PDF viewer, analytics)
 * - DON'T wrap every component (too granular, hard to debug)
 */

import * as Sentry from '@sentry/react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Fallback UI shown when an error is caught
 */
const ErrorFallback = ({
  error,
  // componentStack,
  // eventId,
  resetError,
}: {
  error: unknown;
  componentStack: string;
  eventId: string;
  resetError: () => void;
}) => {
  const isDevelopment = import.meta.env.MODE === 'development';

  // Safely get error message
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Unknown error';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <CardDescription>
                We've been notified and are looking into it
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isDevelopment && (
            <div className="p-3 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Error Details (development only):
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                {errorMessage}
              </p>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Try refreshing the page or going back. If the problem persists, please contact support.
          </p>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            onClick={resetError}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="default"
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

/**
 * Sentry-powered Error Boundary
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourApp />
 * </ErrorBoundary>
 */
export const ErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ErrorFallback,
    showDialog: false, // We show our own UI instead of Sentry's dialog
    beforeCapture: (scope, error, componentStack) => {
      // Add extra context to help debug
      scope.setTag('error_boundary', 'global');
      scope.setContext('component_stack', {
        stack: componentStack,
      });

      // In development, also log to console
      if (import.meta.env.MODE === 'development') {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', componentStack);
      }
    },
  }
);

/**
 * Feature-level Error Boundary
 * Use this for specific features that can fail independently
 *
 * Example:
 * <FeatureErrorBoundary featureName="Quote Editor">
 *   <QuoteEditor />
 * </FeatureErrorBoundary>
 */
export const FeatureErrorBoundary = ({
  children,
  featureName,
}: {
  children: React.ReactNode;
  featureName: string;
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-100">
                {featureName} Error
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                This feature encountered an error. Try refreshing or contact support if it continues.
              </p>
              {import.meta.env.MODE === 'development' && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-mono">
                  {error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                    ? error
                    : 'Unknown error'}
                </p>
              )}
              <Button
                onClick={resetError}
                size="sm"
                variant="outline"
                className="mt-3 border-red-300 dark:border-red-700"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}
      beforeCapture={(scope) => {
        scope.setTag('error_boundary', 'feature');
        scope.setTag('feature_name', featureName);
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
