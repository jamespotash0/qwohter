/**
 * Contact Types
 *
 * Represents customer/prospect contacts (non-user accounts)
 * stored in the contacts table
 */

export interface Contact {
  id: string;
  organization_id: string;
  full_name: string;
  emails: string[]; // Array of email addresses (at least one required)
  phones?: string[]; // Array of phone numbers
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
  phones?: string[];
  company_name?: string;
  contact_type?: string;
  addresses?: string[];
  notes?: string;
  is_in_organization?: boolean; // Defaults to false if not provided
}

export interface UpdateContactInput {
  full_name?: string;
  emails?: string[];
  phones?: string[];
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
  'Lead',
  'Customer',
  'Vendor',
  'Partner',
  'Contractor',
  'Architect',
  'Designer',
  'Supplier',
  'Consultant',
  'Other',
] as const;

export type ContactType = typeof CONTACT_TYPES[number];
