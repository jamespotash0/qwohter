-- ============================================================================
-- Migration: Add user_id to contacts for linking to team members
-- ============================================================================
-- Description: Allows linking a contact to their user account when they
-- become a team member. Preserves historical contact data while maintaining
-- the relationship.
-- ============================================================================

-- Add user_id column (nullable - only set when contact becomes a member)
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_contacts_user_id
ON public.contacts(user_id);

-- Create index for checking email matches (using GIN for array search)
CREATE INDEX IF NOT EXISTS idx_contacts_emails_gin
ON public.contacts USING GIN(emails);

-- Add comment
COMMENT ON COLUMN public.contacts.user_id IS 'Links to user account if contact becomes a team member';

-- ============================================================================
-- Helper function to automatically link contacts when member is added
-- ============================================================================

CREATE OR REPLACE FUNCTION link_contact_to_member()
RETURNS TRIGGER AS $$
DECLARE
  member_email TEXT;
  contact_record RECORD;
BEGIN
  -- Get the member's email from profiles table
  SELECT email INTO member_email
  FROM profiles
  WHERE id = NEW.user_id;

  -- Find matching contact by email (case-insensitive)
  FOR contact_record IN
    SELECT id, emails
    FROM contacts
    WHERE organization_id = NEW.organization_id
      AND user_id IS NULL -- Only link unlinked contacts
  LOOP
    -- Check if any of the contact's emails match the member's email
    IF EXISTS (
      SELECT 1
      FROM unnest(contact_record.emails) AS contact_email
      WHERE LOWER(contact_email) = LOWER(member_email)
    ) THEN
      -- Link the contact to the user
      UPDATE contacts
      SET
        user_id = NEW.user_id,
        is_in_organization = TRUE,
        updated_at = NOW()
      WHERE id = contact_record.id;

      -- Log the link
      RAISE NOTICE 'Linked contact % to user %', contact_record.id, NEW.user_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-link contacts when a new membership is created
DROP TRIGGER IF EXISTS trigger_link_contact_to_member ON memberships;
CREATE TRIGGER trigger_link_contact_to_member
  AFTER INSERT ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION link_contact_to_member();

-- ============================================================================
-- One-time migration: Link existing contacts to members
-- ============================================================================

DO $$
DECLARE
  contact_record RECORD;
  member_record RECORD;
BEGIN
  -- Loop through all contacts without a user_id
  FOR contact_record IN
    SELECT id, organization_id, emails
    FROM contacts
    WHERE user_id IS NULL
  LOOP
    -- Find matching member by email in the same organization
    FOR member_record IN
      SELECT m.user_id, p.email
      FROM memberships m
      JOIN profiles p ON p.id = m.user_id
      WHERE m.organization_id = contact_record.organization_id
        AND m.status = 'Active'
    LOOP
      -- Check if any of the contact's emails match the member's email
      IF EXISTS (
        SELECT 1
        FROM unnest(contact_record.emails) AS contact_email
        WHERE LOWER(contact_email) = LOWER(member_record.email)
      ) THEN
        -- Link the contact to the user
        UPDATE contacts
        SET
          user_id = member_record.user_id,
          is_in_organization = TRUE,
          updated_at = NOW()
        WHERE id = contact_record.id;

        RAISE NOTICE 'Linked existing contact % to user %', contact_record.id, member_record.user_id;
        EXIT; -- Exit inner loop once matched
      END IF;
    END LOOP;
  END LOOP;
END $$;
