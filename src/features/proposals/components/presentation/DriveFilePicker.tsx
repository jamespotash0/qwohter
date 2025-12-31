/**
 * Drive File Picker
 *
 * Searchable dropdown for selecting Google Docs from the connected Drive folder.
 * Used in the template picker to select templates without manually entering URLs.
 */

import { useState, useCallback, useEffect } from 'react';
import { Check, ChevronsUpDown, FileText, Loader2, Search, FolderOpen, ExternalLink } from 'lucide-react';
import { GoogleLogo } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDriveFiles, type DriveFile } from '@/hooks/queries/useDriveFiles';
import { useDebounce } from '@/hooks/useDebounce';

interface DriveFilePickerProps {
  organizationId: string | undefined;
  value?: string; // Selected file ID
  onSelect: (file: DriveFile) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Filter to only show files with [TEMPLATE] prefix */
  templateOnly?: boolean;
  /** Filter to exclude files with [TEMPLATE] prefix (for linking existing docs) */
  excludeTemplates?: boolean;
  /** Show hint about naming convention */
  showNamingHint?: boolean;
}

export function DriveFilePicker({
  organizationId,
  value,
  onSelect,
  placeholder = 'Search for a Google Doc...',
  disabled = false,
  className,
  templateOnly = false,
  excludeTemplates = false,
  showNamingHint = false,
}: DriveFilePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build search query - prepend [TEMPLATE] filter if templateOnly is true
  const effectiveSearch = templateOnly
    ? `[TEMPLATE] ${debouncedSearch}`.trim()
    : debouncedSearch;

  // Fetch files from Drive
  const { data, isLoading, error } = useDriveFiles({
    organizationId,
    searchQuery: effectiveSearch,
    enabled: open && !!organizationId,
  });

  // Filter out templates if excludeTemplates is true (client-side filter)
  const allFiles = data?.files || [];
  const files = excludeTemplates
    ? allFiles.filter(f => !f.name.startsWith('[TEMPLATE]'))
    : allFiles;
  const folderId = data?.folderId;

  // Find selected file name
  const selectedFile = files.find(f => f.id === value);

  const handleSelect = useCallback((file: DriveFile) => {
    onSelect(file);
    setOpen(false);
    setSearchQuery('');
  }, [onSelect]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="truncate">{selectedFile?.name || 'Selected document'}</span>
              </>
            ) : (
              <>
                <GoogleLogo className="h-4 w-4 flex-shrink-0" weight="bold" />
                <span>{placeholder}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>
        </div>

        {/* Folder indicator */}
        {folderId && (
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>
                {templateOnly
                  ? 'Searching for [TEMPLATE] files'
                  : excludeTemplates
                    ? 'Showing proposal documents (excluding templates)'
                    : 'Searching in connected folder'}
              </span>
            </div>
          </div>
        )}

        {/* File list */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading documents...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-500">Failed to load documents</p>
              <p className="text-xs text-gray-400 mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          ) : files.length === 0 ? (
            <div className="p-6 text-center">
              <GoogleLogo className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600" weight="bold" />
              <p className="text-sm text-gray-500 mt-2">
                {searchQuery
                  ? 'No documents found'
                  : templateOnly
                    ? 'No templates found'
                    : excludeTemplates
                      ? 'No proposal documents found'
                      : 'No Google Docs in this folder'}
              </p>
              {templateOnly ? (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-left">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                    Template Naming Convention
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Name your template files with <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded">[TEMPLATE]</code> prefix in Google Drive:
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 italic">
                    e.g., "[TEMPLATE] Formal Proposal"
                  </p>
                </div>
              ) : excludeTemplates ? (
                <p className="text-xs text-gray-400 mt-1">
                  Generate a proposal document first, or check your folder
                </p>
              ) : !folderId && (
                <p className="text-xs text-gray-400 mt-1">
                  Connect a specific folder in Settings for better organization
                </p>
              )}
            </div>
          ) : (
            <div className="py-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelect(file)}
                  className={cn(
                    'w-full px-3 py-2 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left',
                    value === file.id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <FileText className={cn(
                      'h-4 w-4',
                      value === file.id ? 'text-blue-600' : 'text-gray-400'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-medium truncate',
                        value === file.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                      )}>
                        {file.name}
                      </span>
                      {value === file.id && (
                        <Check className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Modified {formatDate(file.modifiedTime)}
                    </p>
                  </div>
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Open in Google Docs"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </a>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with manual entry option */}
        {!isLoading && files.length > 0 && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {files.length} document{files.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default DriveFilePicker;
