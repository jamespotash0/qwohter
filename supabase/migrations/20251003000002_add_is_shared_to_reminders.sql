-- Add is_shared column to reminders table
-- When true: visible to entire organization
-- When false: only visible to creator (personal reminder)
ALTER TABLE reminders
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies to handle personal vs shared reminders
DROP POLICY IF EXISTS "Users can view organization reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update organization reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete organization reminders" ON reminders;

-- View policy: see shared reminders OR your own personal reminders
CREATE POLICY "Users can view reminders"
  ON reminders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
    AND (
      is_shared = true OR created_by = auth.uid()
    )
  );

-- Insert policy stays the same (anyone in org can create)
-- (The existing "Users can create organization reminders" policy is fine)

-- Update policy: can update shared reminders OR your own personal reminders
CREATE POLICY "Users can update reminders"
  ON reminders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
    AND (
      is_shared = true OR created_by = auth.uid()
    )
  );

-- Delete policy: can delete shared reminders OR your own personal reminders
CREATE POLICY "Users can delete reminders"
  ON reminders FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM memberships
      WHERE user_id = auth.uid()
    )
    AND (
      is_shared = true OR created_by = auth.uid()
    )
  );

-- Create index for efficient filtering
CREATE INDEX idx_reminders_is_shared ON reminders(is_shared);
CREATE INDEX idx_reminders_created_by_shared ON reminders(created_by, is_shared);
