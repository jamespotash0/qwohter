/**
 * Notification Types
 *
 * Type definitions for the notifications system
 */

export type NotificationType =
  // Existing types
  | 'task_assigned'
  | 'task_due'
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
  // Reminder events
  | 'reminder_due';

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
  update_mention: 'Mentioned',
  update_reply: 'Reply',
  general: 'Notification',
  signature_sent: 'Signature Requested',
  signature_viewed: 'Document Viewed',
  signature_signed: 'Document Signed',
  proposal_submitted: 'Proposal Submitted',
  proposal_won: 'Proposal Won',
  proposal_rejected: 'Proposal Rejected',
  reminder_due: 'Reminder Due',
};

// =============================================================================
// Notification Preferences Types
// =============================================================================

export type DigestMode = 'instant' | 'daily';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  organization_id: string;

  // Delivery settings
  email_enabled: boolean;
  digest_mode: DigestMode;
  digest_time: string;
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

  // Reminders & Due Dates
  email_on_reminder_due: boolean;
  email_on_task_due: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  user_id: string;
  organization_id: string;
  email_enabled?: boolean;
  digest_mode?: DigestMode;
  digest_time?: string;
  notification_email?: string | null;
  email_on_signature_sent?: boolean;
  email_on_signature_viewed?: boolean;
  email_on_signature_signed?: boolean;
  email_on_proposal_submitted?: boolean;
  email_on_proposal_won?: boolean;
  email_on_proposal_rejected?: boolean;
  email_on_mention?: boolean;
  email_on_task_assigned?: boolean;
  email_on_reminder_due?: boolean;
  email_on_task_due?: boolean;
}

// Default preferences for new users
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  email_enabled: true,
  digest_mode: 'instant',
  digest_time: '09:00:00',
  notification_email: null,
  email_on_signature_sent: true,
  email_on_signature_viewed: true,
  email_on_signature_signed: true,
  email_on_proposal_submitted: true,
  email_on_proposal_won: true,
  email_on_proposal_rejected: false,
  email_on_mention: true,
  email_on_task_assigned: true,
  email_on_reminder_due: true,
  email_on_task_due: true,
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
