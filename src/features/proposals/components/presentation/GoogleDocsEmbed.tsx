/**
 * Google Docs Embed Component
 *
 * Embeds a Google Doc in an iframe with edit/preview modes.
 * Handles loading states, error states, and provides actions.
 */

import { useState, useCallback } from 'react';
import {
  GoogleLogo,
  ArrowSquareOut,
  FilePdf,
  Spinner,
  Warning,
  Link as LinkIcon,
  Eye,
  PencilSimple,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GoogleDocsEmbedProps {
  /** Google Doc ID */
  docId: string;
  /** Whether the user can edit (requires Google sign-in) */
  canEdit?: boolean;
  /** Callback when user requests to generate/regenerate the doc */
  onGenerate?: () => void;
  /** Whether generation is in progress */
  isGenerating?: boolean;
  /** Title for the document */
  title?: string;
  /** Additional class names */
  className?: string;
}

export function GoogleDocsEmbed({
  docId,
  canEdit = false,
  onGenerate,
  isGenerating = false,
  title,
  className,
}: GoogleDocsEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(canEdit ? 'edit' : 'preview');

  // Build the embed URL based on mode
  const embedUrl = viewMode === 'edit'
    ? `https://docs.google.com/document/d/${docId}/edit?embedded=true`
    : `https://docs.google.com/document/d/${docId}/preview`;

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
  }, []);

  // Open in new tab
  const handleOpenInNewTab = useCallback(() => {
    window.open(fullUrl, '_blank');
  }, [fullUrl]);

  // Copy link
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(fullUrl);
  }, [fullUrl]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <GoogleLogo className="w-5 h-5 text-blue-500" weight="bold" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {title || 'Google Docs'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          {canEdit && (
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setViewMode('edit')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
                  viewMode === 'edit'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                )}
              >
                <PencilSimple className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
                  viewMode === 'preview'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
          )}

          {/* Regenerate Button */}
          {onGenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              className="text-xs"
            >
              {isGenerating ? (
                <>
                  <Spinner className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          )}

          {/* Copy Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs"
            title="Copy link"
          >
            <LinkIcon className="w-4 h-4" />
          </Button>

          {/* Open in New Tab */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInNewTab}
            className="text-xs"
            title="Open in Google Docs"
          >
            <ArrowSquareOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
                Unable to load document
              </p>
              <p className="text-sm text-gray-500 mb-4">
                This could be due to permissions or network issues.
              </p>
              <Button onClick={handleOpenInNewTab} variant="outline">
                <ArrowSquareOut className="w-4 h-4 mr-2" />
                Open in Google Docs
              </Button>
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

      {/* Footer with info */}
      {viewMode === 'edit' && !canEdit && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Warning className="w-4 h-4" />
            Sign in with Google to edit this document
          </p>
        </div>
      )}
    </div>
  );
}

export default GoogleDocsEmbed;
