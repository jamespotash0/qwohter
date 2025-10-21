-- Update reminders table to reference profiles instead of auth.users
-- This allows us to use foreign key joins with profiles table

-- Drop existing foreign key constraints
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_created_by_fkey;
ALTER TABLE reminders DROP CONSTRAINT IF EXISTS reminders_completed_by_fkey;

-- Add new foreign key constraints to profiles table
ALTER TABLE reminders
  ADD CONSTRAINT reminders_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE reminders
  ADD CONSTRAINT reminders_completed_by_fkey
  FOREIGN KEY (completed_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;
