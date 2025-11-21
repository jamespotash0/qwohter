-- ============================================================================
-- CREATE CONTACTS TABLE
-- ============================================================================
-- Purpose: Store customer/prospect contacts (non-user accounts) for quotes
-- Allows organizations to maintain a contact directory separate from users
-- ============================================================================

-- Table: contacts (depends on organizations)
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  emails TEXT[] NOT NULL, -- Array of email addresses (at least one required)
  phones TEXT[], -- Array of phone numbers
  company_name TEXT,
  contact_type TEXT, -- Lead, Customer, Vendor, Partner, Contractor, Architect, etc.
  addresses TEXT[], -- Array of addresses
  notes TEXT,
  is_in_organization BOOLEAN NOT NULL DEFAULT false, -- Whether contact is in the organization
  created_by UUID NOT NULL, -- The user who created this contact
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT contacts_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES profiles (id) ON DELETE SET NULL,
  -- Ensure at least one email is provided
  CONSTRAINT contacts_emails_not_empty CHECK (array_length(emails, 1) > 0)
);

-- Index for fast lookups by organization
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id
  ON public.contacts(organization_id);

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_contacts_full_name
  ON public.contacts(full_name);

-- Index for filtering by contact type
CREATE INDEX IF NOT EXISTS idx_contacts_type
  ON public.contacts(contact_type);

-- Trigger: Update updated_at timestamp
CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view contacts in their organization
CREATE POLICY "contacts_select_policy"
  ON public.contacts
  FOR SELECT
  USING (
    is_active_member(auth.uid(), organization_id)
  );

-- Policy: Members can insert contacts in their organization
CREATE POLICY "contacts_insert_policy"
  ON public.contacts
  FOR INSERT
  WITH CHECK (
    is_active_member(auth.uid(), organization_id)
  );

-- Policy: Members can update contacts in their organization
CREATE POLICY "contacts_update_policy"
  ON public.contacts
  FOR UPDATE
  USING (
    is_active_member(auth.uid(), organization_id)
  );

-- Policy: Only Admins and Owners can delete contacts
CREATE POLICY "contacts_delete_policy"
  ON public.contacts
  FOR DELETE
  USING (
    has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner'])
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.contacts IS 'Customer/prospect contacts for organizations (non-user accounts)';
COMMENT ON COLUMN public.contacts.organization_id IS 'Organization this contact belongs to';
COMMENT ON COLUMN public.contacts.full_name IS 'Contact full name';
COMMENT ON COLUMN public.contacts.emails IS 'Array of contact email addresses (at least one required)';
COMMENT ON COLUMN public.contacts.phones IS 'Array of contact phone numbers (optional)';
COMMENT ON COLUMN public.contacts.company_name IS 'Company name of the contact (optional)';
COMMENT ON COLUMN public.contacts.contact_type IS 'Type of contact: Lead, Customer, Vendor, Partner, Contractor, Architect, etc.';
COMMENT ON COLUMN public.contacts.addresses IS 'Array of physical addresses (optional)';
COMMENT ON COLUMN public.contacts.notes IS 'Additional notes about this contact';
COMMENT ON COLUMN public.contacts.is_in_organization IS 'Whether this contact is in the organization (internal contact)';
COMMENT ON COLUMN public.contacts.created_by IS 'User who created this contact';
