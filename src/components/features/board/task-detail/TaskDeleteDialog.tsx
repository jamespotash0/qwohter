/**
 * TaskDeleteDialog Component
 *
 * A refined delete confirmation dialog for tasks.
 * Requires typing "delete" to confirm (Jira-style) since deletion
 * cascades to comments, attachments, and other associated data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Trash, X } from '@phosphor-icons/react';

interface TaskDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  taskTitle: string;
  taskReference?: string;
  isLoading?: boolean;
}

const CONFIRM_TEXT = 'delete';

export function TaskDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  taskTitle,
  taskReference,
  isLoading = false,
}: TaskDeleteDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isConfirmEnabled = inputValue.toLowerCase() === CONFIRM_TEXT;

  // Handle open state with animation
  useEffect(() => {
    if (open) {
      setInputValue('');
      requestAnimationFrame(() => {
        setIsVisible(true);
        // Focus input after animation starts
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsAnimatingOut(false);
      setInputValue('');
      onOpenChange(false);
    }, 150);
  }, [isLoading, onOpenChange]);

  const handleConfirm = useCallback(() => {
    if (isLoading || !isConfirmEnabled) return;
    onConfirm();
  }, [isLoading, isConfirmEnabled, onConfirm]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isLoading) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, isLoading, handleClose]);

  if (!open && !isAnimatingOut) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]',
          'transition-opacity duration-150',
          isVisible && !isAnimatingOut ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        className={cn(
          'fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2',
          'w-[380px] max-w-[90vw]',
          'bg-white rounded-xl shadow-2xl overflow-hidden',
          'transition-all duration-150 ease-out',
          isVisible && !isAnimatingOut
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isLoading}
          className={cn(
            'absolute top-3 right-3 p-1.5 rounded-md',
            'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
            'transition-colors duration-100',
            'focus:outline-none focus:ring-2 focus:ring-gray-200',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-5 pt-4">
          {/* Title */}
          <div className="mb-4">
            <h2
              id="delete-dialog-title"
              className="text-base font-semibold text-gray-900"
            >
              Delete task?
            </h2>
            <p
              id="delete-dialog-description"
              className="text-[13px] text-gray-500 mt-1"
            >
              This will permanently delete the task and all associated comments and attachments.
            </p>
          </div>

          {/* Task being deleted */}
          <p className="text-[13px] text-center mb-4">
            {taskReference && (
              <>
                <span className="font-semibold text-gray-900">{taskReference}</span>
                <span className="text-gray-400 mx-1.5">:</span>
              </>
            )}
            <span className="font-semibold text-gray-900">{taskTitle}</span>
          </p>

          {/* Confirmation Input */}
          <div className="mb-4">
            <label className="block text-[13px] text-gray-600 mb-2">
              Type{' '}
              <span className="font-mono font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                {CONFIRM_TEXT}
              </span>{' '}
              to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmEnabled) {
                  handleConfirm();
                }
              }}
              placeholder={CONFIRM_TEXT}
              disabled={isLoading}
              className={cn(
                'w-full h-10 px-3 rounded-lg',
                'text-sm font-mono',
                'border border-gray-200',
                'bg-white',
                'placeholder:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300',
                'transition-all duration-100',
                isConfirmEnabled && 'border-green-300 ring-2 ring-green-100',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className={cn(
                'flex-1 h-10 px-4 rounded-lg',
                'text-sm font-medium text-gray-700',
                'bg-gray-100 hover:bg-gray-200',
                'transition-colors duration-100',
                'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !isConfirmEnabled}
              className={cn(
                'flex-1 h-10 px-4 rounded-lg',
                'text-sm font-medium text-white',
                'transition-all duration-100',
                'focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1',
                'flex items-center justify-center gap-1.5',
                isConfirmEnabled
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gray-300 cursor-not-allowed',
                isLoading && 'bg-red-400 cursor-wait'
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4" weight="bold" />
                  <span>Delete Task</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
