/**
 * Notification Service
 *
 * Service for managing user notifications
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  Notification,
  CreateNotificationInput,
} from '@/lib/types/notifications';

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as unknown as Notification[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.user_id,
      organization_id: input.organization_id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata || {},
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as Notification;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Create a task assignment notification (in-app + email)
 */
export async function notifyTaskAssigned(params: {
  assigneeId: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  assignedByName: string;
}): Promise<Notification> {
  // Create in-app notification
  const notification = await createNotification({
    user_id: params.assigneeId,
    organization_id: params.organizationId,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${params.assignedByName} assigned you a task: "${params.taskTitle}" in ${params.projectName}`,
    link: `/board?project=${params.projectId}`,
    metadata: {
      task_id: params.taskId,
      project_id: params.projectId,
      assigned_by_name: params.assignedByName,
    },
  });

  // Send email notification (async, non-blocking)
  sendTaskAssignedEmail({
    assigneeId: params.assigneeId,
    organizationId: params.organizationId,
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    projectId: params.projectId,
    projectName: params.projectName,
    assignedByName: params.assignedByName,
  }).catch((err) => {
    console.error('[notifyTaskAssigned] Email failed:', err);
  });

  return notification;
}

/**
 * Send email notification for task assignments
 * Calls the send-notification-email edge function
 */
async function sendTaskAssignedEmail(params: {
  assigneeId: string;
  organizationId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  assignedByName: string;
}): Promise<void> {
  try {
    // Get assignee's email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', params.assigneeId)
      .single<{ email: string | null; full_name: string | null }>();

    if (!profile?.email) {
      console.warn('[sendTaskAssignedEmail] Assignee has no email');
      return;
    }

    const recipientName = profile.full_name || 'User';

    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        userId: params.assigneeId,
        organizationId: params.organizationId,
        notificationType: 'task_assigned',
        recipientEmail: profile.email,
        recipientName,
        data: {
          taskTitle: params.taskTitle,
          projectName: params.projectName,
          actorName: params.assignedByName,
          link: `/board?project=${params.projectId}`,
        },
      },
    });

    if (error) {
      console.error('[sendTaskAssignedEmail] Edge function error:', error);
    }
  } catch (err) {
    console.error('[sendTaskAssignedEmail] Failed to send email:', err);
  }
}

/**
 * Send email notification for proposal status changes
 * Calls the send-notification-email edge function
 */
export async function sendProposalStatusEmail(params: {
  userId: string;
  organizationId: string;
  recipientEmail: string;
  recipientName: string;
  notificationType: 'proposal_won' | 'proposal_rejected' | 'proposal_submitted';
  proposalNumber: string;
  proposalName?: string;
  proposalId: string;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        userId: params.userId,
        organizationId: params.organizationId,
        notificationType: params.notificationType,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        data: {
          proposalNumber: params.proposalNumber,
          proposalName: params.proposalName,
          link: `/proposals/${params.proposalId}`,
        },
      },
    });

    if (error) {
      console.error('[sendProposalStatusEmail] Edge function error:', error);
      // Don't throw - email failures shouldn't break the status update
    }
  } catch (err) {
    console.error('[sendProposalStatusEmail] Failed to send email:', err);
    // Don't throw - email failures shouldn't break the status update
  }
}

/**
 * Create an in-app notification for proposal status changes
 */
export async function notifyProposalStatusChange(params: {
  userId: string;
  organizationId: string;
  proposalId: string;
  proposalNumber: string;
  proposalName?: string;
  newStatus: 'Won' | 'Rejected' | 'Submitted';
}): Promise<Notification> {
  const statusMessages = {
    Won: {
      title: 'Proposal Won!',
      message: `Congratulations! Proposal ${params.proposalNumber}${params.proposalName ? ` (${params.proposalName})` : ''} has been marked as won.`,
    },
    Rejected: {
      title: 'Proposal Rejected',
      message: `Proposal ${params.proposalNumber}${params.proposalName ? ` (${params.proposalName})` : ''} has been marked as rejected.`,
    },
    Submitted: {
      title: 'Proposal Submitted',
      message: `Proposal ${params.proposalNumber}${params.proposalName ? ` (${params.proposalName})` : ''} has been submitted.`,
    },
  };

  const notificationTypes = {
    Won: 'proposal_won',
    Rejected: 'proposal_rejected',
    Submitted: 'proposal_submitted',
  } as const;

  const { title, message } = statusMessages[params.newStatus];

  return createNotification({
    user_id: params.userId,
    organization_id: params.organizationId,
    type: notificationTypes[params.newStatus],
    title,
    message,
    link: `/proposals/${params.proposalId}`,
    metadata: {
      proposal_id: params.proposalId,
      proposal_number: params.proposalNumber,
      to_status: params.newStatus,
    },
  });
}

// =============================================================================
// Member Joined Notifications
// =============================================================================

interface MemberJoinedNotificationParams {
  organizationId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberRole: string;
}

interface AdminWithProfile {
  user_id: string;
  profiles: { email: string | null; full_name: string | null };
}

/**
 * Notify Admins and Owners when a new member joins via invitation
 */
export async function notifyMemberJoined(
  params: MemberJoinedNotificationParams
): Promise<void> {
  try {
    // Get all Admins and Owners in the organization
    const { data, error: fetchError } = await supabase
      .from('memberships')
      .select('user_id, profiles!inner(email, full_name)')
      .eq('organization_id', params.organizationId)
      .eq('status', 'Active')
      .or('role.eq.Owner,role.eq.Admin');

    if (fetchError) {
      console.error('[notifyMemberJoined] Failed to fetch admins:', fetchError);
      return;
    }

    const admins = data as unknown as AdminWithProfile[] | null;

    if (!admins || admins.length === 0) {
      console.log('[notifyMemberJoined] No admins/owners to notify');
      return;
    }

    // Create notifications for each admin/owner
    for (const admin of admins) {
      // Skip notifying the new member themselves if they're an admin
      if (admin.user_id === params.memberId) continue;

      // Create in-app notification
      await createNotification({
        user_id: admin.user_id,
        organization_id: params.organizationId,
        type: 'member_joined',
        title: 'New Team Member',
        message: `${params.memberName} (${params.memberEmail}) has joined as ${params.memberRole}`,
        link: '/settings?tab=team',
        metadata: {
          member_id: params.memberId,
          member_name: params.memberName,
          member_email: params.memberEmail,
          member_role: params.memberRole,
        },
      });

      // Send email notification (non-blocking)
      if (admin.profiles?.email) {
        sendMemberJoinedEmail({
          recipientId: admin.user_id,
          recipientEmail: admin.profiles.email,
          recipientName: admin.profiles.full_name || 'Admin',
          organizationId: params.organizationId,
          memberName: params.memberName,
          memberEmail: params.memberEmail,
          memberRole: params.memberRole,
        }).catch((err) => {
          console.error('[notifyMemberJoined] Email failed:', err);
        });
      }
    }
  } catch (err) {
    console.error('[notifyMemberJoined] Error:', err);
  }
}

/**
 * Send email notification for member joined events
 */
async function sendMemberJoinedEmail(params: {
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  organizationId: string;
  memberName: string;
  memberEmail: string;
  memberRole: string;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: {
        userId: params.recipientId,
        organizationId: params.organizationId,
        notificationType: 'member_joined',
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        data: {
          memberName: params.memberName,
          memberEmail: params.memberEmail,
          memberRole: params.memberRole,
          link: '/settings?tab=team',
        },
      },
    });

    if (error) {
      console.error('[sendMemberJoinedEmail] Edge function error:', error);
    }
  } catch (err) {
    console.error('[sendMemberJoinedEmail] Failed to send email:', err);
  }
}
