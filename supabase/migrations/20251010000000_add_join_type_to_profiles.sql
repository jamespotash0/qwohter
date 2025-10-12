-- Add join_type column to profiles table to track how members joined
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS join_type TEXT DEFAULT 'Direct' CHECK (join_type IN ('Invited', 'Requested', 'Direct'));

-- Add comment
COMMENT ON COLUMN profiles.join_type IS 'How the member joined the organization: Invited (sent email invite), Requested (self-requested access), Direct (owner/initial member)';

-- Set existing members to 'Direct' as default
UPDATE profiles
SET join_type = 'Direct'
WHERE join_type IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_join_type ON profiles(join_type);
