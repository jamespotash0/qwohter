/**
 * Approval Request Dialog
 *
 * Shown when a Member tries to submit a proposal and approval is required.
 * Allows them to add an optional comment before requesting approval.
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface ApprovalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalNumber?: string;
  onConfirm: (comment?: string) => Promise<void>;
}

export function ApprovalRequestDialog({
  open,
  onOpenChange,
  proposalNumber,
  onConfirm,
}: ApprovalRequestDialogProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(comment.trim() || undefined);
      setComment('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComment('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-lg">
              Approval Required
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600">
            {proposalNumber ? (
              <>Submitting <span className="font-medium text-gray-900">{proposalNumber}</span> requires approval from an admin.</>
            ) : (
              <>This action requires approval from an admin before it can be completed.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <Label htmlFor="approval-comment" className="text-sm font-medium text-gray-700">
            Comment <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="approval-comment"
            placeholder="Add a note for the reviewer..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-2 resize-none"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : (
              'Request Approval'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
