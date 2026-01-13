-- Migration: Add custom notification email address
-- Description: Allows users to specify a different email for notifications

-- Add notification_email column (nullable - uses profile email if null)
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Comment on the column
COMMENT ON COLUMN notification_preferences.notification_email IS 'Custom email address for notifications. If null, uses the user profile email.';
