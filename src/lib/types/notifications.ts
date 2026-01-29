/**
 * Notification Types
 *
 * Type definitions for the notifications system
 */

export type NotificationType =
  // Existing types
  | 'task_assigned'
  | 'task_due'
  | 'task_reminder'
  | 'update_mention'
  | 'update_reply'
  | 'general'
  // Signature events
  | 'signature_sent'
  | 'signature_viewed'
  | 'signature_signed'
  // Proposal events
  | 'proposal_submitted'
  | 'proposal_won'
  | 'proposal_rejected'
  // Approval events
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  // Reminder events
  | 'reminder_due'
  // Member events
  | 'member_joined';

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  metadata: NotificationMetadata;
  created_at: string;
}

export interface NotificationMetadata {
  task_id?: string;
  task_reference?: string;
  project_id?: string;
  update_id?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  proposal_id?: string;
  proposal_number?: string;
  signer_name?: string;
  signer_email?: string;
  from_status?: string;
  to_status?: string;
  reminder_id?: string;
  reminder_type?: string;
  due_date?: string;
  priority?: string;
  // Member joined
  member_id?: string;
  member_name?: string;
  member_email?: string;
  member_role?: string;
  [key: string]: unknown;
}

export interface CreateNotificationInput {
  user_id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: NotificationMetadata;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_due: 'Task Due',
  task_reminder: 'Task Reminder',
  update_mention: 'Mentioned',
  update_reply: 'Reply',
  general: 'Notification',
  signature_sent: 'Signature Requested',
  signature_viewed: 'Document Viewed',
  signature_signed: 'Document Signed',
  proposal_submitted: 'Proposal Submitted',
  proposal_won: 'Proposal Won',
  proposal_rejected: 'Proposal Rejected',
  approval_requested: 'Approval Requested',
  approval_approved: 'Proposal Approved',
  approval_rejected: 'Approval Rejected',
  reminder_due: 'Reminder Due',
  // Member events
  member_joined: 'Member Joined',
};

// =============================================================================
// Notification Preferences Types
// =============================================================================

export type DeliveryChannel = 'email' | 'sms' | 'both';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  organization_id: string;

  // Delivery settings
  email_enabled: boolean;
  sms_enabled: boolean;
  sms_phone?: string | null;
  notification_email?: string | null;

  // Signature events
  email_on_signature_sent: boolean;
  email_on_signature_viewed: boolean;
  email_on_signature_signed: boolean;

  // Proposal events
  email_on_proposal_submitted: boolean;
  email_on_proposal_won: boolean;
  email_on_proposal_rejected: boolean;

  // Team activity
  email_on_mention: boolean;
  email_on_task_assigned: boolean;
  email_on_member_joined: boolean;

  // Reminders & Due Dates
  email_on_reminder_due: boolean;
  email_on_task_due: boolean;
  email_on_task_reminder: boolean;
  sms_on_task_reminder: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  user_id: string;
  organization_id: string;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  sms_phone?: string | null;
  notification_email?: string | null;
  email_on_signature_sent?: boolean;
  email_on_signature_viewed?: boolean;
  email_on_signature_signed?: boolean;
  email_on_proposal_submitted?: boolean;
  email_on_proposal_won?: boolean;
  email_on_proposal_rejected?: boolean;
  email_on_mention?: boolean;
  email_on_task_assigned?: boolean;
  email_on_member_joined?: boolean;
  email_on_reminder_due?: boolean;
  email_on_task_due?: boolean;
  email_on_task_reminder?: boolean;
  sms_on_task_reminder?: boolean;
}

// Default preferences for new users - all notifications OFF by default
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  email_enabled: false,
  sms_enabled: false,
  sms_phone: null,
  notification_email: null,
  email_on_signature_sent: false,
  email_on_signature_viewed: false,
  email_on_signature_signed: false,
  email_on_proposal_submitted: false,
  email_on_proposal_won: false,
  email_on_proposal_rejected: false,
  email_on_mention: false,
  email_on_task_assigned: false,
  email_on_member_joined: false,
  email_on_reminder_due: false,
  email_on_task_due: false,
  email_on_task_reminder: false,
  sms_on_task_reminder: false,
};

// =============================================================================
// Email Notification Queue Types
// =============================================================================

export type EmailQueueStatus = 'pending' | 'sent' | 'failed';

export interface EmailNotificationQueue {
  id: string;
  user_id: string;
  organization_id: string;
  notification_type: NotificationType;
  subject: string;
  body_html: string;
  body_text?: string;
  metadata: Record<string, unknown>;
  status: EmailQueueStatus;
  scheduled_for: string;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}
