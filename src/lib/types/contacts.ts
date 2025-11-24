/**
 * Contact Types
 *
 * Represents customer/prospect contacts (non-user accounts)
 * stored in the contacts table
 */

/**
 * Phone number with type
 */
export interface PhoneNumber {
  number: string;
  type: string; // Mobile, Business, Home, Fax, Other
}

export interface Contact {
  id: string;
  organization_id: string;
  full_name: string;
  emails: string[]; // Array of email addresses (at least one required)
  phones?: PhoneNumber[]; // Array of phone objects with number and type
  company_name?: string;
  contact_type?: string; // Lead, Customer, Vendor, Partner, Contractor, Architect, etc.
  addresses?: string[]; // Array of addresses
  notes?: string;
  is_in_organization: boolean; // Whether contact is in the organization
  user_id?: string; // Links to user account if contact becomes a team member
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  full_name: string;
  emails: string[]; // At least one email required
  phones?: PhoneNumber[];
  company_name?: string;
  contact_type?: string;
  addresses?: string[];
  notes?: string;
  is_in_organization?: boolean; // Defaults to false if not provided
}

export interface UpdateContactInput {
  full_name?: string;
  emails?: string[];
  phones?: PhoneNumber[];
  company_name?: string;
  contact_type?: string;
  addresses?: string[];
  notes?: string;
  is_in_organization?: boolean;
}

/**
 * Combined contact option for dropdown
 * Can represent either a user member or a customer contact
 */
export interface ContactOption {
  id: string;
  name: string;
  email: string;
  type: 'member' | 'contact';
  phone?: string;
}

/**
 * Predefined contact types for dropdown
 */
export const CONTACT_TYPES = [
  'Customer',
  'Employee',
  'Salesperson',
  'Vendor',
  'Contractor',
  'Architect',
  'Designer',
  'Engineer',
  'Manufacturer',
  'Business',
  'Supplier',
  'Lead',
  'Other',
] as const;

export type ContactType = typeof CONTACT_TYPES[number];

/**
 * Predefined phone types for dropdown
 */
export const PHONE_TYPES = [
  'Mobile',
  'Business',
  'Home',
  'Fax',
  'Other',
] as const;

export type PhoneType = typeof PHONE_TYPES[number];
