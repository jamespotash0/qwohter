/**
 * Async Utilities for Race Condition Prevention
 *
 * These utilities will be integrated into the InitializationService
 * when we implement the full centralization refactor (v2.0.0).
 *
 * For now, they provide tactical fixes for critical race conditions.
 */

/**
 * Creates an AbortController that can be used in React useEffect cleanup
 *
 * Usage:
 * ```tsx
 * useEffect(() => {
 *   const controller = createAbortController();
 *
 *   fetchData({ signal: controller.signal }).catch(err => {
 *     if (!controller.signal.aborted) {
 *       console.error(err);
 *     }
 *   });
 *
 *   return () => controller.abort();
 * }, []);
 * ```
 */
export const createAbortController = () => {
  return new AbortController();
};

/**
 * Checks if an error is an abort error (safe to ignore)
 */
export const isAbortError = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

/**
 * Request versioning system to prevent stale updates
 * Ensures only the most recent request's response updates state
 *
 * Will be integrated into CacheManager in v2.0.0 refactor
 */
export class RequestVersionManager {
  private currentVersion = 0;
  private resourceVersions = new Map<string, number>();

  /**
   * Increment and get the next version for a resource
   */
  nextVersion(resourceKey: string = 'default'): number {
    const next = (this.resourceVersions.get(resourceKey) || 0) + 1;
    this.resourceVersions.set(resourceKey, next);
    return next;
  }

  /**
   * Check if this version is still current (safe to apply)
   */
  isCurrent(version: number, resourceKey: string = 'default'): boolean {
    return version === this.resourceVersions.get(resourceKey);
  }

  /**
   * Reset all versions (useful on logout or major state changes)
   */
  reset(): void {
    this.resourceVersions.clear();
  }
}

/**
 * Debounce utility for preventing rapid repeated calls
 *
 * Usage:
 * ```tsx
 * const debouncedRefetch = debounce(refetchMembers, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * In-flight request tracker to prevent duplicate concurrent requests
 *
 * Will be integrated into InitializationService in v2.0.0
 */
export class InFlightRequestManager {
  private requests = new Map<string, Promise<any>>();

  /**
   * Execute a request only if it's not already in-flight
   * If already in-flight, return the existing promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // If already in-flight, return existing promise
    if (this.requests.has(key)) {
      return this.requests.get(key)!;
    }

    // Start new request
    const promise = requestFn();
    this.requests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after completion
      this.requests.delete(key);
    }
  }

  /**
   * Check if a request is currently in-flight
   */
  isInFlight(key: string): boolean {
    return this.requests.has(key);
  }

  /**
   * Clear all in-flight requests (useful on logout)
   */
  clear(): void {
    this.requests.clear();
  }
}

/**
 * Timestamp-based operation tracker to prevent stale updates
 * Ensures updates are applied in chronological order
 */
export class OperationTimestampManager {
  private lastUpdateTime = new Map<string, number>();

  /**
   * Check if this operation is newer than the last applied operation
   */
  isNewer(resourceKey: string, operationTime: number): boolean {
    const lastTime = this.lastUpdateTime.get(resourceKey) || 0;
    return operationTime > lastTime;
  }

  /**
   * Record an operation as applied
   */
  recordOperation(resourceKey: string, operationTime: number = Date.now()): void {
    this.lastUpdateTime.set(resourceKey, operationTime);
  }

  /**
   * Reset all timestamps (useful on logout)
   */
  reset(): void {
    this.lastUpdateTime.clear();
  }
}
