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
  contacts.forEach((contact) => {
    // Skip contacts that are linked to team members (avoid duplicates)
    // They're already in the members list via user_id
    if (contact.user_id) {
      return;
    }

    // Use first email from the emails array
    const primaryEmail = contact.emails[0] || '';
    const primaryPhone = contact.phones?.[0];

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
 */
export function getUniqueContactNames(options: ContactOption[]): string[] {
  const names = new Set(options.map((opt) => opt.name));
  return Array.from(names).sort();
}

/**
 * Get unique contact emails from a list of contact options
 */
export function getUniqueContactEmails(options: ContactOption[]): string[] {
  const emails = new Set(options.map((opt) => opt.email));
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
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return '';

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for US numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Return as-is for international or non-standard formats
  return phone;
}
