/**
 * Google Docs Connect Dialog
 *
 * Handles OAuth connection flow for Google Docs integration.
 * Admin connects once for the whole organization.
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, FolderOpen, HelpCircle } from 'lucide-react';
import { GoogleLogo } from '@phosphor-icons/react';
import {
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  updateGoogleIntegrationStatus,
} from '@/services/googleDocsIntegrationService';
import { useUser } from '@/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GoogleDocsConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
}

export const GoogleDocsConnectDialog: React.FC<GoogleDocsConnectDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthWindow, setOauthWindow] = useState<Window | null>(null);
  const [folderId, setFolderId] = useState('');
  const user = useUser();

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'google-oauth-callback') {
        const { code, state, error: oauthError } = event.data;

        if (oauthError) {
          setError(`Authentication failed: ${oauthError}`);
          setIsConnecting(false);
          await updateGoogleIntegrationStatus(organizationId, false, oauthError);
          return;
        }

        try {
          const result = await handleGoogleOAuthCallback(code, state);

          if (!result.success) {
            throw new Error(result.error || 'Connection failed');
          }

          // Update integration status
          await updateGoogleIntegrationStatus(organizationId, true);

          onSuccess();
          onClose();
        } catch (err) {
          console.error('OAuth callback handling failed:', err);
          const errorMessage = err instanceof Error ? err.message : 'Connection failed';
          setError(errorMessage);
          await updateGoogleIntegrationStatus(organizationId, false, errorMessage);
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

    if (!user?.id) {
      setError('You must be logged in to connect Google');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Pass folder ID to be stored with the OAuth state
      const authUrl = getGoogleAuthUrl(organizationId, user.id, folderId.trim() || undefined);

      // Open OAuth in popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'Google OAuth',
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
            <GoogleLogo className="w-6 h-6 text-blue-500" weight="bold" />
            Connect Google Docs
          </DialogTitle>
          <DialogDescription>
            Connect your organization's Google account to enable proposal document generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder ID Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="folderId" className="text-sm font-medium">
                Shared Folder ID
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The folder ID from your Google Drive URL. Open the folder in Drive and copy the ID from the URL:</p>
                    <p className="text-xs mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                      drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <FolderOpen className="w-5 h-5 text-gray-400 mt-2.5" />
              <Input
                id="folderId"
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              All generated documents will be saved to this folder. Share this folder with your team in Google Drive.
            </p>
          </div>

          {/* Connection Steps */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              How it works:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>You connect once, entire team can generate docs</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Documents created in your shared folder</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Variables replaced automatically from proposal data</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Share the folder with team members in Google Drive</span>
              </li>
            </ul>
          </div>

          {/* Permissions Note */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <strong>Permissions requested:</strong> We'll only access files created by this app
              and your basic profile info. We cannot see your other Google Drive files.
            </p>
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
            <Alert className="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100">
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
                Connect Google
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
