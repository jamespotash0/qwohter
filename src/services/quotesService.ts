/**
 * @deprecated This service is DEPRECATED. Use proposalsService.ts instead.
 *
 * The "quotes" table is being replaced by the "proposals" table which integrates
 * with the new form-builder system. This file will be removed in a future version.
 *
 * Migration:
 * - OLD: import { fetchQuotes } from '@/services/quotesService'
 * - NEW: import { fetchProposals } from '@/services/proposalsService'
 *
 * See: src/services/proposalsService.ts
 * See: src/hooks/queries/useProposals.ts
 *
 * ============================================================================
 * DEPRECATED - DO NOT USE FOR NEW FEATURES
 * ============================================================================
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import * as authService from '@/auth/services/authService';
import * as Sentry from '@sentry/react';
// ============================================================================
// Types
// ============================================================================

export type Quote = Database['public']['Tables']['quotes']['Row'] & {
  created_by_name?: string; // Joined from profiles table in queries
  // Organization name captured at quote creation (added by migration 20251204000004_add_organization_name_to_quotes.sql)
  organization_name?: string | null; // Denormalized for historical accuracy - doesn't update if org name changes
  // Analytics fields (added by migration 20251009000002_add_analytics_fields_to_quotes.sql)
  // These are denormalized from other fields and maintained by triggers
  total_value?: number | null; // From price_details.final_selling_price
  subtotal?: number | null; // From price_details.subtotal
  margin_percentage?: number | null; // Calculated margin
  // Project board status (added by migration 20251118000002_add_is_on_board_to_quotes.sql)
  is_on_board?: boolean | null; // Tracks if quote is on project board, synced via trigger
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
  proposal_number?: string;
  created_at?: string; // For imported quotes - use the original quote date
  // Status timestamps for imported quotes
  submitted_at?: string;
  won_at?: string;
  rejected_at?: string;
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
  document_version?: number;
  customization?: Record<string, any>;
  archived?: boolean;
  total_value?: number;
  subtotal?: number;
  submitted_at?: string;
  won_at?: string | null;
  rejected_at?: string | null;
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
    .select('organization_id, role, status') //membership_status
    .eq('user_id', userId);

  let quotesData: any[] = [];

  if (!userMemberships || userMemberships.length === 0) {
    // User has no memberships, query personal quotes
    let query = supabase
      .from('quotes')
      .select(`
        id, created_by, created_by_name, organization_id, organization_name, proposal_number, project_name,
        quote_details, job_details, delivery_details, labor_details,
        wall_details, price_details, status, date_last_downloaded,
        document_version, created_at, updated_at, customization,
        quote_source, archived, is_main_version, is_on_board,
        total_value, subtotal,
        submitted_at, won_at, rejected_at, margin_percentage
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
        id, created_by, created_by_name, organization_id, organization_name, proposal_number, project_name,
        quote_details, job_details, delivery_details, labor_details,
        wall_details, price_details, status, date_last_downloaded,
        document_version, created_at, updated_at, customization,
        quote_source, archived, is_main_version, is_on_board,
        total_value, subtotal,
        submitted_at, won_at, rejected_at, margin_percentage
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
 *
 * Why instrumented: Critical user flow - quote creation is core business logic.
 * If this fails, users can't do their primary job.
 *
 * What we track:
 * - Performance: How long does quote creation take?
 * - Errors: Database errors, auth failures, missing org
 * - Context: User ID, org ID (not sensitive quote data)
 */
export async function createQuote(quoteData: CreateQuoteData): Promise<Quote> {
  return await Sentry.startSpan(
    {
      name: 'createQuote',
      op: 'db.query',
      attributes: {
        'quote.project_name': quoteData.project_name || 'Untitled',
      },
    },
    async (span) => {
      try {
        // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
        const session = await authService.getSession();
        if (!session?.user) throw new Error('Not authenticated');

        // Get user's organization
        const membershipResult = await supabase
          .from('memberships')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single();

        if (membershipResult.error) {
          span.setStatus({ code: 2, message: 'Membership query failed' });
          throw membershipResult.error;
        }

        const organizationId = (membershipResult.data as { organization_id: string } | null)?.organization_id;
        if (!organizationId) {
          span.setStatus({ code: 2, message: 'No organization found' });
          throw new Error('User not assigned to an organization');
        }

        span.setAttribute('organization.id', organizationId);

        // Get user's name from profile to set created_by_name
        // Fallback to email if full_name is not set
        const profileResult = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        const createdByName = (profileResult.data as { full_name: string } | null)?.full_name || session.user.email || 'Unknown';

        // Fetch organization name to ensure it's always available
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single();

        // Track organization name source for debugging
        let orgNameSource = 'unknown';
        let finalOrgName = 'Organization Name Not Available';

        if (orgError) {
          // Log detailed error context
          console.error('[createQuote] Failed to fetch organization name:', {
            error: orgError,
            errorCode: orgError.code,
            errorMessage: orgError.message,
            errorDetails: orgError.details,
            organizationId,
            userId: session.user.id,
            userEmail: session.user.email
          });

          // Track in Sentry
          Sentry.captureException(orgError, {
            tags: {
              operation: 'createQuote',
              subOperation: 'fetchOrganizationName',
              organizationId,
            },
            extra: {
              userId: session.user.id,
              errorCode: orgError.code,
              errorDetails: orgError.details,
            },
            level: 'warning',
          });

          span.setAttribute('org.fetch_error', true);
          span.setAttribute('org.error_code', orgError.code || 'unknown');
        }

        // Determine organization name - database is the only source
        const orgName = (orgData as { name: string } | null)?.name;
        if (orgName) {
          finalOrgName = orgName;
          orgNameSource = 'database';
        } else {
          orgNameSource = 'fallback';
          console.warn('[createQuote] Could not fetch organization name from database:', {
            organizationId,
            userId: session.user.id,
            hadError: !!orgError
          });
        }

        // Track source in Sentry
        span.setAttribute('org.name_source', orgNameSource);
        span.setAttribute('org.name', finalOrgName);

        // Create quote with organization_name captured at creation time
        // organization_name is a denormalized column for historical record
        // (won't change if organization renames later)
        const insertData = {
          ...quoteData,
          organization_id: organizationId,
          organization_name: finalOrgName, // Captured at creation time
          created_by: session.user.id,
          created_by_name: createdByName,
          is_main_version: true, // ✅ FIX: New quotes are always main versions
        };

        const { data, error } = await supabase
          .from('quotes')
          .insert(insertData as any)
          .select()
          .single();

        if (error) {
          span.setStatus({ code: 2, message: error.message });
          throw error;
        }

        const createdQuote = data as Quote;

        span.setStatus({ code: 1 }); // Success
        span.setAttribute('quote.id', createdQuote.id);
        return createdQuote;
      } catch (error) {
        // Capture exception with context
        Sentry.captureException(error, {
          tags: {
            operation: 'createQuote',
            project_name: quoteData.project_name,
          },
        });
        throw error;
      }
    }
  );
}

/**
 * Update a quote
 *
 * Why instrumented: Critical user flow - users constantly edit quotes.
 * Performance here directly impacts user experience.
 *
 * What we track:
 * - Performance: Is autosave fast enough?
 * - Errors: RLS failures, database errors
 * - Context: Quote ID (not sensitive quote content)
 */
export async function updateQuote(
  quoteId: string,
  updates: UpdateQuoteData
): Promise<Quote> {
  return await Sentry.startSpan(
    {
      name: 'updateQuote',
      op: 'db.query',
      attributes: {
        'quote.id': quoteId,
        'update.fields': Object.keys(updates).join(', '),
      },
    },
    async (span) => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', quoteId)
          .select()
          .single();

        if (error) {
          span.setStatus({ code: 2, message: error.message });
          Sentry.captureException(error, {
            tags: {
              operation: 'updateQuote',
              quote_id: quoteId,
            },
          });
          throw error;
        }

        const updatedQuote = data as Quote;

        span.setStatus({ code: 1 }); // Success
        return updatedQuote;
      } catch (error) {
        throw error;
      }
    }
  );
}

/**
 * Delete a quote
 *
 * Why instrumented: Destructive operation - if this fails or succeeds incorrectly,
 * users could lose data. We need to know immediately.
 *
 * What we track:
 * - Errors: RLS failures (trying to delete someone else's quote)
 * - Context: Quote ID for debugging
 */
export async function deleteQuote(quoteId: string): Promise<void> {
  return await Sentry.startSpan(
    {
      name: 'deleteQuote',
      op: 'db.query',
      attributes: {
        'quote.id': quoteId,
      },
    },
    async (span) => {
      try {
        const { error } = await supabase
          .from('quotes')
          .delete()
          .eq('id', quoteId);

        if (error) {
          span.setStatus({ code: 2, message: error.message });
          Sentry.captureException(error, {
            tags: {
              operation: 'deleteQuote',
              quote_id: quoteId,
            },
            level: 'warning', // Deletion failures are important
          });
          throw error;
        }

        span.setStatus({ code: 1 }); // Success
      } catch (error) {
        throw error;
      }
    }
  );
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
  // Fetch old quote to get the old status (needed for clearing conflicting timestamps)
  const oldQuote = await fetchQuoteById(quoteId);
  const oldStatus = oldQuote.status || 'Draft';

  const updates: UpdateQuoteData = { status };

  // Add timestamp for status transitions and clear conflicting timestamps
  const now = new Date().toISOString();
  switch (status) {
    case 'Submitted':
      updates.submitted_at = now;
      break;
    case 'Won':
      updates.won_at = now;
      // Clear rejected_at if switching from Rejected to Won
      if (oldStatus === 'Rejected') {
        updates.rejected_at = null;
      }
      break;
    case 'Rejected':
      updates.rejected_at = now;
      // Clear won_at if switching from Won to Rejected
      if (oldStatus === 'Won') {
        updates.won_at = null;
      }
      break;
  }

  return updateQuote(quoteId, updates);
}

/**
 * Manually send a Won quote to the project board
 * - Automatically promotes quote to main version
 * - Creates project with specified or first column
 * @param quoteId - The quote to send
 * @param targetColumnName - Optional column name to place project in (defaults to first column)
 */
export async function sendQuoteToProjectBoard(quoteId: string, targetColumnName?: string): Promise<{ success: boolean; error?: string; projectId?: string }> {
  try {
    // Get current session
    const session = await authService.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the quote
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return { success: false, error: 'Quote not found' };
    }

    // Check if quote is Won
    if (quote.status !== 'Won') {
      return { success: false, error: 'Only Won quotes can be sent to the project board' };
    }

    // Check if project already exists
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('quote_id', quoteId)
      .maybeSingle();

    if (existingProject) {
      return { success: false, error: 'Quote already has a project on the board' };
    }

    // Auto-promote to main version if not already
    if (quote.is_main_version !== true) {
      // Set this quote as main version
      await updateQuote(quoteId, { is_main_version: true });

      // Demote other versions with the same proposal number
      const baseProposalNumber = quote.proposal_number.split('-v')[0];
      const { data: relatedQuotes } = await supabase
        .from('quotes')
        .select('id')
        .eq('organization_id', quote.organization_id)
        .neq('id', quoteId)
        .like('proposal_number', `${baseProposalNumber}%`);

      if (relatedQuotes && relatedQuotes.length > 0) {
        for (const relatedQuote of relatedQuotes) {
          await updateQuote(relatedQuote.id, { is_main_version: false });
        }
      }
    }

    // Get workflow column - use provided column or first by order
    let workflowStatus = targetColumnName;

    if (!workflowStatus) {
      const { data: firstColumn } = await supabase
        .from('project_workflow_columns')
        .select('name')
        .eq('organization_id', quote.organization_id)
        .order('column_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      workflowStatus = (firstColumn as any)?.name || 'Active';
    }

    // Get next board_order
    const { data: maxOrderProject } = await supabase
      .from('projects')
      .select('board_order')
      .eq('organization_id', quote.organization_id)
      .order('board_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = ((maxOrderProject as any)?.board_order || 0) + 1;

    // Create project (priority defaults to NULL - user can set it manually)
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        quote_id: quoteId,
        organization_id: quote.organization_id,
        workflow_status: workflowStatus,
        board_order: nextOrder,
        priority: null,
      } as any)
      .select()
      .single();

    if (projectError) {
      console.error('Failed to create project:', projectError);
      return { success: false, error: 'Failed to create project on board' };
    }

    return { success: true, projectId: newProject.id };
  } catch (error) {
    console.error('Error in sendQuoteToProjectBoard:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Remove a quote from the project board (delete the project)
 */
export async function removeQuoteFromProjectBoard(quoteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[removeQuoteFromProjectBoard] 🗑️ Starting removal for quote:', quoteId);

    // Get current session
    const session = await authService.getSession();
    if (!session?.user) {
      console.error('[removeQuoteFromProjectBoard] ❌ Not authenticated');
      return { success: false, error: 'Not authenticated' };
    }
    console.log('[removeQuoteFromProjectBoard] ✅ User authenticated:', session.user.id);

    // Find the project
    console.log('[removeQuoteFromProjectBoard] 🔍 Looking for project with quote_id:', quoteId);
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, quote_id, workflow_status')
      .eq('quote_id', quoteId)
      .maybeSingle();

    if (fetchError) {
      console.error('[removeQuoteFromProjectBoard] ❌ Error fetching project:', fetchError);
      return { success: false, error: 'Error finding project' };
    }

    if (!project) {
      console.warn('[removeQuoteFromProjectBoard] ⚠️ No project found for quote:', quoteId);
      return { success: false, error: 'No project found for this quote' };
    }

    console.log('[removeQuoteFromProjectBoard] ✅ Found project:', project);

    // Delete the project
    console.log('[removeQuoteFromProjectBoard] 🗑️ Deleting project with id:', project.id);
    const { data: deletedData, error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)
      .select(); // Return the deleted row to confirm deletion

    if (deleteError) {
      console.error('[removeQuoteFromProjectBoard] ❌ Failed to delete project:', deleteError);
      return { success: false, error: 'Failed to remove project from board' };
    }

    console.log('[removeQuoteFromProjectBoard] ✅ Successfully deleted project. Deleted rows:', deletedData?.length || 0, deletedData);

    return { success: true };
  } catch (error) {
    console.error('[removeQuoteFromProjectBoard] ❌ Exception:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create quote version (duplicate quote with new proposal number)
 */
export async function createQuoteVersion(
  existingQuoteId: string,
  newProposalNumber: string,
  versionNumber: number
): Promise<Quote> {
  // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
  const session = await authService.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Fetch existing quote (RLS ensures user has access)
  const existingQuote = await fetchQuoteById(existingQuoteId);

  // Get user's name from profile to set created_by_name
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  const createdByName = (profileData as any)?.full_name || session.user.email || 'Unknown';

  // Create new version - organization_name is copied from existing quote
  // RLS policies automatically ensure user has access to this organization
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      ...existingQuote,
      id: undefined,
      proposal_number: newProposalNumber,
      document_version: versionNumber,
      is_main_version: false,
      status: 'Draft', // Versions always start as Draft
      submitted_at: null, // Clear status timestamps
      won_at: null,
      rejected_at: null,
      created_by: session.user.id,
      created_by_name: createdByName,
      organization_id: existingQuote.organization_id,
      organization_name: (existingQuote as any).organization_name || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating quote version:', error);
    throw new Error(error.message || 'Failed to create quote version');
  }

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
    .select('id, status')
    .like('proposal_number', `${baseProposalNumber}%`);

  if (fetchError) throw fetchError;

  // Type for quotes array
  type QuoteVersion = { id: string; status: string };
  const typedQuotes = (quotes || []) as QuoteVersion[];

  // Get the new main version's status
  const newMainQuote = typedQuotes.find(q => q.id === quoteId);
  const newMainStatus = newMainQuote?.status;

  // Check if there's an existing project for any quote in this version group
  const { data: existingProject } = await supabase
    .from('projects')
    .select('id, quote_id')
    .in('quote_id', typedQuotes.map(q => q.id))
    .maybeSingle();

  // Type for project
  type ProjectLink = { id: string; quote_id: string };
  const typedProject = existingProject as ProjectLink | null;

  // Update all quotes in the group
  const updates = typedQuotes.map((quote) =>
    updateQuote(quote.id, {
      is_main_version: quote.id === quoteId,
    })
  );

  await Promise.all(updates);

  // Handle project link updates
  if (typedProject) {
    if (newMainStatus === 'Won') {
      // New main version is Won: Update project to link to new main version
      const { error: updateError } = await supabase
        .from('projects')
        .update({ quote_id: quoteId })
        .eq('id', typedProject.id);

      if (updateError) {
        console.error('Failed to update project link:', updateError);
        throw new Error('Failed to update project link to new main version');
      }
    } else {
      // New main version is NOT Won: Delete the project
      // (It no longer meets the constraint: main version + Won status)
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', typedProject.id);

      if (deleteError) {
        console.error('Failed to delete project:', deleteError);
        throw new Error('Failed to delete project for non-Won main version');
      }
    }
  }
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
