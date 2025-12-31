/**
 * Version Dialog Component
 *
 * Asks user whether to overwrite the current document or create a new version.
 * Shown when regenerating a Google Doc that already exists.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowsClockwise, FilePlus, Spinner } from '@phosphor-icons/react';

export type VersionMode = 'create' | 'overwrite';

interface VersionDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when a mode is selected */
  onSelect: (mode: VersionMode) => void;
  /** Current version number */
  currentVersion: number;
  /** Whether the operation is in progress */
  isLoading?: boolean;
}

export function VersionDialog({
  isOpen,
  onClose,
  onSelect,
  currentVersion,
  isLoading = false,
}: VersionDialogProps) {
  const nextVersion = currentVersion + 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Document</DialogTitle>
          <DialogDescription>
            You already have a generated document (v{currentVersion}). How would you like to proceed?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {/* Overwrite Option */}
          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex items-start gap-4 text-left"
            onClick={() => onSelect('overwrite')}
            disabled={isLoading}
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ArrowsClockwise className="w-5 h-5 text-amber-600 dark:text-amber-400" weight="bold" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                Overwrite Current (v{currentVersion})
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Replace the existing document with updated data. The old version will be deleted.
              </p>
            </div>
            {isLoading && <Spinner className="w-5 h-5 animate-spin shrink-0" />}
          </Button>

          {/* New Version Option */}
          <Button
            variant="outline"
            className="h-auto py-4 px-4 flex items-start gap-4 text-left"
            onClick={() => onSelect('create')}
            disabled={isLoading}
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FilePlus className="w-5 h-5 text-blue-600 dark:text-blue-400" weight="bold" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                Create New Version (v{nextVersion})
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Keep the existing document and create a new version with updated data.
              </p>
            </div>
            {isLoading && <Spinner className="w-5 h-5 animate-spin shrink-0" />}
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VersionDialog;
