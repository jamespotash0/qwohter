/**
 * Proposals Service
 *
 * Centralized service for all proposals-related API calls.
 * Handles proposal creation with auto-incrementing proposal numbers.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import * as authService from '@/auth/services/authService';
import type { DocumentType } from '@/stores/forms/formsStore';

// ============================================================================
// Types
// ============================================================================

export type Proposal = Database['public']['Tables']['proposals']['Row'];

export interface CreateProposalData {
  form_id: string; // Which form template was used
  form_data?: Record<string, any>; // Form submission data (JSONB)
  status?: string;
  // Direct columns for querying/filtering (optional - extracted from form_data if not provided)
  project_name?: string;
  client_name?: string;
  client_company?: string;
  job_location?: string;
  total_value?: number;
  // Additional metadata columns
  /** @deprecated Use pdf_template_id instead */
  template_type?: string; // PDF template type (e.g., 'generic_wall', 'base', 'smart')
  pdf_template_id?: string; // Reference to pdf_templates table
  is_on_board?: boolean; // Whether to show on kanban board
  quote_source?: string; // Lead source (e.g., 'Website', 'Referral')
  document_type?: DocumentType; // Type of document (inherited from form)
}

export interface UpdateProposalData {
  form_data?: Record<string, any>;
  status?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
}

export interface ProposalVersionInfo {
  mainNumber: string;
  version: number;
  fullNumber: string;
}

// ============================================================================
// Proposal Number Generation
// ============================================================================

/**
 * Generate the next proposal number for an organization
 *
 * Finds the highest proposal number in the proposals table and increments by 1.
 * Format: P{number} (e.g., P1001, P1002, P1003)
 *
 * @param organizationId - Organization ID to scope the query
 * @returns The next proposal number (e.g., "P1001")
 */
export async function generateNextProposalNumber(
  organizationId: string
): Promise<string> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  // Query proposals table to find the highest number
  const { data: proposals } = await supabase
    .from('proposals')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .not('proposal_number', 'is', null);

  // Extract numeric parts and find the maximum
  let maxNumber = 1000; // Start from 1000 if no existing proposals

  if (proposals) {
    for (const proposal of proposals) {
      if (!proposal.proposal_number) continue;
      // Match patterns like "P1001", "P1002", etc. (ignore versions like "P1001.2")
      const match = proposal.proposal_number.match(/^P(\d+)$/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  // Return the next number
  return `P${maxNumber + 1}`;
}

// ============================================================================
// Proposal Versioning
// ============================================================================

/**
 * Generate a version number for a proposal revision
 *
 * This calls the database function `generate_proposal_version()` which:
 * - Extracts the main number from the parent (strips any .X suffix)
 * - Finds the highest version number for this proposal
 * - Returns the next version number with proper suffix
 *
 * Example:
 * - Parent: "SR-1005" → Returns "SR-1005.2" (first revision)
 * - Parent: "SR-1005.2" → Returns "SR-1005.3" (second revision)
 * - Parent: "Q1200" → Returns "Q1200.2"
 *
 * @param parentProposalNumber - The proposal number to create a version of
 * @param organizationId - Organization ID for scoping the version lookup
 * @returns The next version number to use
 */
export async function generateProposalVersion(
  parentProposalNumber: string,
  organizationId: string
): Promise<string> {
  if (!parentProposalNumber) {
    throw new Error('Parent proposal number is required');
  }
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  const { data, error } = await (supabase.rpc as any)('generate_proposal_version', {
    p_parent_proposal_number: parentProposalNumber,
    p_organization_id: organizationId,
  });

  if (error) {
    console.error('Error generating proposal version:', error);
    throw new Error(`Failed to generate proposal version: ${error.message}`);
  }

  if (!data) {
    throw new Error('No proposal version returned from database function');
  }

  return data as string;
}

/**
 * Parse a proposal number to extract version info
 */
export function parseProposalNumber(proposalNumber: string): ProposalVersionInfo {
  // Check if there's a version suffix (e.g., "SR-1005.2")
  const versionMatch = proposalNumber.match(/^(.+)\.(\d+)$/);

  if (versionMatch && versionMatch[1] && versionMatch[2]) {
    return {
      mainNumber: versionMatch[1],
      version: parseInt(versionMatch[2], 10),
      fullNumber: proposalNumber,
    };
  }

  // No version suffix, this is version 1 (original)
  return {
    mainNumber: proposalNumber,
    version: 1,
    fullNumber: proposalNumber,
  };
}

// ============================================================================
// Proposal Operations
// ============================================================================

/**
 * Fetch proposals for an organization
 */
export async function fetchProposals(
  organizationId: string,
  filters?: { status?: string; form_id?: string }
): Promise<Proposal[]> {
  const session = await authService.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  let query = supabase
    .from('proposals')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.form_id) {
    query = query.eq('form_id', filters.form_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching proposals:', error);
    throw new Error(`Failed to fetch proposals: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch single proposal by ID
 */
export async function fetchProposalById(proposalId: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (error) {
    console.error('Error fetching proposal:', error);
    throw new Error(`Failed to fetch proposal: ${error.message}`);
  }

  if (!data) {
    throw new Error('Proposal not found');
  }

  return data;
}

/**
 * Create a new proposal
 *
 * This function:
 * 1. Fetches the form to get its document_type
 * 2. Generates the next proposal number (finds highest existing P{num} and increments)
 * 3. Creates the proposal with the generated number
 */
export async function createProposal(
  proposalData: CreateProposalData
): Promise<Proposal> {
  const session = await authService.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Get user's organization
  const { data: membershipData, error: membershipError } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', session.user.id)
    .single<{ organization_id: string }>();

  if (membershipError) {
    console.error('Error fetching membership:', membershipError);
    throw new Error(`Membership error: ${membershipError.message}`);
  }

  if (!membershipData?.organization_id) {
    throw new Error('User not assigned to an organization');
  }

  // Fetch the form to get document_type
  const { data: formData, error: formError } = await supabase
    .from('forms')
    .select('document_type')
    .eq('id', proposalData.form_id)
    .single<{ document_type: DocumentType | null }>();

  if (formError) {
    console.error('Error fetching form:', formError);
    throw new Error(`Failed to fetch form: ${formError.message}`);
  }

  if (!formData) {
    throw new Error('Form not found');
  }

  // Determine document type (from form or default to 'Proposal')
  const documentType: DocumentType = formData.document_type || 'Proposal';

  // Generate the next proposal number (finds highest existing and increments)
  const proposalNumber = await generateNextProposalNumber(membershipData.organization_id);

  // Extract client info from form_data if not provided directly
  const clientInfo = proposalData.form_data?._clientInfo;
  const metadata = proposalData.form_data?._metadata;

  // Create the proposal with the generated number and direct columns
  const insertData = {
    organization_id: membershipData.organization_id,
    created_by: session.user.id,
    form_id: proposalData.form_id,
    proposal_number: proposalNumber,
    form_data: proposalData.form_data || {},
    status: proposalData.status || 'Draft',
    // Direct columns for querying (extract from form_data._clientInfo or use provided values)
    project_name: proposalData.project_name || metadata?.proposalName || null,
    client_name: proposalData.client_name || clientInfo?.clientName || null,
    client_company: proposalData.client_company || clientInfo?.clientCompany || null,
    job_location: proposalData.job_location || clientInfo?.jobLocation || null,
    total_value: proposalData.total_value || null,
    // Document type and PDF template
    document_type: documentType,
    pdf_template_id: proposalData.pdf_template_id || null,
    // Additional metadata columns (template_type kept for backward compatibility)
    template_type: proposalData.template_type || metadata?.template || null,
    is_on_board: proposalData.is_on_board ?? false,
    quote_source: proposalData.quote_source || metadata?.quoteSource || null,
  };

  const { data, error } = await supabase
    .from('proposals')
    .insert(insertData as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating proposal:', error);
    throw new Error(`Failed to create proposal: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create proposal: No data returned');
  }

  return data;
}

/**
 * Update a proposal
 */
export async function updateProposal(
  proposalId: string,
  updates: UpdateProposalData
): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) {
    console.error('Error updating proposal:', error);
    throw new Error(`Failed to update proposal: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to update proposal: No data returned');
  }

  return data;
}

/**
 * Delete a proposal
 */
export async function deleteProposal(proposalId: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', proposalId);

  if (error) {
    console.error('Error deleting proposal:', error);
    throw new Error(`Failed to delete proposal: ${error.message}`);
  }
}

/**
 * Update proposal status
 */
export async function updateProposalStatus(
  proposalId: string,
  status: string
): Promise<Proposal> {
  const updates: UpdateProposalData = { status };

  // Add timestamp for status transitions
  const now = new Date().toISOString();
  switch (status) {
    case 'submitted':
      updates.submitted_at = now;
      break;
    case 'approved':
      updates.approved_at = now;
      break;
    case 'rejected':
      updates.rejected_at = now;
      break;
  }

  return updateProposal(proposalId, updates);
}

/**
 * Create a new version (revision) of an existing proposal
 *
 * This function:
 * 1. Fetches the parent proposal
 * 2. Generates the next version number (e.g., SR-1005 → SR-1005.2)
 * 3. Creates a new proposal with the versioned number
 * 4. Links it to the parent via parent_proposal_id
 *
 * Example usage:
 * - Client receives proposal SR-1005 and requests changes
 * - Call createProposalVersion(parentId) → creates SR-1005.2
 * - Make more changes → SR-1005.3, SR-1005.4, etc.
 *
 * @param parentProposalId - UUID of the proposal to create a version of
 * @param proposalData - Optional updated data for the new version (defaults to copy of parent)
 * @returns The newly created proposal version
 */
export async function createProposalVersion(
  parentProposalId: string,
  proposalData?: Partial<CreateProposalData>
): Promise<Proposal> {
  const session = await authService.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Fetch the parent proposal
  const parentProposal = await fetchProposalById(parentProposalId);

  if (!parentProposal.organization_id) {
    throw new Error('Parent proposal has no organization');
  }

  if (!parentProposal.proposal_number) {
    throw new Error('Parent proposal has no proposal number');
  }

  // Generate the next version number (e.g., SR-1005 → SR-1005.2)
  const versionedNumber = await generateProposalVersion(
    parentProposal.proposal_number,
    parentProposal.organization_id
  );

  // Create the new version
  const insertData = {
    organization_id: parentProposal.organization_id,
    created_by: session.user.id,
    form_id: parentProposal.form_id,
    proposal_number: versionedNumber, // Contains version in the number itself (e.g., "SR-1005.2")
    form_data: proposalData?.form_data || parentProposal.form_data || {},
    status: proposalData?.status || 'Draft',
    parent_proposal_id: parentProposalId,
  };

  const { data, error } = await supabase
    .from('proposals')
    .insert(insertData as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating proposal version:', error);
    throw new Error(`Failed to create proposal version: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create proposal version: No data returned');
  }

  return data;
}

/**
 * Get all versions of a proposal
 *
 * Returns all proposals in the version chain (original + all revisions)
 * Sorted by version number ascending
 *
 * @param proposalId - UUID of any proposal in the version chain
 * @returns Array of all versions
 */
export async function getProposalVersions(proposalId: string): Promise<Proposal[]> {
  // First, fetch the proposal to get its proposal_number
  const proposal = await fetchProposalById(proposalId);

  if (!proposal.proposal_number || !proposal.organization_id) {
    throw new Error('Proposal has no proposal number or organization');
  }

  // Extract the main number (without version suffix)
  const versionInfo = parseProposalNumber(proposal.proposal_number);

  // Fetch all proposals with the same main number
  // Order by created_at to get versions in chronological order
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('organization_id', proposal.organization_id)
    .like('proposal_number', `${versionInfo.mainNumber}%`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching proposal versions:', error);
    throw new Error(`Failed to fetch proposal versions: ${error.message}`);
  }

  return data || [];
}
