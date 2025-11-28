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
