/**
 * ConfirmDeleteDialog Component
 *
 * A double-confirmation dialog that requires typing "delete" to confirm.
 * Prevents accidental deletions of important items.
 */

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Warning } from '@phosphor-icons/react';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  confirmText?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  confirmText = 'delete',
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const isConfirmEnabled = inputValue.toLowerCase() === confirmText.toLowerCase();

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Warning className="h-5 w-5 text-red-600" weight="fill" />
            </div>
            <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-gray-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          {itemName && (
            <p className="mb-3 text-sm text-gray-500">
              You are about to delete: <span className="font-medium text-gray-900">{itemName}</span>
            </p>
          )}
          <p className="mb-2 text-sm text-gray-600">
            Type <span className="font-mono font-semibold text-red-600">{confirmText}</span> to confirm:
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Type "${confirmText}" to confirm`}
            className="font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isConfirmEnabled) {
                handleConfirm();
              }
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
