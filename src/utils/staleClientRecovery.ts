/**
 * Stale Client Recovery Utilities (v2 - Safer)
 *
 * Detects and recovers from common stale client issues.
 * These typically occur when:
 * 1. User keeps app open for days without refreshing
 * 2. New deployment changes database schema or API contracts
 * 3. Old JavaScript tries to process new data formats
 *
 * Recovery strategies:
 * - Detect version mismatches
 * - Clear React Query cache (targeted, not all)
 * - Force reload to get fresh code
 * - Log to Sentry for monitoring (only true stale client issues)
 *
 * v2 Changes:
 * - More conservative error patterns (fewer false positives)
 * - Debounced recovery (prevent spam)
 * - Silent Sentry logging (doesn't duplicate normal errors)
 * - Toast instead of confirm() dialog
 */

import * as Sentry from '@sentry/react';
import { QueryClient } from '@tanstack/react-query';
import { checkForNewVersion, forceReload } from '@/services/versionCheckService';
import { toast } from '@/components/ui/sonner';

/**
 * Common error patterns that indicate stale client
 *
 * CONSERVATIVE PATTERNS ONLY - avoid false positives
 *
 * EXCLUDED (too generic):
 * - "permission denied" (normal auth error)
 * - "jwt expired" (normal session expiry)
 * - "token invalid" (normal auth error)
 */
const STALE_CLIENT_ERROR_PATTERNS = [
  // Database schema mismatch errors (high confidence)
  /column.*does.*not.*exist/i,
  /relation.*does.*not.*exist/i,
  /table.*does.*not.*exist/i,

  // Specific organization data errors (high confidence)
  /organization.*not.*found.*in.*query/i,  // More specific than just "not found"
  /invalid.*organization.*schema/i,
  /unexpected.*organization.*structure/i,

  // TypeScript/parsing errors (indicate code mismatch)
  /cannot.*read.*propert.*of.*undefined.*organization/i,
  /cannot.*access.*.*before.*initialization/i,

  // API contract mismatch (high confidence)
  /unexpected.*response.*format/i,
  /api.*version.*mismatch/i,

  // Module/chunk loading errors (high confidence - indicates stale client)
  /failed.*to.*fetch.*dynamically.*imported.*module/i,
  /expected.*javascript.*module.*but.*server.*responded.*with.*mime.*type/i,
  /loading.*chunk.*\d+.*failed/i,
];

/**
 * Debounce tracker to prevent recovery spam
 */
let lastRecoveryAttempt = 0;
const RECOVERY_DEBOUNCE_MS = 30 * 1000; // 30 seconds

/**
 * Check if an error indicates a stale client issue
 */
export function isStaleClientError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error
    ? error.message
    : String(error);

  // Check against conservative patterns
  const matches = STALE_CLIENT_ERROR_PATTERNS.some(pattern =>
    pattern.test(errorMessage)
  );

  if (matches) {
    console.log('🔍 Stale client error pattern matched:', errorMessage);
  }

  return matches;
}

/**
 * Attempt to recover from stale client error
 *
 * Steps:
 * 1. Check debounce (prevent spam)
 * 2. Check if new version is available
 * 3. If yes, show user-friendly toast (not confirm dialog)
 * 4. Clear targeted cache as fallback (not all queries)
 * 5. Log to Sentry for monitoring (only once per debounce period)
 *
 * @param error - The error that triggered recovery
 * @param queryClient - React Query client instance
 */
export async function attemptStaleClientRecovery(
  error: unknown,
  queryClient?: QueryClient
): Promise<boolean> {
  // Debounce: Don't spam recovery attempts
  const now = Date.now();
  if (now - lastRecoveryAttempt < RECOVERY_DEBOUNCE_MS) {
    console.log('⏸️ Recovery debounced (too soon after last attempt)');
    return false;
  }
  lastRecoveryAttempt = now;

  const errorMessage = error instanceof Error ? error.message : String(error);

  console.warn('🔄 Attempting stale client recovery for error:', errorMessage);

  // Log to Sentry (only once per debounce period to avoid spam)
  Sentry.captureException(error, {
    tags: {
      recovery_type: 'stale_client',
      recovery_triggered: 'auto',
    },
    level: 'warning',
    extra: {
      error_message: errorMessage,
    },
  });

  try {
    // Check if new version is available
    const hasNewVersion = await checkForNewVersion();

    if (hasNewVersion) {
      console.log('✅ New version detected - prompting user to reload');

      // Show user-friendly toast (not blocking confirm dialog)
      toast.error('Data Error Detected', {
        description: 'A new version is available that may fix this issue. Click to reload.',
        duration: 60000, // 1 minute (long duration)
        action: {
          label: 'Reload Now',
          onClick: () => {
            forceReload();
          },
        },
      });

      return true;
    }

    // Fallback: Clear TARGETED cache (not all queries)
    if (queryClient) {
      console.log('🗑️ Clearing organization-related cache as fallback');

      // Only invalidate organization queries (not everything)
      await queryClient.invalidateQueries({
        queryKey: ['organization'],
      });

      // Don't refetch immediately - let components refetch on mount
      // await queryClient.refetchQueries(); // ← Removed aggressive refetch

      return true;
    }

    return false;
  } catch (recoveryError) {
    console.error('❌ Recovery attempt failed:', recoveryError);
    Sentry.captureException(recoveryError, {
      tags: {
        recovery_type: 'stale_client',
        recovery_status: 'failed',
      },
      level: 'error',
    });
    return false;
  }
}

/**
 * Enhanced error handler with automatic stale client recovery
 *
 * IMPORTANT: Does NOT log all errors to Sentry
 * Only logs stale client errors (conservative patterns)
 *
 * Usage in React Query error handlers:
 * ```ts
 * onError: (error) => {
 *   handleErrorWithRecovery(error, queryClient);
 * }
 * ```
 */
export async function handleErrorWithRecovery(
  error: unknown,
  queryClient?: QueryClient
): Promise<void> {
  // Check if this looks like a stale client error
  if (isStaleClientError(error)) {
    console.warn('⚠️ Stale client error detected - attempting recovery');
    await attemptStaleClientRecovery(error, queryClient);
  }
  // NOTE: Do NOT log regular errors here
  // Let individual queries/mutations handle their own error logging
  // This prevents duplicate Sentry logs and noise
}

/**
 * Create a React Query error handler with automatic recovery
 *
 * Usage:
 * ```ts
 * const queryClient = new QueryClient({
 *   queryCache: new QueryCache({
 *     onError: createRecoveryErrorHandler(queryClient),
 *   }),
 * });
 * ```
 */
export function createRecoveryErrorHandler(queryClient: QueryClient) {
  return async (error: unknown) => {
    await handleErrorWithRecovery(error, queryClient);
  };
}
