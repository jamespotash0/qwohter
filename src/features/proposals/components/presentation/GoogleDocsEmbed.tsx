/**
 * Google Docs Embed Component
 *
 * Embeds a Google Doc in an iframe with edit/preview modes.
 * Handles loading states, error states, and provides actions.
 */

import { useState, useCallback } from 'react';
import {
  ArrowSquareOut,
  Spinner,
  Warning,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GoogleDocsEmbedProps {
  /** Google Doc ID */
  docId: string;
  /** Whether the user can edit (requires Google sign-in) */
  canEdit?: boolean;
  /** Whether generation is in progress (shows loading overlay) */
  isGenerating?: boolean;
  /** Title for the document (used in iframe title attribute) */
  title?: string;
  /** Additional class names */
  className?: string;
  /** Callback when document can't be loaded (deleted, no access, etc.) */
  onDocumentError?: () => void;
  /** Callback to unlink the document */
  onUnlink?: () => void;
}

export function GoogleDocsEmbed({
  docId,
  canEdit = false,
  isGenerating = false,
  title,
  className,
  onDocumentError,
  onUnlink,
}: GoogleDocsEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Build the embed URL - use edit mode for better experience
  const embedUrl = `https://docs.google.com/document/d/${docId}/edit?embedded=true`;

  // Full URL for opening in new tab
  const fullUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handle iframe error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onDocumentError?.();
  }, [onDocumentError]);

  // Open in new tab
  const handleOpenInNewTab = useCallback(() => {
    window.open(fullUrl, '_blank');
  }, [fullUrl]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Embed Container */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-10">
            <div className="text-center">
              <Spinner className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-500">Loading Google Doc...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-10">
            <div className="text-center max-w-md p-6">
              <Warning className="w-12 h-12 mx-auto mb-3 text-amber-500" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                Document Not Available
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This document may have been deleted, moved, or you no longer have access.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ArrowSquareOut className="w-4 h-4 mr-2" />
                  Try Opening
                </Button>
                {onUnlink && (
                  <Button onClick={onUnlink} variant="destructive">
                    Unlink Document
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* The Iframe - This is where the magic happens */}
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          title={title || 'Google Doc'}
          // Security attributes
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          // Allow fullscreen
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default GoogleDocsEmbed;
