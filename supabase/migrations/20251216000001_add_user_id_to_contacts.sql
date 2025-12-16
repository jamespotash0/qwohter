-- ============================================================================
-- Migration: Add user_id to contacts table
-- ============================================================================
-- Allows linking a contact to their user account when they become a team member.
-- This prevents duplicate entries when a contact is also an organization member.
-- ============================================================================

-- Add user_id column (nullable - only set when contact becomes a member)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_contacts_user_id
ON public.contacts(user_id);

-- Add comment
COMMENT ON COLUMN public.contacts.user_id IS 'Links to user account if contact becomes a team member';
