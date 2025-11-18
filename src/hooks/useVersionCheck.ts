/**
 * Version Check Hook
 *
 * Periodically checks for new deployments and prompts user to refresh.
 * Prevents "stale client" issues where users run old JavaScript after deployments.
 *
 * Usage: Add to App.tsx or MainLayout.tsx
 *
 * How it works:
 * 1. Checks for new version every 5 minutes (configurable)
 * 2. Shows toast notification when new version detected
 * 3. User can click to reload and get latest code
 * 4. Auto-reload after 30 seconds if user doesn't respond
 *
 * Why this matters:
 * - Prevents users from experiencing errors due to schema/API changes
 * - Ensures users always run the latest code
 * - Gracefully handles the transition with user notification
 */

import { useEffect, useRef, useState } from 'react';
import { checkForNewVersion, forceReload } from '@/services/versionCheckService';
import { toast } from 'sonner';

interface UseVersionCheckOptions {
  /** How often to check for updates (in milliseconds). Default: 5 minutes */
  checkInterval?: number;
  /** Auto-reload after this many seconds if user doesn't respond. Default: 30s */
  autoReloadDelay?: number;
  /** Enable version checking. Default: true */
  enabled?: boolean;
}

export function useVersionCheck(options: UseVersionCheckOptions = {}) {
  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
    autoReloadDelay = 30, // 30 seconds
    enabled = true,
  } = options;

  const [hasNewVersion, setHasNewVersion] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const autoReloadTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Check for new version and notify user
   */
  const checkVersion = async () => {
    try {
      const isNewVersion = await checkForNewVersion();

      if (isNewVersion && !hasNewVersion) {
        setHasNewVersion(true);
        showUpdateNotification();
      }
    } catch (error) {
      console.warn('⚠️ Version check failed:', error);
    }
  };

  /**
   * Check if user is likely active (typing, has focused inputs)
   * Prevents auto-reload during user activity
   */
  const isUserActive = (): boolean => {
    // Check if any input is focused (user might be typing)
    const activeElement = document.activeElement;
    if (
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.hasAttribute('contenteditable')
    ) {
      return true;
    }

    // Check for unsaved forms (forms with dirty state)
    // This is a heuristic - forms with data but not submitted
    const forms = document.querySelectorAll('form');
    for (const form of Array.from(forms)) {
      const inputs = form.querySelectorAll('input, textarea, select');
      for (const input of Array.from(inputs)) {
        if ((input as HTMLInputElement).value) {
          return true; // Form has data, user might be working
        }
      }
    }

    return false;
  };

  /**
   * Show update notification with action buttons
   */
  const showUpdateNotification = () => {
    // Clear any existing auto-reload timeout
    if (autoReloadTimeoutRef.current) {
      clearTimeout(autoReloadTimeoutRef.current);
    }

    // Show persistent toast with action
    toast.info('New version available!', {
      description: `A new version has been deployed. Reload to get the latest features and fixes. (Auto-reload in ${autoReloadDelay}s unless you're working)`,
      duration: Infinity, // Don't auto-dismiss (user needs to act or wait)
      action: {
        label: 'Reload Now',
        onClick: () => {
          forceReload();
        },
      },
    });

    // Smart auto-reload: Only if user is NOT active
    autoReloadTimeoutRef.current = setTimeout(() => {
      if (isUserActive()) {
        console.log('⏸️ Auto-reload delayed - user is active (typing/editing)');
        // Show reminder toast and try again in 2 minutes
        toast.warning('Update Waiting', {
          description: 'A new version is available. Please save your work and reload when ready.',
          duration: 10000,
          action: {
            label: 'Reload Now',
            onClick: () => forceReload(),
          },
        });

        // Try again in 2 minutes
        autoReloadTimeoutRef.current = setTimeout(() => {
          if (!isUserActive()) {
            console.log('🔄 Auto-reloading after delay (user now inactive)');
            forceReload();
          } else {
            console.log('⏸️ Auto-reload skipped - user still active');
          }
        }, 2 * 60 * 1000);
      } else {
        console.log('🔄 Auto-reloading to get new version...');
        forceReload();
      }
    }, autoReloadDelay * 1000);
  };

  /**
   * Start periodic version checking
   */
  useEffect(() => {
    if (!enabled) return;

    // Initial check after 30 seconds (give app time to load)
    const initialCheckTimeout = setTimeout(() => {
      checkVersion();
    }, 30 * 1000);

    // Periodic checks
    checkIntervalRef.current = setInterval(() => {
      checkVersion();
    }, checkInterval);

    // Cleanup
    return () => {
      clearTimeout(initialCheckTimeout);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (autoReloadTimeoutRef.current) {
        clearTimeout(autoReloadTimeoutRef.current);
      }
    };
  }, [enabled, checkInterval]);

  return {
    hasNewVersion,
    checkVersion,
    reloadNow: forceReload,
  };
}
