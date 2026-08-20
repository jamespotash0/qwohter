/**
 * Companies Service
 *
 * Customer accounts — who a dealer sells to. Companies carry the bill-to and
 * ship-to addresses, payment terms, and tax status that a sales order, invoice,
 * and shipping label all need. Contacts remain people and optionally belong to
 * a company.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Supabase calls are cast at the boundary below. The hand-maintained Database
// type omits the `Relationships` key that supabase-js requires on every table,
// which fails the GenericSchema constraint and collapses BOTH Insert/Update and
// select results to `never` — repo-wide, not just here. Because `never` is
// assignable to anything, reads compile against any shape and are effectively
// unchecked; the interfaces in this file describe the rows, they do not verify
// them. Adding `Relationships` repo-wide surfaces ~125 unrelated errors, so this
// follows the existing convention in contactsService and paymentsService until
// that is addressed deliberately.

type CompanyRow = Database['public']['Tables']['companies']['Row'];

export type CompanyType = CompanyRow['company_type'];
export type Company = CompanyRow;

export type CreateCompanyInput = Omit<
  Database['public']['Tables']['companies']['Insert'],
  'id' | 'created_at' | 'updated_at'
>;

export type UpdateCompanyInput = Database['public']['Tables']['companies']['Update'];

/** A postal address, in the shape the UI and PDF templates consume. */
export interface Address {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * All companies for an organization, alphabetical.
 * Pass includeInactive to show deactivated accounts too.
 */
export async function getCompanies(
  organizationId: string,
  includeInactive = false
): Promise<Company[]> {
  let query = supabase
    .from('companies')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[companiesService] getCompanies failed:', error);
    throw new Error(`Failed to load companies: ${error.message}`);
  }

  return data || [];
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .maybeSingle();

  if (error) {
    console.error('[companiesService] getCompanyById failed:', error);
    throw new Error(`Failed to load company: ${error.message}`);
  }

  return data;
}

/**
 * Name search for the company picker. Matches anywhere in the name so a user
 * can type the distinctive part rather than the leading article.
 */
export async function searchCompanies(
  organizationId: string,
  query: string
): Promise<Company[]> {
  const term = query.trim();
  if (!term) return getCompanies(organizationId);

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .ilike('name', `%${term}%`)
    .order('name', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[companiesService] searchCompanies failed:', error);
    throw new Error(`Failed to search companies: ${error.message}`);
  }

  return data || [];
}

// ============================================================================
// Mutations
// ============================================================================

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert(input as never)
    .select()
    .single();

  if (error) {
    console.error('[companiesService] createCompany failed:', error);
    // The org-scoped unique index on lower(name) is the common failure here.
    if (error.code === '23505') {
      throw new Error(`A company named "${input.name}" already exists.`);
    }
    throw new Error(`Failed to create company: ${error.message}`);
  }

  return data;
}

export async function updateCompany(
  companyId: string,
  patch: UpdateCompanyInput
): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(patch as never)
    .eq('id', companyId)
    .select()
    .single();

  if (error) {
    console.error('[companiesService] updateCompany failed:', error);
    if (error.code === '23505') {
      throw new Error(`A company named "${patch.name}" already exists.`);
    }
    throw new Error(`Failed to update company: ${error.message}`);
  }

  return data;
}

/**
 * Deactivate rather than delete. A company is referenced by order history, so
 * removing the row is an Owner/Admin action taken deliberately; everyday
 * cleanup goes through here.
 */
export async function deactivateCompany(companyId: string): Promise<Company> {
  return updateCompany(companyId, { is_active: false });
}

export async function deleteCompany(companyId: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);

  if (error) {
    console.error('[companiesService] deleteCompany failed:', error);
    throw new Error(`Failed to delete company: ${error.message}`);
  }
}

// ============================================================================
// Helpers
// ============================================================================

export function getBillingAddress(company: Company): Address {
  return {
    line1: company.billing_address_line1,
    line2: company.billing_address_line2,
    city: company.billing_city,
    state: company.billing_state,
    postalCode: company.billing_postal_code,
    country: company.billing_country,
  };
}

/**
 * Ship-to for a company. Falls back to the billing address when no separate
 * shipping address is on file, which is the common case for office accounts.
 */
export function getShippingAddress(company: Company): Address {
  if (company.shipping_address_line1) {
    return {
      line1: company.shipping_address_line1,
      line2: company.shipping_address_line2,
      city: company.shipping_city,
      state: company.shipping_state,
      postalCode: company.shipping_postal_code,
      country: company.shipping_country,
    };
  }
  return getBillingAddress(company);
}

/** Single-line address for tables and pickers. Empty when nothing is on file. */
export function formatAddress(address: Address): string {
  const cityLine = [address.city, address.state].filter(Boolean).join(', ');
  return [
    address.line1,
    address.line2,
    [cityLine, address.postalCode].filter(Boolean).join(' '),
  ]
    .filter(part => part?.trim())
    .join(', ');
}
