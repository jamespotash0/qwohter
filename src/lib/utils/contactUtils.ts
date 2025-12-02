/**
 * Contact Utilities
 *
 * Helper functions for working with contacts and members
 */

import type { Contact, ContactOption } from '@/lib/types/contacts';

interface Member {
  id: string;
  full_name?: string;
  email: string;
  status?: string;
}

/**
 * Combine organization members and contacts into a unified list
 * for dropdown selection
 *
 * @param members - Organization members (users with accounts)
 * @param contacts - Customer/prospect contacts (non-users)
 * @returns Sorted array of contact options
 */
export function combineContactOptions(
  members: Member[],
  contacts: Contact[]
): ContactOption[] {
  const options: ContactOption[] = [];

  // Add members (users with accounts)
  members
    .filter((member) => member.status === 'Active' && member.full_name)
    .forEach((member) => {
      options.push({
        id: member.id,
        name: member.full_name!,
        email: member.email,
        type: 'member',
      });
    });

  // Add contacts (customer/prospects without accounts)
  // Only include contacts marked as "in organization"
  contacts
    .filter((contact) => contact.is_in_organization && !contact.user_id)
    .forEach((contact) => {
      // Use first email from the emails array
      const primaryEmail = contact.emails[0] || '';
      // Extract phone number from phone object
      const primaryPhone = contact.phones?.[0]?.number;

      options.push({
        id: contact.id,
        name: contact.full_name,
        email: primaryEmail,
        type: 'contact',
        phone: primaryPhone,
      });
    });

  // Sort alphabetically by name
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get unique contact names from a list of contact options
 * Filters out empty/falsy names to prevent SelectItem errors
 */
export function getUniqueContactNames(options: ContactOption[]): string[] {
  const names = new Set(options.map((opt) => opt.name).filter(Boolean));
  return Array.from(names).sort();
}

/**
 * Get unique contact emails from a list of contact options
 * Filters out empty/falsy emails to prevent SelectItem errors
 */
export function getUniqueContactEmails(options: ContactOption[]): string[] {
  const emails = new Set(options.map((opt) => opt.email).filter(Boolean));
  return Array.from(emails).sort();
}

/**
 * Find contact option by name
 */
export function findContactByName(
  options: ContactOption[],
  name: string
): ContactOption | undefined {
  return options.find((opt) => opt.name === name);
}

/**
 * Find contact option by email
 */
export function findContactByEmail(
  options: ContactOption[],
  email: string
): ContactOption | undefined {
  return options.find((opt) => opt.email === email);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format phone number for display with country code
 * Converts: "12015550400" -> "+1 (201) 555-0400"
 * Converts: "442012345678" -> "+44 (201) 234-5678"
 * Handles both string (legacy) and PhoneNumber object formats
 */
export function formatPhoneNumber(phone: string | { number: string; type: string } | undefined): string {
  if (!phone) return '';

  // Extract number string from object or use string directly
  const phoneStr = typeof phone === 'string' ? phone : phone.number;
  if (!phoneStr) return '';

  // Remove all non-numeric characters
  const cleaned = phoneStr.replace(/\D/g, '');

  // Handle numbers with country code (more than 10 digits)
  if (cleaned.length > 10) {
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const areaCode = cleaned.slice(cleaned.length - 10, cleaned.length - 7);
    const firstPart = cleaned.slice(cleaned.length - 7, cleaned.length - 4);
    const secondPart = cleaned.slice(cleaned.length - 4);

    return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
  }

  // Format as (XXX) XXX-XXXX for 10-digit numbers (no country code)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Return as-is for non-standard formats
  return phoneStr;
}
