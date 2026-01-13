/**
 * Google OAuth Callback Page
 *
 * Handles the OAuth redirect from Google after user authorizes.
 * Exchanges the code for tokens and communicates back to the parent window.
 */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { handleGoogleOAuthCallback } from '@/services/googleDocsIntegrationService';

export default function GoogleCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get the authorization code and state from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        // Check for errors from Google
        if (error) {
          const errorDescription = params.get('error_description') || 'Authorization was denied';
          setStatus('error');
          setErrorMessage(errorDescription);

          // Notify parent window
          if (window.opener) {
            window.opener.postMessage(
              { type: 'google-oauth-callback', success: false, error: errorDescription },
              window.location.origin
            );
          }
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          setStatus('error');
          setErrorMessage('Missing authorization code or state');
          return;
        }

        // Exchange code for tokens
        const result = await handleGoogleOAuthCallback(code, state);

        if (result.success) {
          setStatus('success');

          // Notify parent window
          if (window.opener) {
            window.opener.postMessage(
              { type: 'google-oauth-callback', success: true },
              window.location.origin
            );
          }

          // Close the popup after a short delay
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to complete authorization');

          // Notify parent window
          if (window.opener) {
            window.opener.postMessage(
              { type: 'google-oauth-callback', success: false, error: result.error },
              window.location.origin
            );
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');

        // Notify parent window
        if (window.opener) {
          window.opener.postMessage(
            { type: 'google-oauth-callback', success: false, error: 'Unexpected error' },
            window.location.origin
          );
        }
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connecting to Google...
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we complete the authorization.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connected Successfully!
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Your Google account is now connected. This window will close automatically.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connection Failed
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {errorMessage}
            </p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
