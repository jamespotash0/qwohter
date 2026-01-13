-- Migration: Add member joined and payment notification types
-- Description: Extends notifications system to support team member joins and billing events

-- =============================================================================
-- 1. Update notifications table type constraint
-- =============================================================================

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  -- Existing types
  'task_assigned',
  'task_due',
  'update_mention',
  'update_reply',
  'general',
  'signature_sent',
  'signature_viewed',
  'signature_signed',
  'proposal_submitted',
  'proposal_won',
  'proposal_rejected',
  'approval_requested',
  'approval_approved',
  'approval_rejected',
  'reminder_due',
  -- NEW: Member events
  'member_joined',
  -- NEW: Payment/Subscription events
  'payment_success',
  'payment_failed',
  'trial_ending',
  'subscription_activated',
  'subscription_canceled',
  'subscription_renewed',
  'seat_count_changed'
));

-- =============================================================================
-- 2. Add notification preference columns for new types
-- =============================================================================

-- Team preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_member_joined BOOLEAN DEFAULT true;

-- Payment/Subscription preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_payment_success BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_payment_failed BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_trial_ending BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_subscription_activated BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_subscription_canceled BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_subscription_renewed BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_on_seat_count_changed BOOLEAN DEFAULT false;

-- =============================================================================
-- 3. Add column comments for documentation
-- =============================================================================

COMMENT ON COLUMN notification_preferences.email_on_member_joined
IS 'Admin/Owner notification when new member joins via invite';

COMMENT ON COLUMN notification_preferences.email_on_payment_success
IS 'Notification when payment is successfully processed';

COMMENT ON COLUMN notification_preferences.email_on_payment_failed
IS 'Notification when payment fails to process';

COMMENT ON COLUMN notification_preferences.email_on_trial_ending
IS 'Notification 3 days before free trial ends';

COMMENT ON COLUMN notification_preferences.email_on_subscription_activated
IS 'Notification when subscription is activated';

COMMENT ON COLUMN notification_preferences.email_on_subscription_canceled
IS 'Notification when subscription is canceled';

COMMENT ON COLUMN notification_preferences.email_on_subscription_renewed
IS 'Notification when subscription renews';

COMMENT ON COLUMN notification_preferences.email_on_seat_count_changed
IS 'Notification when team seat count changes (disabled by default)';
