/**
 * Proposal Approval Service
 * Handles the approval workflow for proposals when require_proposal_approval is enabled
 */

import { supabase } from '@/integrations/supabase/client';

export interface ApprovalRequest {
  id: string;
  proposal_id: string;
  organization_id: string;
  requested_by: string;
  requested_at: string;
  responded_by: string | null;
  responded_at: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  request_comment: string | null;
  response_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApprovalRequestData {
  proposalId: string;
  organizationId: string;
  requestedBy: string;
  comment?: string;
}

/**
 * Check if organization requires proposal approval
 */
export async function checkApprovalRequired(organizationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organizations')
    .select('require_proposal_approval')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('[checkApprovalRequired] Error:', error);
    return false;
  }

  return data?.require_proposal_approval ?? false;
}

/**
 * Create an approval request for a proposal
 * Changes proposal status to "Pending Approval"
 */
export async function requestApproval(data: CreateApprovalRequestData): Promise<{
  success: boolean;
  approvalRequest?: ApprovalRequest;
  error?: string;
}> {
  try {
    // Start a transaction-like operation
    // 1. Update proposal status to "Pending Approval"
    const { error: proposalError } = await supabase
      .from('proposals')
      .update({
        status: 'Pending Approval',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.proposalId);

    if (proposalError) {
      throw new Error(`Failed to update proposal status: ${proposalError.message}`);
    }

    // 2. Create approval request record
    const { data: approvalRequest, error: approvalError } = await supabase
      .from('proposal_approval_requests')
      .insert({
        proposal_id: data.proposalId,
        organization_id: data.organizationId,
        requested_by: data.requestedBy,
        request_comment: data.comment || null,
        status: 'Pending',
      })
      .select()
      .single();

    if (approvalError) {
      // Rollback proposal status
      await supabase
        .from('proposals')
        .update({ status: 'Draft' })
        .eq('id', data.proposalId);
      throw new Error(`Failed to create approval request: ${approvalError.message}`);
    }

    // 3. Send notifications to Admins/Owners (non-blocking)
    notifyAdminsOfApprovalRequest(data.organizationId, data.proposalId, data.requestedBy).catch(
      (err) => console.error('[requestApproval] Notification error:', err)
    );

    return { success: true, approvalRequest };
  } catch (error) {
    console.error('[requestApproval] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Approve a pending approval request
 * Changes proposal status to "Submitted"
 */
export async function approveProposal(
  approvalRequestId: string,
  respondedBy: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get the approval request to find the proposal
    const { data: request, error: fetchError } = await supabase
      .from('proposal_approval_requests')
      .select('proposal_id, requested_by, organization_id')
      .eq('id', approvalRequestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Approval request not found');
    }

    // 2. Update the approval request
    const { error: updateError } = await supabase
      .from('proposal_approval_requests')
      .update({
        status: 'Approved',
        responded_by: respondedBy,
        responded_at: new Date().toISOString(),
        response_comment: comment || null,
      })
      .eq('id', approvalRequestId);

    if (updateError) {
      throw new Error(`Failed to update approval request: ${updateError.message}`);
    }

    // 3. Update proposal status to "Submitted"
    const now = new Date().toISOString();
    const { error: proposalError } = await supabase
      .from('proposals')
      .update({
        status: 'Submitted',
        submitted_at: now,
        updated_at: now,
      })
      .eq('id', request.proposal_id);

    if (proposalError) {
      throw new Error(`Failed to update proposal status: ${proposalError.message}`);
    }

    // 4. Notify the requester (non-blocking)
    notifyRequesterOfApprovalResult(
      request.requested_by,
      request.proposal_id,
      request.organization_id,
      'approved',
      respondedBy
    ).catch((err) => console.error('[approveProposal] Notification error:', err));

    return { success: true };
  } catch (error) {
    console.error('[approveProposal] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Reject a pending approval request
 * Changes proposal status back to "Draft"
 */
export async function rejectProposal(
  approvalRequestId: string,
  respondedBy: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get the approval request
    const { data: request, error: fetchError } = await supabase
      .from('proposal_approval_requests')
      .select('proposal_id, requested_by, organization_id')
      .eq('id', approvalRequestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Approval request not found');
    }

    // 2. Update the approval request
    const { error: updateError } = await supabase
      .from('proposal_approval_requests')
      .update({
        status: 'Rejected',
        responded_by: respondedBy,
        responded_at: new Date().toISOString(),
        response_comment: comment || null,
      })
      .eq('id', approvalRequestId);

    if (updateError) {
      throw new Error(`Failed to update approval request: ${updateError.message}`);
    }

    // 3. Update proposal status back to "Draft"
    const { error: proposalError } = await supabase
      .from('proposals')
      .update({
        status: 'Draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.proposal_id);

    if (proposalError) {
      throw new Error(`Failed to update proposal status: ${proposalError.message}`);
    }

    // 4. Notify the requester (non-blocking)
    notifyRequesterOfApprovalResult(
      request.requested_by,
      request.proposal_id,
      request.organization_id,
      'rejected',
      respondedBy,
      comment
    ).catch((err) => console.error('[rejectProposal] Notification error:', err));

    return { success: true };
  } catch (error) {
    console.error('[rejectProposal] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pending approval requests for an organization
 */
export async function getPendingApprovalRequests(
  organizationId: string
): Promise<ApprovalRequest[]> {
  const { data, error } = await supabase
    .from('proposal_approval_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'Pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getPendingApprovalRequests] Error:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the latest approval request for a proposal
 */
export async function getLatestApprovalRequest(
  proposalId: string
): Promise<ApprovalRequest | null> {
  const { data, error } = await supabase
    .from('proposal_approval_requests')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error('[getLatestApprovalRequest] Error:', error);
    return null;
  }

  return data;
}

// ============================================================================
// Internal notification helpers
// ============================================================================

async function notifyAdminsOfApprovalRequest(
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
    .select('user_id, profiles!inner(email, full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'Active')
    .in('role', ['Owner', 'Admin']);

  if (!admins || admins.length === 0) return;

  // Import notification service
  const { sendNotificationEmail, createInAppNotification } = await import(
    '@/services/notificationService'
  );

  const proposalNumber = proposal?.proposal_number || 'Unknown';
  const requesterName = requester?.full_name || 'A team member';

  // Notify each admin
  for (const admin of admins) {
    const profile = admin.profiles as { email: string | null; full_name: string | null };
    if (!profile?.email) continue;

    // Send email notification
    await sendNotificationEmail({
      notificationType: 'approval_requested',
      recipientEmail: profile.email,
      data: {
        proposalNumber,
        proposalName: proposal?.project_name,
        actorName: requesterName,
        link: `/proposals?id=${proposalId}`,
      },
    });

    // Create in-app notification
    await createInAppNotification({
      userId: admin.user_id,
      organizationId,
      type: 'approval_requested',
      title: 'Approval Request',
      message: `${requesterName} requested approval for proposal ${proposalNumber}`,
      link: `/proposals?id=${proposalId}`,
      metadata: { proposalId, requestedBy },
    });
  }
}

async function notifyRequesterOfApprovalResult(
  requesterId: string,
  proposalId: string,
  organizationId: string,
  result: 'approved' | 'rejected',
  respondedBy: string,
  comment?: string
): Promise<void> {
  // Get proposal details
  const { data: proposal } = await supabase
    .from('proposals')
    .select('proposal_number, project_name')
    .eq('id', proposalId)
    .single();

  // Get responder details
  const { data: responder } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', respondedBy)
    .single();

  // Get requester email
  const { data: requester } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', requesterId)
    .single();

  if (!requester?.email) return;

  const { sendNotificationEmail, createInAppNotification } = await import(
    '@/services/notificationService'
  );

  const proposalNumber = proposal?.proposal_number || 'Unknown';
  const responderName = responder?.full_name || 'An admin';
  const notificationType = result === 'approved' ? 'approval_approved' : 'approval_rejected';

  // Send email
  await sendNotificationEmail({
    notificationType,
    recipientEmail: requester.email,
    data: {
      proposalNumber,
      proposalName: proposal?.project_name,
      actorName: responderName,
      link: `/proposals?id=${proposalId}`,
    },
  });

  // Create in-app notification
  await createInAppNotification({
    userId: requesterId,
    organizationId,
    type: notificationType,
    title: result === 'approved' ? 'Proposal Approved' : 'Proposal Rejected',
    message:
      result === 'approved'
        ? `${responderName} approved proposal ${proposalNumber}. It has been submitted.`
        : `${responderName} rejected proposal ${proposalNumber}.${comment ? ` Reason: ${comment}` : ''}`,
    link: `/proposals?id=${proposalId}`,
    metadata: { proposalId, respondedBy, result },
  });
}
