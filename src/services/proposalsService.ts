/**
 * Proposals Service
 *
 * Centralized service for all proposals-related API calls.
 * Handles proposal creation with auto-incrementing proposal numbers.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import * as authService from '@/auth/services/authService';
import { fetchUserProfile } from '@/auth/services/profileService';
import {
  getNextProposalNumber as getNextFromConfig,
  incrementLastNumber,
  type NumberingConfig,
} from './numberingConfigService';

// Document type is now a string (custom types per organization)
export type DocumentType = string;

// Re-export numbering config types and functions for convenience
export { type NumberingConfig } from './numberingConfigService';
export {
  getNumberingConfig,
  setNumberingConfig,
  initializeNumberingConfig,
  getDefaultConfigSuggestion,
  getAllNumberingConfigs,
} from './numberingConfigService';

// ============================================================================
// Types
// ============================================================================

// Base type from database schema
type ProposalRow = Database['public']['Tables']['proposals']['Row'];

// Extended proposal type with additional fields (added via migrations)
export type Proposal = ProposalRow & {
  is_complete?: boolean;
  completed_at?: string; // Timestamp when proposal was first marked complete
  documents_count?: number;
  google_doc_id?: string; // Selected Google Docs template ID
};

export interface CreateProposalData {
  form_id: string; // Which form template was used
  form_data?: Record<string, any>; // Form submission data (JSONB)
  status?: string;
  // Override auto-generation for imports
  proposal_number?: string; // If provided, use this instead of auto-generating
  created_at?: string; // If provided, use this as the creation date (ISO string)
  // Direct columns for querying/filtering (optional - extracted from form_data if not provided)
  project_name?: string;
  client_name?: string;
  client_company?: string;
  organization_name?: string; // Organization name for display on proposals
  job_location?: string;
  total_value?: number;
  // Additional metadata columns
  is_on_board?: boolean; // Whether to show on kanban board
  is_complete?: boolean; // Whether the proposal is marked as finished or unfinished
  proposal_source?: string; // Lead source (e.g., 'Website', 'Referral')
  document_type?: DocumentType; // Type of document (inherited from form)
  google_doc_id?: string; // Selected Google Docs template ID for this proposal
}

export interface UpdateProposalData {
  form_data?: Record<string, any>;
  status?: string;
  project_name?: string;
  client_name?: string;
  client_company?: string;
  job_location?: string;
  total_value?: number;
  submitted_at?: string;
  won_at?: string;
  rejected_at?: string;
  proposal_source?: string;
  google_doc_id?: string; // Selected Google Docs template ID
  is_complete?: boolean; // Whether proposal is finished (auto-calculated)
  completed_at?: string; // Timestamp when proposal was first marked complete
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
 * Get the default prefix for a document type (fallback when no config exists)
 * For custom document types, uses first letter uppercase
 */
export function getDocumentTypePrefix(documentType: DocumentType | null | undefined): string {
  if (!documentType) return 'P';

  // Common type prefixes
  const commonPrefixes: Record<string, string> = {
    'Quote': 'Q',
    'Bid': 'B',
    'Estimate': 'E',
    'Service Request': 'SR',
    'Service_Request': 'SR',
    'Proposal': 'P',
    'Invoice': 'INV',
    'Work Order': 'WO',
  };

  return commonPrefixes[documentType] || documentType.charAt(0).toUpperCase();
}

/**
 * Result of getting the next proposal number
 */
export interface NextProposalNumberResult {
  number: string;           // The formatted number (e.g., "P-1001")
  nextNumeric: number;      // The numeric part (e.g., 1001)
  config: NumberingConfig;  // The config used
  isConfigured: boolean;    // Whether org has custom config for this doc type
}

/**
 * Generate the next proposal number for an organization
 *
 * Uses the organization's numbering config if available.
 * Falls back to default prefixes if no config exists.
 *
 * @param organizationId - Organization ID to scope the query
 * @param documentType - Document type to determine format
 * @returns Next proposal number info, or null if setup is needed
 */
export async function generateNextProposalNumber(
  organizationId: string,
  documentType?: DocumentType | null
): Promise<string> {
  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  const docType = documentType || 'Proposal';

  // Try to get from config first
  const configResult = await getNextFromConfig(organizationId, docType);

  if (configResult) {
    return configResult.number;
  }

  // Fallback: use default prefix and scan existing proposals
  const prefix = getDocumentTypePrefix(documentType);
  const prefixEscaped = prefix.replace(/[-]/g, '\\-');
  const prefixPattern = new RegExp(`^${prefixEscaped}(\\d+)$`, 'i');

  const { data: proposals } = await supabase
    .from('proposals')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .not('proposal_number', 'is', null);

  let maxNumber = 1000;

  if (proposals) {
    for (const proposal of proposals) {
      if (!proposal.proposal_number) continue;
      const match = proposal.proposal_number.match(prefixPattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  return `${prefix}${maxNumber + 1}`;
}

/**
 * Preview the next proposal number with full details
 * Used by the UI to show users what number will be assigned
 *
 * @returns Full result with config info, or null if no config exists
 */
export async function getNextProposalNumberPreview(
  organizationId: string,
  documentType?: DocumentType | null
): Promise<NextProposalNumberResult | null> {
  if (!organizationId) return null;

  const docType = documentType || 'Proposal';
  const configResult = await getNextFromConfig(organizationId, docType);

  if (configResult) {
    return {
      number: configResult.number,
      nextNumeric: configResult.nextNumeric,
      config: configResult.config,
      isConfigured: true,
    };
  }

  // No config - return fallback preview
  const prefix = getDocumentTypePrefix(documentType);
  const prefixEscaped = prefix.replace(/[-]/g, '\\-');
  const prefixPattern = new RegExp(`^${prefixEscaped}(\\d+)$`, 'i');

  const { data: proposals } = await supabase
    .from('proposals')
    .select('proposal_number')
    .eq('organization_id', organizationId)
    .not('proposal_number', 'is', null);

  let maxNumber = 1000;

  if (proposals) {
    for (const proposal of proposals) {
      if (!proposal.proposal_number) continue;
      const match = proposal.proposal_number.match(prefixPattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  }

  const nextNumeric = maxNumber + 1;

  return {
    number: `${prefix}${nextNumeric}`,
    nextNumeric,
    config: { prefix, lastNumber: maxNumber, padding: 0 },
    isConfigured: false,
  };
}

/**
 * Update the organization's numbering config after creating a proposal
 */
export async function updateNumberingAfterCreate(
  organizationId: string,
  documentType: DocumentType,
  usedNumber: number
): Promise<void> {
  await incrementLastNumber(organizationId, documentType, usedNumber);
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
    .select('*, created_by_name')
    .eq('id', proposalId)
    .single();

  if (error) {
    console.error('Error fetching proposal:', error);
    throw new Error(`Failed to fetch proposal: ${error.message}`);
  }

  if (!data) {
    throw new Error('Proposal not found');
  }

  // Map created_by_name to creator_name for consistency with the UI
  // Cast to any to access created_by_name which may not be in the type definition yet
  // const proposalWithCreator = {
  //   ...data as Proposal,
  //   creator_name: (data as any).created_by_name || null,
  // };

  // return proposalWithCreator as any;
  return data as Proposal;
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

  // Fetch organization name for display on proposals
  const { data: orgData } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', membershipData.organization_id)
    .single<{ name: string }>();

  const organizationName = proposalData.organization_name || orgData?.name || null;

  // Use provided proposal number or generate the next one (document-type aware)
  const proposalNumber = proposalData.proposal_number ||
    await generateNextProposalNumber(membershipData.organization_id, documentType);

  // Extract client info from form_data if not provided directly
  const clientInfo = proposalData.form_data?._clientInfo;
  const metadata = proposalData.form_data?._metadata;

  // Create the proposal with the generated number and direct columns
  const insertData: Record<string, any> = {
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
    organization_name: organizationName,
    job_location: proposalData.job_location || clientInfo?.jobLocation || null,
    total_value: proposalData.total_value || null,
    // Document type (inherited from form)
    document_type: documentType,
    is_on_board: proposalData.is_on_board ?? false,
    proposal_source: proposalData.proposal_source || metadata?.proposalSource || null,
  };

  // If a custom created_at is provided (for imports), use it
  if (proposalData.created_at) {
    insertData.created_at = proposalData.created_at;
  }

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
  const updatePayload = { ...updates, updated_at: new Date().toISOString() };

  const { data, error } = await (supabase
    .from('proposals')
    .update(updatePayload)
    .eq('id', proposalId)
    .select()
    .single() as any);

  if (error) {
    console.error('Error updating proposal:', error);
    throw new Error(`Failed to update proposal: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to update proposal: No data returned');
  }

  return data as Proposal;
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
 * Archive a proposal
 */
export async function archiveProposal(proposalId: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) {
    console.error('Error archiving proposal:', error);
    throw new Error(`Failed to archive proposal: ${error.message}`);
  }

  return data;
}

/**
 * Unarchive a proposal
 */
export async function unarchiveProposal(proposalId: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update({
      archived: false,
      archived_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) {
    console.error('Error unarchiving proposal:', error);
    throw new Error(`Failed to unarchive proposal: ${error.message}`);
  }

  return data;
}

/**
 * Set a proposal as the main version in its version group
 */
export async function setMainVersion(
  proposalId: string,
  baseProposalNumber: string
): Promise<void> {
  // First, unset all main versions for this base number
  const { error: resetError } = await supabase
    .from('proposals')
    .update({ is_main_version: false })
    .like('proposal_number', `${baseProposalNumber}%`);

  if (resetError) {
    console.error('Error resetting main versions:', resetError);
    throw new Error(`Failed to reset main versions: ${resetError.message}`);
  }

  // Then set the new main version
  const { error: setError } = await supabase
    .from('proposals')
    .update({ is_main_version: true })
    .eq('id', proposalId);

  if (setError) {
    console.error('Error setting main version:', setError);
    throw new Error(`Failed to set main version: ${setError.message}`);
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
    case 'won':
      updates.won_at = now;
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

  // Fetch user profile to get the creator's name
  const userProfile = await fetchUserProfile(session.user.id);
  const createdByName = userProfile?.full_name || null;

  // Generate the next version number (e.g., SR-1005 → SR-1005.2)
  const versionedNumber = await generateProposalVersion(
    parentProposal.proposal_number,
    parentProposal.organization_id
  );

  // Create the new version (inherits organization_name from parent)
  // IMPORTANT: New versions should NOT be the main version - explicitly set to false
  const insertData = {
    organization_id: parentProposal.organization_id,
    created_by: session.user.id,
    created_by_name: createdByName,
    form_id: parentProposal.form_id,
    proposal_number: versionedNumber, // Contains version in the number itself (e.g., "SR-1005.2")
    form_data: proposalData?.form_data || parentProposal.form_data || {},
    status: proposalData?.status || 'Draft',
    // Inherit organization_name from parent proposal
    organization_name: parentProposal.organization_name,
    // New versions are NOT the main version - the original remains main
    is_main_version: false,
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

/**
 * Delete an entire version group (all versions of a proposal)
 *
 * @param baseProposalNumber - Base proposal number (e.g., "P1001" without version suffix)
 * @param organizationId - Organization ID
 * @returns Number of proposals deleted
 */
export async function deleteVersionGroup(
  baseProposalNumber: string,
  organizationId: string
): Promise<number> {
  // Find all proposals with this base number
  const { data: proposals, error: fetchError } = await supabase
    .from('proposals')
    .select('id')
    .eq('organization_id', organizationId)
    .like('proposal_number', `${baseProposalNumber}%`);

  if (fetchError) {
    console.error('Error fetching version group:', fetchError);
    throw new Error(`Failed to fetch version group: ${fetchError.message}`);
  }

  const typedProposals = proposals as Array<{ id: string }> | null;

  if (!typedProposals || typedProposals.length === 0) {
    return 0;
  }

  const idsToDelete = typedProposals.map(p => p.id);

  const { error: deleteError } = await supabase
    .from('proposals')
    .delete()
    .in('id', idsToDelete);

  if (deleteError) {
    console.error('Error deleting version group:', deleteError);
    throw new Error(`Failed to delete version group: ${deleteError.message}`);
  }

  return idsToDelete.length;
}

/**
 * Delete a single version and handle main version promotion
 *
 * If deleting the main version, promotes the most recent remaining version to main.
 * If this is the only version, simply deletes it.
 *
 * @param proposalId - UUID of the proposal to delete
 * @returns Info about what was deleted and promoted
 */
export async function deleteVersionWithPromotion(
  proposalId: string
): Promise<{ deleted: boolean; promotedId?: string }> {
  // Fetch the proposal to delete
  const proposal = await fetchProposalById(proposalId);

  if (!proposal.proposal_number || !proposal.organization_id) {
    throw new Error('Proposal has no proposal number or organization');
  }

  const versionInfo = parseProposalNumber(proposal.proposal_number);
  const isMainVersion = proposal.is_main_version === true;

  // Get all versions in the group
  const { data: allVersions, error: fetchError } = await supabase
    .from('proposals')
    .select('*')
    .eq('organization_id', proposal.organization_id)
    .like('proposal_number', `${versionInfo.mainNumber}%`)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Error fetching versions:', fetchError);
    throw new Error(`Failed to fetch versions: ${fetchError.message}`);
  }

  const typedVersions = (allVersions || []) as Proposal[];
  const otherVersions = typedVersions.filter(v => v.id !== proposalId);

  // Delete the proposal
  const { error: deleteError } = await supabase
    .from('proposals')
    .delete()
    .eq('id', proposalId);

  if (deleteError) {
    console.error('Error deleting proposal:', deleteError);
    throw new Error(`Failed to delete proposal: ${deleteError.message}`);
  }

  // If this was the main version and there are other versions, promote the most recent
  if (isMainVersion && otherVersions.length > 0) {
    const newMainVersion = otherVersions[0]!; // Most recent (ordered by created_at desc)

    // Use setMainVersion to properly promote
    try {
      await setMainVersion(newMainVersion.id, versionInfo.mainNumber);
    } catch (promoteError) {
      console.error('Error promoting new main version:', promoteError);
      // Don't throw here - deletion succeeded, promotion is best-effort
    }

    return { deleted: true, promotedId: newMainVersion.id };
  }

  return { deleted: true };
}

/**
 * Get version group info for a proposal
 *
 * @param proposalId - UUID of any proposal in the version chain
 * @returns Version group information
 */
export async function getVersionGroupInfo(proposalId: string): Promise<{
  baseNumber: string;
  totalVersions: number;
  isMainVersion: boolean;
  mainVersionId: string | null;
  versions: Array<{ id: string; proposalNumber: string; isMain: boolean }>;
}> {
  const proposal = await fetchProposalById(proposalId);

  if (!proposal.proposal_number || !proposal.organization_id) {
    throw new Error('Proposal has no proposal number or organization');
  }

  const versionInfo = parseProposalNumber(proposal.proposal_number);

  const { data: allVersions, error } = await supabase
    .from('proposals')
    .select('id, proposal_number, is_main_version')
    .eq('organization_id', proposal.organization_id)
    .like('proposal_number', `${versionInfo.mainNumber}%`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching version group:', error);
    throw new Error(`Failed to fetch version group: ${error.message}`);
  }

  type VersionRow = { id: string; proposal_number: string | null; is_main_version: boolean | null };
  const typedVersions = (allVersions || []) as VersionRow[];

  const versions = typedVersions.map(v => ({
    id: v.id,
    proposalNumber: v.proposal_number || '',
    isMain: v.is_main_version === true,
  }));

  const mainVersion = versions.find(v => v.isMain);

  return {
    baseNumber: versionInfo.mainNumber,
    totalVersions: versions.length,
    isMainVersion: proposal.is_main_version === true,
    mainVersionId: mainVersion?.id || null,
    versions,
  };
}
