/**
 * Google Docs Settings Dialog
 *
 * Allows users to update Google Docs integration settings like folder ID
 * without needing to disconnect and reconnect.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FolderOpen, HelpCircle, CheckCircle2, Info } from 'lucide-react';
import { GoogleLogo } from '@phosphor-icons/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { invalidateQueries } from '@/lib/queryClient';

interface GoogleDocsSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currentFolderId?: string | null;
  connectedEmail?: string | null;
}

export const GoogleDocsSettingsDialog: React.FC<GoogleDocsSettingsDialogProps> = ({
  isOpen,
  onClose,
  organizationId,
  currentFolderId,
  connectedEmail,
}) => {
  const [folderId, setFolderId] = useState(currentFolderId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFolderId(currentFolderId || '');
      setError(null);
    }
  }, [isOpen, currentFolderId]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('google-update-settings', {
        body: {
          organizationId,
          driveFolderId: folderId.trim() || null,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update settings');
      }

      // Invalidate caches
      await invalidateQueries.connectedIntegrations(organizationId);
      await invalidateQueries.googleConnection(organizationId);

      toast.success('Google Docs settings updated');
      onClose();
    } catch (err) {
      console.error('Failed to update Google settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GoogleLogo className="w-6 h-6 text-blue-500" weight="bold" />
            Google Docs Settings
          </DialogTitle>
          <DialogDescription>
            Update your Google Docs integration settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connected Account Info */}
          {connectedEmail && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Connected as <strong>{connectedEmail}</strong>
              </span>
            </div>
          )}

          {/* Folder ID Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="folderId" className="text-sm font-medium">
                Drive Folder ID
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>The folder ID from your Google Drive URL. Open the folder in Drive and copy the ID from the URL:</p>
                    <p className="text-xs mt-1 font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                      drive.google.com/drive/folders/<strong>FOLDER_ID</strong>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <FolderOpen className="w-5 h-5 text-gray-400 mt-2.5" />
              <Input
                id="folderId"
                placeholder="e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              Leave empty to access all your Google Docs. Set a folder ID to only show templates from that folder.
            </p>
          </div>

          {/* Info about template selection */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              When selecting templates in the form builder, only Google Docs from this folder will be shown.
              Leave empty to browse all your documents.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
