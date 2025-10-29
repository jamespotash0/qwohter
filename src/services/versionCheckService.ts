/**
 * Version Check Service
 *
 * Detects new deployments and forces browser refresh to get latest code.
 * This prevents users from running old JavaScript after a new deployment.
 */

interface VersionInfo {
  version: string;
  buildTime: string;
}

let currentVersion: string | null = null;
let isCheckingVersion = false;

/**
 * Fetch the current deployed version from server
 */
const fetchServerVersion = async (): Promise<VersionInfo | null> => {
  try {
    // Add cache-busting timestamp to ensure we get fresh version.json
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('⚠️ Could not fetch version.json:', response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ Error fetching version:', error);
    return null;
  }
};

/**
 * Initialize version checking
 * Stores the initial version when app loads
 */
export const initializeVersionCheck = async (): Promise<void> => {
  const versionInfo = await fetchServerVersion();
  if (versionInfo) {
    currentVersion = versionInfo.version;
    console.log('✅ Version initialized:', currentVersion);
  }
};

/**
 * Check if a new version is deployed
 * Returns true if version mismatch detected
 */
export const checkForNewVersion = async (): Promise<boolean> => {
  // Prevent concurrent checks
  if (isCheckingVersion) return false;

  try {
    isCheckingVersion = true;

    const versionInfo = await fetchServerVersion();

    if (!versionInfo || !currentVersion) {
      return false;
    }

    // Check if version changed
    if (versionInfo.version !== currentVersion) {
      console.log('🆕 New version detected!', {
        old: currentVersion,
        new: versionInfo.version,
      });
      return true;
    }

    return false;
  } finally {
    isCheckingVersion = false;
  }
};

/**
 * Force reload the page to get new version
 * Clears all caches and reloads from server
 */
export const forceReload = (): void => {
  console.log('🔄 Forcing reload to get new version...');

  // Don't clear localStorage - just do a hard reload
  // Clearing cache can cause subscription/auth glitches
  // The browser will fetch new JS/CSS from server automatically

  // Hard reload from server (bypass browser cache)
  window.location.reload();
};

export const versionCheckService = {
  initializeVersionCheck,
  checkForNewVersion,
  forceReload,
};
