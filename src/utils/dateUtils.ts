/**
 * Date utility functions for consistent timezone handling (EST/EDT)
 */

// Eastern Time zone identifier
const EASTERN_TZ = 'America/New_York';

/**
 * Format a date string to EST/EDT timezone
 * @param dateString - ISO date string from database
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in Eastern Time
 */
export function formatDateEST(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: EASTERN_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format a date string to EST/EDT timezone with time
 * @param dateString - ISO date string from database
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date and time string in Eastern Time
 */
export function formatDateTimeEST(
  dateString: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: EASTERN_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };

  return new Date(dateString).toLocaleString('en-US', defaultOptions);
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 * @param dateString - ISO date string from database
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  // For older dates, show the actual date in EST
  return formatDateEST(dateString);
}

/**
 * Get current timestamp in ISO format (for creating records)
 * @returns ISO timestamp string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Convert a date to EST midnight (useful for date comparisons)
 * @param dateString - ISO date string
 * @returns Date object at midnight EST
 */
export function toESTMidnight(dateString: string): Date {
  const date = new Date(dateString);
  // Convert to EST and set to midnight
  const estDate = new Date(date.toLocaleString('en-US', { timeZone: EASTERN_TZ }));
  estDate.setHours(0, 0, 0, 0);
  return estDate;
}
