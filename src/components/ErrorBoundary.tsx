import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * ErrorBoundary - Critical production safety component
 * Prevents white screen of death and provides graceful error recovery
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state to show error UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI - Clean and simple, no error details shown to users
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                  <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Something Went Wrong</CardTitle>
              <CardDescription className="text-base mt-2">
                We encountered an unexpected error. Please try again or return to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * QuoteErrorBoundary - Specialized error boundary for quote-related components
 * Provides domain-specific error handling and recovery
 */
export const QuoteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleQuoteError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Quote Error:', error, errorInfo);
    // TODO: Track quote-specific errors for analytics
  };

  return (
    <ErrorBoundary
      onError={handleQuoteError}
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
                  <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Quote Error</CardTitle>
              <CardDescription className="text-base mt-2">
                There was an issue loading your quote. Your data has been saved automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/quotes'}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  All Quotes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};