/**
 * QuickBooks Online Connect Dialog
 *
 * Handles OAuth connection flow for QuickBooks Online
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateOAuthUrl, handleOAuthCallback } from '@/services/quickbooksOnlineService';

interface QBOnlineConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
}

export const QBOnlineConnectDialog: React.FC<QBOnlineConnectDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'quickbooks-oauth-callback') {
        const { code, realmId, error: oauthError } = event.data;

        if (oauthError) {
          setError(`Authentication failed: ${oauthError}`);
          setIsConnecting(false);
          return;
        }

        try {
          await handleOAuthCallback(
            { code, realmId, state: '' },
            organizationId
          );
          onSuccess();
          onClose();
        } catch (err) {
          console.error('OAuth callback handling failed:', err);
          setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
          setIsConnecting(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [organizationId, onSuccess, onClose]);

  // Cleanup OAuth window on dialog close
  useEffect(() => {
    if (!isOpen && oauthWindow && !oauthWindow.closed) {
      oauthWindow.close();
      setOauthWindow(null);
    }
  }, [isOpen, oauthWindow]);

  const handleConnect = () => {
    if (!organizationId) {
      setError('Organization ID is required');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const authUrl = generateOAuthUrl(organizationId);

      // Open OAuth in popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'QuickBooks OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error('Failed to open authentication window. Please allow popups.');
      }

      setOauthWindow(popup);

      // Monitor popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (isConnecting) {
            setIsConnecting(false);
            setError('Authentication window was closed');
          }
        }
      }, 500);
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    if (oauthWindow && !oauthWindow.closed) {
      oauthWindow.close();
    }
    setIsConnecting(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="/integrations/quickbooks-online.svg"
              alt="QuickBooks Online"
              className="w-6 h-6"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            Connect QuickBooks Online
          </DialogTitle>
          <DialogDescription>
            Connect your QuickBooks Online account to create invoices directly from your quotes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              What you'll get:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Create invoices from quotes with one click</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatic customer and item synchronization</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Real-time updates between systems</span>
              </li>
            </ul>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Please complete the authentication in the popup window...
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect QuickBooks
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
