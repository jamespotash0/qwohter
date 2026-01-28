-- Migration: Add SMS notification preferences
-- Description: Adds SMS delivery channel support to notification preferences

-- Add SMS columns to notification_preferences table
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_phone TEXT;

-- Add comment for documentation
COMMENT ON COLUMN notification_preferences.sms_enabled IS 'Whether SMS notifications are enabled for this user';
COMMENT ON COLUMN notification_preferences.sms_phone IS 'Phone number for SMS notifications (E.164 format recommended)';
