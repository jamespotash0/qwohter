/**
 * Page Settings Dialog
 *
 * Modal dialog for configuring page layout settings:
 * - Page size (Letter, A4, Legal)
 * - Orientation (Portrait, Landscape)
 * - Margins (Top, Bottom, Left, Right)
 */

import { useState, useEffect, useCallback } from 'react';
import { FileText, ArrowsOutLineVertical, ArrowsOutLineHorizontal } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Page size presets (in inches)
export const PAGE_SIZES = {
  letter: { name: 'US Letter', width: 8.5, height: 11 },
  a4: { name: 'A4', width: 8.27, height: 11.69 },
  legal: { name: 'US Legal', width: 8.5, height: 14 },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;
export type PageOrientation = 'portrait' | 'landscape';

export interface PageSettings {
  pageSize: PageSizeKey;
  orientation: PageOrientation;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  pageSize: 'letter',
  orientation: 'portrait',
  margins: {
    top: 1,
    bottom: 1,
    left: 1,
    right: 1,
  },
};

interface PageSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PageSettings;
  onSave: (settings: PageSettings) => void;
}

export function PageSettingsDialog({
  isOpen,
  onClose,
  settings,
  onSave,
}: PageSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<PageSettings>(settings);

  // Reset to provided settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  const handlePageSizeChange = useCallback((size: PageSizeKey) => {
    setLocalSettings(prev => ({ ...prev, pageSize: size }));
  }, []);

  const handleOrientationChange = useCallback((orientation: PageOrientation) => {
    setLocalSettings(prev => ({ ...prev, orientation }));
  }, []);

  const handleMarginChange = useCallback((side: keyof PageSettings['margins'], value: string) => {
    const numValue = parseFloat(value) || 0;
    // Clamp between 0 and 3 inches
    const clampedValue = Math.max(0, Math.min(3, numValue));
    setLocalSettings(prev => ({
      ...prev,
      margins: { ...prev.margins, [side]: clampedValue },
    }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localSettings);
    onClose();
  }, [localSettings, onSave, onClose]);

  const handleReset = useCallback(() => {
    setLocalSettings(DEFAULT_PAGE_SETTINGS);
  }, []);

  // Calculate preview dimensions
  const previewScale = 0.15; // Scale for preview
  const sizeConfig = PAGE_SIZES[localSettings.pageSize];
  const isLandscape = localSettings.orientation === 'landscape';
  const pageWidth = isLandscape ? sizeConfig.height : sizeConfig.width;
  const pageHeight = isLandscape ? sizeConfig.width : sizeConfig.height;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Page Settings
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Left Column - Settings */}
          <div className="space-y-5">
            {/* Page Size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Page Size</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(PAGE_SIZES) as PageSizeKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePageSizeChange(key)}
                    className={cn(
                      'px-3 py-2 text-xs rounded-md border transition-colors',
                      localSettings.pageSize === key
                        ? 'bg-coral text-white border-coral'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-coral'
                    )}
                  >
                    {PAGE_SIZES[key].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Orientation</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOrientationChange('portrait')}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors',
                    localSettings.orientation === 'portrait'
                      ? 'bg-coral text-white border-coral'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-coral'
                  )}
                >
                  <ArrowsOutLineVertical className="w-4 h-4" />
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => handleOrientationChange('landscape')}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border transition-colors',
                    localSettings.orientation === 'landscape'
                      ? 'bg-coral text-white border-coral'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-coral'
                  )}
                >
                  <ArrowsOutLineHorizontal className="w-4 h-4" />
                  Landscape
                </button>
              </div>
            </div>

            {/* Margins */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Margins (inches)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Top</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="3"
                    value={localSettings.margins.top}
                    onChange={(e) => handleMarginChange('top', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Bottom</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="3"
                    value={localSettings.margins.bottom}
                    onChange={(e) => handleMarginChange('bottom', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Left</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="3"
                    value={localSettings.margins.left}
                    onChange={(e) => handleMarginChange('left', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Right</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    max="3"
                    value={localSettings.margins.right}
                    onChange={(e) => handleMarginChange('right', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col items-center justify-center">
            <Label className="text-xs text-gray-500 mb-2">Preview</Label>
            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex items-center justify-center">
              {/* Page Preview */}
              <div
                className="bg-white dark:bg-gray-900 shadow-md border border-gray-300 dark:border-gray-600 relative"
                style={{
                  width: `${pageWidth * 96 * previewScale}px`,
                  height: `${pageHeight * 96 * previewScale}px`,
                }}
              >
                {/* Margin indicators */}
                <div
                  className="absolute border border-dashed border-blue-300 dark:border-blue-700"
                  style={{
                    top: `${localSettings.margins.top * 96 * previewScale}px`,
                    left: `${localSettings.margins.left * 96 * previewScale}px`,
                    right: `${localSettings.margins.right * 96 * previewScale}px`,
                    bottom: `${localSettings.margins.bottom * 96 * previewScale}px`,
                  }}
                />
                {/* Content area indicator */}
                <div
                  className="absolute bg-gray-100 dark:bg-gray-800 opacity-50"
                  style={{
                    top: `${localSettings.margins.top * 96 * previewScale}px`,
                    left: `${localSettings.margins.left * 96 * previewScale}px`,
                    right: `${localSettings.margins.right * 96 * previewScale}px`,
                    bottom: `${localSettings.margins.bottom * 96 * previewScale}px`,
                  }}
                >
                  {/* Fake text lines */}
                  <div className="p-1 space-y-0.5">
                    <div className="h-0.5 bg-gray-300 dark:bg-gray-600 w-3/4" />
                    <div className="h-0.5 bg-gray-300 dark:bg-gray-600 w-full" />
                    <div className="h-0.5 bg-gray-300 dark:bg-gray-600 w-5/6" />
                    <div className="h-0.5 bg-gray-300 dark:bg-gray-600 w-full" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {PAGE_SIZES[localSettings.pageSize].name} • {pageWidth}" × {pageHeight}"
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-gray-500"
          >
            Reset to Default
          </Button>
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
              type="button"
              size="sm"
              onClick={handleSave}
              className="bg-coral hover:bg-coral/90"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PageSettingsDialog;
