import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a date string to a Date object, handling timezone correctly.
 *
 * When passing a date-only string like "2025-11-25" to new Date(),
 * JavaScript interprets it as midnight UTC, which can show as the
 * previous day in timezones behind UTC (like US timezones).
 *
 * This function appends T00:00:00 to force local timezone interpretation.
 *
 * @param dateString - Date string in YYYY-MM-DD format or full ISO string
 * @returns Date object in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  // If it's a date-only string (YYYY-MM-DD), append time to force local interpretation
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + 'T00:00:00');
  }
  // Otherwise, parse as-is (full ISO string or timestamp)
  return new Date(dateString);
}

/**
 * Convert a local time string (HH:MM) to UTC time string (HH:MM:SS).
 * Used when saving reminder times - user enters local time, we store UTC.
 *
 * @param localTime - Time in HH:MM format (e.g., "09:00")
 * @returns Time in HH:MM:SS format in UTC (e.g., "14:00:00" if user is in EDT)
 */
export function localTimeToUTC(localTime: string): string {
  // Create a date object with today's date and the local time
  const [hours, minutes] = localTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours as any, minutes, 0, 0);

  // Get UTC hours and minutes
  const utcHours = date.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = date.getUTCMinutes().toString().padStart(2, '0');

  return `${utcHours}:${utcMinutes}:00`;
}

/**
 * Convert a UTC time string (HH:MM:SS or HH:MM) to local time string (HH:MM).
 * Used when displaying reminder times - we store UTC, user sees local time.
 *
 * @param utcTime - Time in HH:MM:SS or HH:MM format in UTC
 * @returns Time in HH:MM format in user's local timezone
 */
export function utcTimeToLocal(utcTime: string): string {
  // Parse the UTC time
  const timePart = utcTime.substring(0, 5); // Get HH:MM
  const [hours, minutes] = timePart.split(':').map(Number);

  // Create a UTC date and convert to local
  const date = new Date();
  date.setUTCHours(hours as any, minutes, 0, 0);

  // Get local hours and minutes
  const localHours = date.getHours().toString().padStart(2, '0');
  const localMinutes = date.getMinutes().toString().padStart(2, '0');

  return `${localHours}:${localMinutes}`;
}

/**
 * Smart date formatter - handles both YYYY-MM-DD and full ISO timestamps.
 * Uses parseLocalDate internally to avoid timezone issues with date-only strings.
 *
 * @param dateString - Date string (YYYY-MM-DD or ISO timestamp)
 * @param options - Intl.DateTimeFormat options (defaults to 'MMM d, yyyy' style)
 * @returns Formatted date string in user's locale
 */
export function formatDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!dateString) return '';
  try {
    const date = parseLocalDate(dateString);
    // Use toLocaleString if time options are present, otherwise toLocaleDateString
    const hasTimeOptions = 'hour' in options || 'minute' in options || 'second' in options;
    return hasTimeOptions
      ? date.toLocaleString('en-US', options)
      : date.toLocaleDateString('en-US', options);
  } catch {
    return dateString;
  }
}

// Aliases for backwards compatibility
export const formatLocalDate = formatDate;
export const formatTimestamp = formatDate;

/**
 * Get the user's current timezone name (e.g., "America/New_York", "Europe/London")
 * @returns IANA timezone string
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the user's timezone abbreviation (e.g., "EST", "PST", "GMT")
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(): string {
  return new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
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

  // For older dates, show the actual date
  return formatDate(dateString);
}
