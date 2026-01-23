/**
 * Update Status Tool
 *
 * Updates a proposal's status (Draft, Submitted, Won, Rejected).
 * Handles approval workflow when organization requires approval and user is a Member.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface UpdateStatusParams {
  proposal_id?: string; // Optional - used in global chat mode to specify which proposal
  status?: string;
  comment?: string; // Optional comment for approval request
}

const VALID_STATUSES = ['Draft', 'Submitted', 'Won', 'Rejected'] as const;
type ProposalStatus = (typeof VALID_STATUSES)[number];

/**
 * Check if organization requires proposal approval
 */
async function checkApprovalRequired(
  supabase: ToolContext['supabase'],
  organizationId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organizations')
    .select('require_proposal_approval')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.warn('[updateStatus] Error checking approval setting:', error);
    return false;
  }

  return data?.require_proposal_approval ?? false;
}

/**
 * Create an approval request and set proposal to "Pending Approval"
 */
async function createApprovalRequest(
  supabase: ToolContext['supabase'],
  proposalId: string,
  organizationId: string,
  userId: string,
  comment?: string
): Promise<{ success: boolean; approvalRequestId?: string; error?: string }> {
  try {
    // 1. Update proposal status to "Pending Approval"
    const { error: proposalError } = await supabase
      .from('proposals')
      .update({
        status: 'Pending Approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId);

    if (proposalError) {
      throw new Error(`Failed to update proposal status: ${proposalError.message}`);
    }

    // 2. Create approval request record
    const { data: approvalRequest, error: approvalError } = await supabase
      .from('proposal_approval_requests')
      .insert({
        proposal_id: proposalId,
        organization_id: organizationId,
        requested_by: userId,
        request_comment: comment || null,
        status: 'Pending',
      })
      .select('id')
      .single();

    if (approvalError) {
      // Rollback proposal status
      await supabase
        .from('proposals')
        .update({ status: 'Draft' })
        .eq('id', proposalId);
      throw new Error(`Failed to create approval request: ${approvalError.message}`);
    }

    // 3. Send notifications to Admins/Owners (fire and forget)
    notifyAdminsOfApprovalRequest(supabase, organizationId, proposalId, userId).catch((err) =>
      console.error('[updateStatus] Notification error:', err)
    );

    return { success: true, approvalRequestId: approvalRequest.id };
  } catch (error) {
    console.error('[updateStatus] createApprovalRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Notify admins of a new approval request
 */
async function notifyAdminsOfApprovalRequest(
  supabase: ToolContext['supabase'],
  organizationId: string,
  proposalId: string,
  requestedBy: string
): Promise<void> {
  // Get proposal details
  const { data: proposal } = await supabase
    .from('proposals')
    .select('proposal_number, project_name')
    .eq('id', proposalId)
    .single();

  // Get requester details
  const { data: requester } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', requestedBy)
    .single();

  // Get all Admins and Owners in the organization
  const { data: admins } = await supabase
    .from('memberships')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('status', 'Active')
    .in('role', ['Owner', 'Admin']);

  if (!admins || admins.length === 0) return;

  const proposalNumber = proposal?.proposal_number || 'Unknown';
  const requesterName = requester?.full_name || 'A team member';

  // Create in-app notifications for each admin
  for (const admin of admins) {
    await supabase.from('notifications').insert({
      user_id: admin.user_id,
      organization_id: organizationId,
      type: 'approval_requested',
      title: 'Approval Request',
      message: `${requesterName} requested approval for proposal ${proposalNumber}`,
      is_read: false,
    });
  }
}

export const updateStatusTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'update_status',
      description:
        'Update a proposal status. ANY status can change to ANY other status directly - there are NO restrictions based on current status. Approval is ONLY required when: 1) changing TO Submitted, 2) user has Member role (not Admin/Owner), 3) organization has approval workflow enabled. Do NOT tell users there are restrictions based on current status - there are none.',
      parameters: {
        type: 'object',
        properties: {
          proposal_id: {
            type: ['string', 'null'],
            description: 'The proposal ID to update. Required when calling from global chat. Use the ID from get_proposals or when user specifies a proposal number.',
          },
          status: {
            type: 'string',
            enum: ['Draft', 'Submitted', 'Won', 'Rejected'],
            description: 'The new status for the proposal',
          },
          comment: {
            type: ['string', 'null'],
            description: 'Optional comment for the approval request (used when submitting requires approval)',
          },
        },
        required: ['status'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false, // Now optional - can come from params or context
    category: 'proposal',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId, proposalId: contextProposalId, userRole } = context;
    const statusParams = params as unknown as UpdateStatusParams;
    const newStatus = statusParams.status;

    // Use proposal_id from params if provided, otherwise fall back to context
    const proposalId = statusParams.proposal_id || contextProposalId;

    if (!proposalId) {
      return { success: false, error: 'Proposal ID is required. Please specify which proposal to update.' };
    }

    if (!newStatus) {
      return { success: false, error: 'Status is required for update_status action' };
    }

    // Validate status
    if (!VALID_STATUSES.includes(newStatus as ProposalStatus)) {
      return {
        success: false,
        error: `Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      };
    }

    // Check if this is a "Submit" action that might require approval
    const isSubmitting = newStatus.toLowerCase() === 'submitted';
    const isMember = userRole === 'Member';

    if (isSubmitting && isMember) {
      // Check if organization requires approval
      const requiresApproval = await checkApprovalRequired(supabase, organizationId);

      if (requiresApproval) {
        console.log('[update_status] Member submitting with approval required - creating approval request');

        // Create approval request instead of directly submitting
        const approvalResult = await createApprovalRequest(
          supabase,
          proposalId!,
          organizationId,
          userId,
          statusParams.comment
        );

        if (!approvalResult.success) {
          return { success: false, error: approvalResult.error };
        }

        // Get proposal details for response
        const { data: proposal } = await supabase
          .from('proposals')
          .select('proposal_number, project_name')
          .eq('id', proposalId)
          .single();

        return {
          success: true,
          data: {
            id: approvalResult.approvalRequestId!,
            title: 'Approval Request Created',
            type: 'approval_request',
            proposal_number: proposal?.proposal_number,
            project_name: proposal?.project_name,
            message: 'Your request to submit this proposal has been sent to an admin for approval.',
          },
        };
      }
    }

    // Standard status update (no approval needed)
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: now,
    };

    // Add appropriate timestamp based on status
    switch (newStatus.toLowerCase()) {
      case 'submitted':
        updatePayload.submitted_at = now;
        break;
      case 'won':
        updatePayload.won_at = now;
        break;
      case 'rejected':
        updatePayload.rejected_at = now;
        break;
    }

    console.log('[update_status] Updating proposal:', proposalId, 'to status:', newStatus);

    const { data: updatedProposal, error: updateError } = await supabase
      .from('proposals')
      .update(updatePayload)
      .eq('id', proposalId)
      .eq('organization_id', organizationId)
      .select('id, proposal_number, project_name, status')
      .single();

    if (updateError) {
      console.error('[update_status] Update failed:', updateError);
      return { success: false, error: `Failed to update status: ${updateError.message}` };
    }

    console.log('[update_status] Status updated successfully:', updatedProposal.status);

    return {
      success: true,
      data: {
        id: updatedProposal.id,
        title: `Status → ${newStatus}`,
        type: 'status',
        proposal_number: updatedProposal.proposal_number,
        project_name: updatedProposal.project_name,
      },
    };
  },
});
