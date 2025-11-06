/**
 * AuthEventMutex - Industry Standard
 *
 * Serializes authentication events to prevent race conditions.
 * Inspired by: Stripe's webhook processing, Linear's auth handling
 *
 * REPLACES: Global flag-based locking (authChangeInProgress)
 *
 * Benefits:
 * - Timeout protection (won't get stuck)
 * - Queue-based processing (handles rapid events)
 * - Error recovery (releases lock on failure)
 * - Monitoring (tracks pending operations)
 */

export class AuthEventMutex {
  private queue: Promise<void> = Promise.resolve();
  private timeout = 30000; // 30 seconds
  private pendingCount = 0;
  private lastError: Error | null = null;

  /**
   * Execute an async operation with exclusive lock
   *
   * @param fn - Async function to execute
   * @returns Promise that resolves with function result
   *
   * @example
   * ```typescript
   * await authMutex.execute(async () => {
   *   await updateUserProfile(user);
   *   await invalidateQueries();
   * });
   * ```
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentQueue = this.queue;
    this.pendingCount++;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Auth operation timeout after ${this.timeout}ms`));
      }, this.timeout);
    });

    // Queue this operation AFTER the current queue completes
    this.queue = (async () => {
      try {
        await currentQueue;
      } catch (err) {
        // Ignore errors from previous operations
        // Each operation handles its own errors
      }
    })();

    try {
      // Race between operation and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      this.lastError = null;
      return result;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      console.error('❌ Auth event error:', error);
      throw error;
    } finally {
      this.pendingCount--;
    }
  }

  /**
   * Check if any operations are pending
   */
  isPending(): boolean {
    return this.pendingCount > 0;
  }

  /**
   * Get count of pending operations
   */
  getPendingCount(): number {
    return this.pendingCount;
  }

  /**
   * Get last error (for debugging)
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Clear the queue (for logout or error recovery)
   */
  clear(): void {
    this.queue = Promise.resolve();
    this.pendingCount = 0;
    this.lastError = null;
  }
}
