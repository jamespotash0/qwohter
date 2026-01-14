/**
 * Google Docs Connect Dialog
 *
 * Handles OAuth connection flow for Google Docs integration.
 * Admin connects once for the whole organization.
 *
 * Design: Warm cream/coral aesthetic matching Auth pages
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle2, AlertCircle, FolderOpen, HelpCircle, X } from 'lucide-react';
import { getGoogleAuthUrl } from '@/services/googleDocsIntegrationService';
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
  const checkClosedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const user = useUser();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (checkClosedIntervalRef.current) {
        clearInterval(checkClosedIntervalRef.current);
      }
    };
  }, []);

  // Listen for OAuth callback result from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'google-oauth-callback') {
        // The callback page already handled the OAuth exchange
        // We just need to react to the success/failure
        const { success, error: oauthError } = event.data;

        // Clear the popup check interval since we got a response
        if (checkClosedIntervalRef.current) {
          clearInterval(checkClosedIntervalRef.current);
          checkClosedIntervalRef.current = null;
        }

        if (oauthError || !success) {
          setError(oauthError || 'Authentication failed');
          setIsConnecting(false);
          return;
        }

        // Success! The callback page already saved the tokens
        setIsConnecting(false);
        onSuccess();
        onClose();
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

      // Clear any existing interval
      if (checkClosedIntervalRef.current) {
        clearInterval(checkClosedIntervalRef.current);
      }

      // Monitor popup closure - close dialog if user closes popup without completing
      checkClosedIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (checkClosedIntervalRef.current) {
            clearInterval(checkClosedIntervalRef.current);
            checkClosedIntervalRef.current = null;
          }
          // Reset state and close dialog when popup is closed
          setIsConnecting(false);
          setOauthWindow(null);
          onClose();
        }
      }, 500);
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    // Clear the popup check interval
    if (checkClosedIntervalRef.current) {
      clearInterval(checkClosedIntervalRef.current);
      checkClosedIntervalRef.current = null;
    }
    // Close the OAuth popup if still open
    if (oauthWindow && !oauthWindow.closed) {
      oauthWindow.close();
    }
    setIsConnecting(false);
    setError(null);
    setOauthWindow(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[520px] p-0 overflow-hidden border-0 shadow-2xl"
        style={{ background: '#FFFEFA' }}
      >
        {/* Header with gradient background */}
        <div
          className="relative px-8 pt-8 pb-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #FFF9F7 0%, #FFE8E3 100%)',
          }}
        >
          {/* Decorative blur orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-[-40px] right-[-60px] w-[180px] h-[180px] rounded-full blur-[60px] opacity-40"
              style={{ background: '#EE6C4D' }}
            />
            <div
              className="absolute bottom-[-30px] left-[-40px] w-[120px] h-[120px] rounded-full blur-[50px] opacity-25"
              style={{ background: '#F7C4BB' }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#171717]/5 transition-colors z-10"
          >
            <X className="w-5 h-5 text-[#171717]/50" />
          </button>

          {/* Google icon */}
          <div className="relative z-10 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center border border-black/5">
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
          </div>

          {/* Title & Description */}
          <div className="relative z-10">
            <h2
              className="text-[24px] text-[#171717] tracking-[-0.01em] leading-tight mb-2"
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
            >
              Connect Google Docs
            </h2>
            <p
              className="text-[#171717]/60 text-sm leading-relaxed"
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 400 }}
            >
              Enable document generation for your entire organization
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-5">
          {/* Folder ID Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="folderId"
                className="text-sm text-[#171717]"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
              >
                Shared Folder ID
              </label>
              <TooltipProvider delayDuration={300} skipDelayDuration={0}>
                <Tooltip disableHoverableContent>
                  <TooltipTrigger
                    type="button"
                    className="inline-flex focus:outline-none"
                    onFocus={(e) => e.preventDefault()}
                  >
                    <HelpCircle className="w-4 h-4 text-[#171717]/30 hover:text-[#171717]/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-[#171717] text-white border-0">
                    <p className="text-sm">The folder ID from your Google Drive URL:</p>
                    <p className="text-xs mt-1.5 font-mono bg-white/10 p-1.5 rounded">
                      drive.google.com/drive/folders/<span className="text-[#EE6C4D]">FOLDER_ID</span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#171717]/30" />
              <Input
                id="folderId"
                placeholder="Paste your folder ID here..."
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="pl-10 h-12 bg-[#f7f2e9]/50 border-[#171717]/10 rounded-xl placeholder:text-[#171717]/30 focus:border-[#EE6C4D] focus:ring-[#EE6C4D]/20"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              />
            </div>
            <p
              className="text-xs text-[#171717]/50"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Documents will be saved here. Share this folder with your team.
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <h4
              className="text-xs uppercase tracking-wider text-[#171717]/40"
              style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
            >
              How it works
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '1', text: 'Connect once for your team' },
                { icon: '2', text: 'Docs saved to your folder' },
                { icon: '3', text: 'Variables auto-replaced' },
                { icon: '4', text: 'Share folder with team' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#f7f2e9]/50"
                >
                  <div
                    className="w-6 h-6 rounded-full bg-[#EE6C4D]/10 flex items-center justify-center flex-shrink-0"
                  >
                    <span
                      className="text-xs text-[#EE6C4D]"
                      style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <span
                    className="text-xs text-[#171717]/70"
                    style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Note */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
            <p
              className="text-xs text-[#065F46] leading-relaxed"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              <strong>Privacy first:</strong> We only access files created by this app and your basic profile. Your other files remain private.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-[#EF4444]/20 bg-[#EF4444]/5 rounded-xl">
              <AlertCircle className="h-4 w-4 text-[#EF4444]" />
              <AlertDescription
                className="text-[#991B1B] text-sm"
                style={{ fontFamily: 'Urbanist, sans-serif' }}
              >
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Connecting State */}
          {isConnecting && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#EE6C4D]/5 border border-[#EE6C4D]/10">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#EE6C4D]"
                    style={{
                      animation: 'pulse-bounce 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </div>
              <p
                className="text-sm text-[#EE6C4D]"
                style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
              >
                Complete authentication in the popup window...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-2 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isConnecting}
            className="flex-1 h-12 border border-[#171717]/10 text-[#171717] hover:bg-[#171717]/5 rounded-full transition-all duration-200 disabled:opacity-50"
            style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex-1 h-12 bg-[#EE6C4D] hover:bg-[#EE6C4D]/90 text-white rounded-full transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            style={{ fontFamily: 'Urbanist, sans-serif', fontWeight: 600 }}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Connect Google
              </>
            )}
          </button>
        </div>

        {/* Animation keyframes */}
        <style>{`
          @keyframes pulse-bounce {
            0%, 80%, 100% {
              transform: scale(0.6);
              opacity: 0.4;
            }
            40% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
