/**
 * Version Dialog Component
 *
 * Asks user whether to overwrite the current document or create a new version.
 * Shown when regenerating a Google Doc that already exists.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@phosphor-icons/react';

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
  const [selectedMode, setSelectedMode] = useState<VersionMode | null>(null);

  // Reset selected mode when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMode(null);
    }
  }, [isOpen]);

  const handleSelect = (mode: VersionMode) => {
    setSelectedMode(mode);
    onSelect(mode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Regenerate Document</DialogTitle>
          <DialogDescription>
            Update with latest proposal data?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => handleSelect('overwrite')}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && selectedMode === 'overwrite' ? (
              <Spinner className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Replace v{currentVersion}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSelect('create')}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading && selectedMode === 'create' ? (
              <Spinner className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Create v{nextVersion}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full text-gray-500"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VersionDialog;
