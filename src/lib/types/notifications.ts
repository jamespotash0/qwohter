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
  | 'member_joined'
  // Payment/Subscription events
  | 'payment_success'
  | 'payment_failed'
  | 'trial_ending'
  | 'subscription_activated'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'seat_count_changed';

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
  // Payment/Subscription
  amount?: number;
  currency?: string;
  plan_name?: string;
  old_seat_count?: number;
  new_seat_count?: number;
  days_remaining?: number;
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
  // Payment/Subscription events
  payment_success: 'Payment Successful',
  payment_failed: 'Payment Failed',
  trial_ending: 'Trial Ending Soon',
  subscription_activated: 'Subscription Activated',
  subscription_canceled: 'Subscription Canceled',
  subscription_renewed: 'Subscription Renewed',
  seat_count_changed: 'Seat Count Changed',
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

  // Payment/Subscription events
  email_on_payment_success: boolean;
  email_on_payment_failed: boolean;
  email_on_trial_ending: boolean;
  email_on_subscription_activated: boolean;
  email_on_subscription_canceled: boolean;
  email_on_subscription_renewed: boolean;
  email_on_seat_count_changed: boolean;

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
  email_on_payment_success?: boolean;
  email_on_payment_failed?: boolean;
  email_on_trial_ending?: boolean;
  email_on_subscription_activated?: boolean;
  email_on_subscription_canceled?: boolean;
  email_on_subscription_renewed?: boolean;
  email_on_seat_count_changed?: boolean;
}

// Default preferences for new users
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  email_enabled: true,
  sms_enabled: false,
  sms_phone: null,
  notification_email: null,
  email_on_signature_sent: true,
  email_on_signature_viewed: true,
  email_on_signature_signed: true,
  email_on_proposal_submitted: true,
  email_on_proposal_won: true,
  email_on_proposal_rejected: false,
  email_on_mention: true,
  email_on_task_assigned: true,
  email_on_member_joined: true,
  email_on_reminder_due: true,
  email_on_task_due: true,
  email_on_task_reminder: true,
  sms_on_task_reminder: false,
  // Payment/Subscription defaults
  email_on_payment_success: true,
  email_on_payment_failed: true,
  email_on_trial_ending: true,
  email_on_subscription_activated: true,
  email_on_subscription_canceled: true,
  email_on_subscription_renewed: true,
  email_on_seat_count_changed: false,
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
