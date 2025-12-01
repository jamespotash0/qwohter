import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MigrationBannerProps {
  onUpgrade: () => void;
  onDismiss: () => void;
  isUpgrading?: boolean;
}

/**
 * Banner component that notifies users about semantic markup migration
 *
 * Displayed when a quote was created before semantic markup was available
 * and can be upgraded to enable live-preview editing features.
 */
export const MigrationBanner: React.FC<MigrationBannerProps> = ({
  onUpgrade,
  onDismiss,
  isUpgrading = false
}) => {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 mb-4 shadow-md rounded-lg relative">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-amber-900 mb-1">
            Upgrade Available: Live-Preview Editing
          </h3>
          <p className="text-sm text-amber-800 mb-3">
            This quote was created before live-preview editing was available.
            Upgrading will enable real-time updates when you change form data.
          </p>
          <div className="bg-amber-100/50 border border-amber-200 rounded-md p-3 mb-3">
            <p className="text-xs text-amber-900 font-medium mb-1">⚠️ Important:</p>
            <p className="text-xs text-amber-800">
              Upgrading will regenerate the template with your current form data.
              Any custom text edits you made will be lost. If you've made custom
              changes, consider saving them separately before upgrading.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={onUpgrade}
              disabled={isUpgrading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
              size="sm"
            >
              {isUpgrading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Upgrading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Upgrade Template
                </>
              )}
            </Button>
            <Button
              onClick={onDismiss}
              variant="outline"
              size="sm"
              className="border-amber-300 hover:bg-amber-50"
            >
              Continue Without Upgrading
            </Button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-amber-600 hover:text-amber-800 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
