/**
 * Link Dialog
 *
 * Modal dialog for inserting/editing links in the editor.
 * Gmail-style simple design.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, Trash } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, text?: string) => void;
  onRemove?: () => void;
  initialUrl?: string;
  initialText?: string;
  hasSelection?: boolean;
}

export function LinkDialog({
  isOpen,
  onClose,
  onSubmit,
  onRemove,
  initialUrl = '',
  initialText = '',
  hasSelection = false,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      setText(initialText);
    }
  }, [isOpen, initialUrl, initialText]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (url.trim()) {
        // Ensure URL has protocol
        let finalUrl = url.trim();
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
        }
        onSubmit(finalUrl, hasSelection ? undefined : text);
        onClose();
      }
    },
    [url, text, hasSelection, onSubmit, onClose]
  );

  const handleRemove = useCallback(() => {
    onRemove?.();
    onClose();
  }, [onRemove, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link className="w-4 h-4 text-blue-600" />
            {initialUrl ? 'Edit Link' : 'Insert Link'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!hasSelection && (
            <div className="space-y-2">
              <Label htmlFor="link-text" className="text-sm">
                Text to display
              </Label>
              <Input
                id="link-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Link text"
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="link-url" className="text-sm">
              Web address
            </Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="h-9"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {initialUrl && onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-4 h-4 mr-1.5" />
                Remove
              </Button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!url.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {initialUrl ? 'Update' : 'Apply'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LinkDialog;
