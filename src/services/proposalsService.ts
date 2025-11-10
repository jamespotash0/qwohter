/**
 * Proposals Service
 *
 * Centralized service for all proposal-related API calls.
 * Used by React Query hooks for data fetching.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import * as authService from '@/auth/services/authService';
// ============================================================================
// Types
// ============================================================================

export type Proposal = Database['public']['Tables']['proposals']['Row'] & {
  created_by_name?: string; // Joined from profiles table in queries
  // Analytics fields (denormalized from other fields and maintained by triggers)
  total_value?: number | null; // From price_details.final_selling_price
  subtotal?: number | null; // From price_details.subtotal
  margin_percentage?: number | null; // Calculated margin
};

export interface ProposalFilters {
  status?: string;
  search?: string;
  archived?: boolean;
}

export interface CreateProposalData {
  proposal_name?: string;
  form_response_data?: Record<string, any>;
  proposal_status?: string;
  proposal_source?: string;
}

export interface UpdateProposalData {
  proposal_name?: string;
  form_response_data?: Record<string, any>;
  proposal_status?: string;
  date_last_downloaded?: string;
  document_version?: number;
  archived?: boolean;
  total_value?: number;
  subtotal?: number;
  submitted_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  closed_at?: string;
  margin_percentage?: number;
  is_main_version?: boolean;
  proposal_source?: string;
}


// ============================================================================
// Proposal Operations
// ============================================================================

/**
 * Fetch proposals for an organization
 */
export async function fetchProposals(
  userId: string,
  filters?: ProposalFilters
): Promise<Proposal[]> {
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

  let proposalsData: any[] = [];

  if (!userMemberships || userMemberships.length === 0) {
    // User has no memberships, query personal proposals
    let query = supabase
      .from('proposals')
      .select(`
        id, created_by, created_by_name, organization_id, proposal_number, proposal_name,
        quote_details, job_details, delivery_details, labor_details,
        wall_details, price_details, proposal_status, date_last_downloaded,
        document_version, created_at, updated_at, customization,
        quote_source, archived, is_main_version,
        total_value, subtotal,
        submitted_at, accepted_at, rejected_at, closed_at, margin_percentage
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply filters
    if (filters?.archived !== undefined) {
      query = query.eq('archived', filters.archived);
    }
    if (filters?.status) {
      query = query.eq('proposal_status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    proposalsData = data || [];
  } else {
    // User has memberships, let RLS policies handle the query
    let query = supabase
      .from('proposals')
      .select(`
        id, created_by, created_by_name, organization_id, proposal_number, proposal_name,
        quote_details, job_details, delivery_details, labor_details,
        wall_details, price_details, proposal_status, date_last_downloaded,
        document_version, created_at, updated_at, customization,
        quote_source, archived, is_main_version,
        total_value, subtotal,
        submitted_at, accepted_at, rejected_at, closed_at, margin_percentage
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Apply filters
    if (filters?.archived !== undefined) {
      query = query.eq('archived', filters.archived);
    }
    if (filters?.status) {
      query = query.eq('proposal_status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    proposalsData = data || [];
  }

  return proposalsData as Proposal[];
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

  if (error) throw error;
  return data as Proposal;
}

/**
 * Create a new proposal
 */
export async function createProposal(proposalData: CreateProposalData): Promise<Proposal> {
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

  // Create proposal with created_by_name explicitly set
  const insertData = {
    ...proposalData,
    organization_id: membershipData.organization_id,
    created_by: session.user.id,
    created_by_name: createdByName,
  };

  const { data, error } = await supabase
    .from('proposals')
    .insert(insertData as any)
    .select()
    .single();

  if (error) throw error;
  return data as Proposal;
}

// /**
//  * @deprecated Use createProposal instead - kept for backward compatibility
//  */
// export const createProposal

/**
 * Update a proposal
 */
export async function updateProposal(
  proposalId: string,
  updates: UpdateProposalData
): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;
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

  if (error) throw error;
}

/**
 * Archive a proposal
 */
export async function archiveProposal(proposalId: string): Promise<Proposal> {
  return updateProposal(proposalId, { archived: true });
}

/**
 * Unarchive a proposal
 */
export async function unarchiveProposal(proposalId: string): Promise<Proposal> {
  return updateProposal(proposalId, { archived: false });
}

/**
 * Mark proposal as downloaded
 */
export async function markProposalAsDownloaded(proposalId: string): Promise<Proposal> {
  return updateProposal(proposalId, {
    date_last_downloaded: new Date().toISOString(),
  });
}

/**
 * Update proposal status
 */
export async function updateProposalStatus(
  proposalId: string,
  status: string
): Promise<Proposal> {
  const updates: UpdateProposalData = { proposal_status: status };

  // Add timestamp for status transitions
  const now = new Date().toISOString();
  switch (status) {
    case 'Submitted':
      updates.submitted_at = now;
      break;
    case 'Accepted':
    case 'Won': // Support legacy 'Won' for backward compatibility
      updates.accepted_at = now;
      break;
    case 'Rejected':
      updates.rejected_at = now;
      break;
    case 'Closed':
      updates.closed_at = now;
      break;
  }

  return updateProposal(proposalId, updates);
}

/**
 * Create proposal version (duplicate proposal with new proposal number)
 */
export async function createProposalVersion(
  existingProposalId: string,
  newProposalNumber: string,
  versionNumber: number
): Promise<Proposal> {
  // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
  const session = await authService.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Fetch existing proposal (RLS ensures user has access)
  const existingProposal = await fetchProposalById(existingProposalId);

  // Fetch organization details to ensure organization name is available
  const { data: orgData } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', existingProposal.organization_id)
    .maybeSingle();

  // Get user's name from profile to set created_by_name
  const { data: profileData } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  const createdByName = (profileData as any)?.full_name || session.user.email || 'Unknown';

  // Ensure proposal_details has organization name
  const proposalDetails = {
    ...(existingProposal.proposal_details as any || {}),
    organizationName: (existingProposal.proposal_details as any)?.organizationName || (orgData as any)?.name || 'Organization Name Not Available'
  };

  // Create new version with proper user context and organization name
  // RLS policies automatically ensure user has access to this organization
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      ...existingProposal,
      id: undefined,
      proposal_number: newProposalNumber,
      document_version: versionNumber,
      is_main_version: false,
      created_by: session.user.id,
      created_by_name: createdByName,
      organization_id: existingProposal.organization_id,
      proposal_details: proposalDetails,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating proposal version:', error);
    throw new Error(error.message || 'Failed to create proposal version');
  }

  return data as Proposal;
}

/**
 * Set main version for a proposal group
 */
export async function setMainVersion(
  proposalId: string,
  baseProposalNumber: string
): Promise<void> {
  // Get all proposals with the same base proposal number
  const { data: proposals, error: fetchError } = await supabase
    .from('proposals')
    .select('id')
    .like('proposal_number', `${baseProposalNumber}%`);

  if (fetchError) throw fetchError;

  // Update all proposals in the group
  const updates = (proposals || []).map((proposal) =>
    updateProposal(proposal.id, {
      is_main_version: proposal.id === proposalId,
    })
  );

  await Promise.all(updates);
}

/**
 * Save proposal customization settings
 */
export async function saveProposalCustomization(
  proposalId: string,
  customization: any
): Promise<Proposal> {
  return updateProposal(proposalId, { customization });
}

/**
 * Update wall system in proposal
 */
export async function updateWallSystem(
  proposalId: string,
  wallName: string,
  wallData: any
): Promise<Proposal> {
  // Fetch current proposal
  const currentProposal = await fetchProposalById(proposalId);

  // Update wall details
  const updatedWallDetails = {
    ...currentProposal.wall_details,
    walls: {
      ...(currentProposal.wall_details as any).walls,
      [wallName]: wallData,
    },
  };

  return updateProposal(proposalId, { wall_details: updatedWallDetails });
}

/**
 * Remove wall system from proposal
 */
export async function removeWallSystem(
  proposalId: string,
  wallName: string
): Promise<Proposal> {
  // Fetch current proposal
  const currentProposal = await fetchProposalById(proposalId);

  // Remove wall from details
  const walls = { ...(currentProposal.wall_details as any).walls };
  delete walls[wallName];

  const updatedWallDetails = {
    ...currentProposal.wall_details,
    walls,
  };

  return updateProposal(proposalId, { wall_details: updatedWallDetails });
}

/**
 * Add wall system to proposal
 */
export async function addWallSystem(
  proposalId: string,
  wallName: string,
  wallData: any
): Promise<Proposal> {
  return updateWallSystem(proposalId, wallName, wallData);
}
