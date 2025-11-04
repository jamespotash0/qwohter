/**
 * Quotes Service
 *
 * Centralized service for all quotes-related API calls.
 * Used by React Query hooks for data fetching.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import * as authService from '@/auth/services/authService';
// ============================================================================
// Types
// ============================================================================

export type Quote = Database['public']['Tables']['quotes']['Row'] & {
  created_by_name?: string; // Joined from profiles table in queries
  // Analytics fields (added by migration 20251009000002_add_analytics_fields_to_quotes.sql)
  // These are denormalized from other fields and maintained by triggers
  total_value?: number | null; // From price_details.final_selling_price
  subtotal?: number | null; // From price_details.subtotal
  margin_percentage?: number | null; // Calculated margin
};

export interface QuoteFilters {
  status?: string;
  search?: string;
  archived?: boolean;
}

export interface CreateQuoteData {
  project_name?: string;
  quote_details?: Record<string, any>;
  job_details?: Record<string, any>;
  delivery_details?: Record<string, any>;
  labor_details?: Record<string, any>;
  wall_details: Record<string, any>;
  price_details?: Record<string, any>;
  status?: string;
  customization?: Record<string, any>;
  quote_source?: string;
}

export interface UpdateQuoteData {
  project_name?: string;
  quote_details?: Record<string, any>;
  job_details?: Record<string, any>;
  delivery_details?: Record<string, any>;
  labor_details?: Record<string, any>;
  wall_details?: Record<string, any>;
  price_details?: Record<string, any>;
  status?: string;
  date_last_downloaded?: string;
  version?: number;
  customization?: Record<string, any>;
  downloaded?: boolean;
  archived?: boolean;
  total_value?: number;
  subtotal?: number;
  submitted_at?: string;
  won_at?: string;
  rejected_at?: string;
  closed_at?: string;
  margin_percentage?: number;
  is_main_version?: boolean;
  quote_source?: string;
}

// ============================================================================
// Quote Operations
// ============================================================================

/**
 * Fetch quotes for an organization
 */
export async function fetchQuotes(
  userId: string,
  filters?: QuoteFilters
): Promise<Quote[]> {
  // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
  const session = await authService.getSession();

  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Check if user has any memberships first
  const { data: userMemberships } = await supabase
    .from('memberships')
    .select('organization_id, role, status')
    .eq('user_id', userId);

  let quotesData: any[] = [];

  if (!userMemberships || userMemberships.length === 0) {
    // User has no memberships, query personal quotes
    let query = supabase
      .from('quotes')
      .select(`
        id, created_by, created_by_name, organization_id, proposal_number, project_name,
        quote_details, job_details, delivery_details, labor_details,
        wall_details, price_details, status, date_last_downloaded,
        version, created_at, updated_at, customization,
        quote_source, archived, is_main_version,
        total_value, subtotal,
        submitted_at, won_at, rejected_at, closed_at, margin_percentage
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply filters
    if (filters?.archived !== undefined) {
      query = query.eq('archived', filters.archived);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    quotesData = data || [];
  } else {
    // User has memberships, let RLS policies handle the query
    let query = supabase
      .from('quotes')
      .select(`
        id, created_by, created_by_name, organization_id, proposal_number, project_name,
        quote_details, job_details, delivery_details, labor_details,
        wall_details, price_details, status, date_last_downloaded,
        version, created_at, updated_at, customization,
        quote_source, archived, is_main_version,
        total_value, subtotal,
        submitted_at, won_at, rejected_at, closed_at, margin_percentage
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply filters
    if (filters?.archived !== undefined) {
      query = query.eq('archived', filters.archived);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    quotesData = data || [];
  }

  return quotesData as Quote[];
}

/**
 * Fetch single quote by ID
 */
export async function fetchQuoteById(quoteId: string): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (error) throw error;
  return data as Quote;
}

/**
 * Create a new quote
 */
export async function createQuote(quoteData: CreateQuoteData): Promise<Quote> {
  // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
  const session = await authService.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Get user's organization
  const { data: membershipData, error: membershipError } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .single();

  if (membershipError) throw membershipError;
  if (!membershipData?.organization_id) {
    throw new Error('User not assigned to an organization');
  }

  // Get user's name from profile to set created_by_name
  // Fallback to email if full_name is not set
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .single();

  const createdByName = profileData?.full_name || session.user.email || 'Unknown';

  // Create quote with created_by_name explicitly set
  const insertData = {
    ...quoteData,
    organization_id: membershipData.organization_id,
    created_by: session.user.id,
    created_by_name: createdByName,
  };

  const { data, error } = await supabase
    .from('quotes')
    .insert(insertData as any)
    .select()
    .single();

  if (error) throw error;
  return data as Quote;
}

/**
 * Update a quote
 */
export async function updateQuote(
  quoteId: string,
  updates: UpdateQuoteData
): Promise<Quote> {
  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', quoteId)
    .select()
    .single();

  if (error) throw error;
  return data as Quote;
}

/**
 * Delete a quote
 */
export async function deleteQuote(quoteId: string): Promise<void> {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId);

  if (error) throw error;
}

/**
 * Archive a quote
 */
export async function archiveQuote(quoteId: string): Promise<Quote> {
  return updateQuote(quoteId, { archived: true });
}

/**
 * Unarchive a quote
 */
export async function unarchiveQuote(quoteId: string): Promise<Quote> {
  return updateQuote(quoteId, { archived: false });
}

/**
 * Mark quote as downloaded
 */
export async function markQuoteAsDownloaded(quoteId: string): Promise<Quote> {
  return updateQuote(quoteId, {
    date_last_downloaded: new Date().toISOString(),
  });
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(
  quoteId: string,
  status: string
): Promise<Quote> {
  const updates: UpdateQuoteData = { status };

  // Add timestamp for status transitions
  const now = new Date().toISOString();
  switch (status) {
    case 'Submitted':
      updates.submitted_at = now;
      break;
    case 'Won':
      updates.won_at = now;
      break;
    case 'Rejected':
      updates.rejected_at = now;
      break;
    case 'Closed':
      updates.closed_at = now;
      break;
  }

  return updateQuote(quoteId, updates);
}

/**
 * Create quote version (duplicate quote with new proposal number)
 */
export async function createQuoteVersion(
  existingQuoteId: string,
  newProposalNumber: string,
  versionNumber: number
): Promise<Quote> {
  // Fetch existing quote
  const existingQuote = await fetchQuoteById(existingQuoteId);

  // Create new version
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      ...existingQuote,
      id: undefined,
      proposal_number: newProposalNumber,
      version: versionNumber,
      is_main_version: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as Quote;
}

/**
 * Set main version for a quote group
 */
export async function setMainVersion(
  quoteId: string,
  baseProposalNumber: string
): Promise<void> {
  // Get all quotes with the same base proposal number
  const { data: quotes, error: fetchError } = await supabase
    .from('quotes')
    .select('id')
    .like('proposal_number', `${baseProposalNumber}%`);

  if (fetchError) throw fetchError;

  // Update all quotes in the group
  const updates = (quotes || []).map((quote) =>
    updateQuote(quote.id, {
      is_main_version: quote.id === quoteId,
    })
  );

  await Promise.all(updates);
}

/**
 * Save quote customization settings
 */
export async function saveQuoteCustomization(
  quoteId: string,
  customization: any
): Promise<Quote> {
  return updateQuote(quoteId, { customization });
}

/**
 * Update wall system in quote
 */
export async function updateWallSystem(
  quoteId: string,
  wallName: string,
  wallData: any
): Promise<Quote> {
  // Fetch current quote
  const currentQuote = await fetchQuoteById(quoteId);

  // Update wall details
  const updatedWallDetails = {
    ...currentQuote.wall_details,
    walls: {
      ...(currentQuote.wall_details as any).walls,
      [wallName]: wallData,
    },
  };

  return updateQuote(quoteId, { wall_details: updatedWallDetails });
}

/**
 * Remove wall system from quote
 */
export async function removeWallSystem(
  quoteId: string,
  wallName: string
): Promise<Quote> {
  // Fetch current quote
  const currentQuote = await fetchQuoteById(quoteId);

  // Remove wall from details
  const walls = { ...(currentQuote.wall_details as any).walls };
  delete walls[wallName];

  const updatedWallDetails = {
    ...currentQuote.wall_details,
    walls,
  };

  return updateQuote(quoteId, { wall_details: updatedWallDetails });
}

/**
 * Add wall system to quote
 */
export async function addWallSystem(
  quoteId: string,
  wallName: string,
  wallData: any
): Promise<Quote> {
  return updateWallSystem(quoteId, wallName, wallData);
}
