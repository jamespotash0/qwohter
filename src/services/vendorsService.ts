/**
 * Vendors Service
 *
 * Who a dealer buys from, and what they pay. A purchase order is addressed to a
 * vendor; the discount agreements attached to that vendor are what turn a
 * manufacturer list price into dealer cost.
 *
 * Discount rows are read-restricted at the database level (can_view_cost), so a
 * user without cost visibility gets an empty set rather than an error. Callers
 * must treat "no discounts" as "cannot price", not as "zero discount".
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

type VendorRow = Database['public']['Tables']['vendors']['Row'];
type VendorDiscountRow = Database['public']['Tables']['vendor_discounts']['Row'];

export type Vendor = VendorRow;
export type VendorType = VendorRow['vendor_type'];
export type OrderMethod = VendorRow['order_method'];
export type FreightTerms = VendorRow['freight_terms'];
export type VendorDiscount = VendorDiscountRow;

export type CreateVendorInput = Omit<
  Database['public']['Tables']['vendors']['Insert'],
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateVendorInput = Database['public']['Tables']['vendors']['Update'];

export type CreateVendorDiscountInput = Omit<
  Database['public']['Tables']['vendor_discounts']['Insert'],
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateVendorDiscountInput =
  Database['public']['Tables']['vendor_discounts']['Update'];

// ============================================================================
// Vendors
// ============================================================================

export async function getVendors(
  organizationId: string,
  includeInactive = false
): Promise<Vendor[]> {
  let query = supabase
    .from('vendors')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[vendorsService] getVendors failed:', error);
    throw new Error(`Failed to load vendors: ${error.message}`);
  }

  return data || [];
}

export async function getVendorById(vendorId: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .maybeSingle();

  if (error) {
    console.error('[vendorsService] getVendorById failed:', error);
    throw new Error(`Failed to load vendor: ${error.message}`);
  }

  return data;
}

/**
 * The vendor account backing a manufacturer name.
 *
 * Specification exports name a manufacturer as text, so this matches on the
 * vendor's own name -- case-insensitively, because that text is hand-entered
 * upstream and arrives with inconsistent casing.
 */
export async function getVendorForManufacturer(
  organizationId: string,
  manufacturerName: string
): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('organization_id', organizationId)
    .ilike('name', manufacturerName.trim())
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[vendorsService] getVendorForManufacturer failed:', error);
    throw new Error(`Failed to resolve vendor: ${error.message}`);
  }

  return data;
}

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .insert(input as never)
    .select()
    .single();

  if (error) {
    console.error('[vendorsService] createVendor failed:', error);
    if (error.code === '23505') {
      throw new Error(`A vendor named "${input.name}" already exists.`);
    }
    throw new Error(`Failed to create vendor: ${error.message}`);
  }

  return data;
}

export async function updateVendor(
  vendorId: string,
  patch: UpdateVendorInput
): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .update(patch as never)
    .eq('id', vendorId)
    .select()
    .single();

  if (error) {
    console.error('[vendorsService] updateVendor failed:', error);
    if (error.code === '23505') {
      throw new Error(`A vendor named "${patch.name}" already exists.`);
    }
    throw new Error(`Failed to update vendor: ${error.message}`);
  }

  return data;
}

export async function deactivateVendor(vendorId: string): Promise<Vendor> {
  return updateVendor(vendorId, { is_active: false });
}

export async function deleteVendor(vendorId: string): Promise<void> {
  const { error } = await supabase.from('vendors').delete().eq('id', vendorId);

  if (error) {
    console.error('[vendorsService] deleteVendor failed:', error);
    throw new Error(`Failed to delete vendor: ${error.message}`);
  }
}

/**
 * Where a purchase order should be sent, and whether it can be sent at all.
 * Email vendors need an address; portal and EDI vendors are routed elsewhere.
 */
export function getOrderDestination(vendor: Vendor): {
  method: OrderMethod;
  destination: string | null;
  canSend: boolean;
} {
  switch (vendor.order_method) {
    case 'Email':
      return {
        method: 'Email',
        destination: vendor.order_email,
        canSend: !!vendor.order_email,
      };
    case 'Portal':
      return {
        method: 'Portal',
        destination: vendor.portal_url,
        canSend: !!vendor.portal_url,
      };
    default:
      // EDI, Fax, and Phone are handled outside the app today.
      return { method: vendor.order_method, destination: null, canSend: false };
  }
}

/**
 * Where an acknowledgment is expected from; falls back to the order email.
 *
 * Checks for a non-blank string rather than a non-null one: the column has no
 * NOT NULL constraint and a vendor form can save an empty or whitespace value,
 * which must fall through to the order email rather than be treated as an
 * address.
 */
export function getAcknowledgmentEmail(vendor: Vendor): string | null {
  const ackEmail = vendor.acknowledgment_email?.trim();
  if (ackEmail) return ackEmail;
  return vendor.order_email;
}

// ============================================================================
// Vendor discounts
// ============================================================================

/**
 * Every discount agreement for a vendor.
 *
 * Returns an empty array for users without cost visibility, because RLS filters
 * the rows rather than rejecting the query.
 */
export async function getVendorDiscounts(
  vendorId: string
): Promise<VendorDiscount[]> {
  const { data, error } = await supabase
    .from('vendor_discounts')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('discount_percent', { ascending: false });

  if (error) {
    console.error('[vendorsService] getVendorDiscounts failed:', error);
    throw new Error(`Failed to load vendor discounts: ${error.message}`);
  }

  return data || [];
}

/** Every discount agreement across an organization, for the settings screen. */
export async function getAllVendorDiscounts(
  organizationId: string
): Promise<VendorDiscount[]> {
  const { data, error } = await supabase
    .from('vendor_discounts')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('[vendorsService] getAllVendorDiscounts failed:', error);
    throw new Error(`Failed to load vendor discounts: ${error.message}`);
  }

  return data || [];
}

export async function createVendorDiscount(
  input: CreateVendorDiscountInput
): Promise<VendorDiscount> {
  const { data, error } = await supabase
    .from('vendor_discounts')
    .insert(input as never)
    .select()
    .single();

  if (error) {
    console.error('[vendorsService] createVendorDiscount failed:', error);
    throw new Error(`Failed to create discount: ${error.message}`);
  }

  return data;
}

export async function updateVendorDiscount(
  discountId: string,
  patch: UpdateVendorDiscountInput
): Promise<VendorDiscount> {
  const { data, error } = await supabase
    .from('vendor_discounts')
    .update(patch as never)
    .eq('id', discountId)
    .select()
    .single();

  if (error) {
    console.error('[vendorsService] updateVendorDiscount failed:', error);
    throw new Error(`Failed to update discount: ${error.message}`);
  }

  return data;
}

export async function deleteVendorDiscount(discountId: string): Promise<void> {
  const { error } = await supabase
    .from('vendor_discounts')
    .delete()
    .eq('id', discountId);

  if (error) {
    console.error('[vendorsService] deleteVendorDiscount failed:', error);
    throw new Error(`Failed to delete discount: ${error.message}`);
  }
}

/**
 * Whether the current user may see cost and margin for an organization.
 * Mirrors the RLS predicate so the UI can hide cost columns rather than
 * rendering empty ones.
 */
export async function canViewCost(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_view_cost', {
    check_user_id: userId,
    check_org_id: organizationId,
  } as never);

  if (error) {
    console.error('[vendorsService] canViewCost failed:', error);
    // Fail closed: a failed permission check must not reveal cost.
    return false;
  }

  return data === true;
}
