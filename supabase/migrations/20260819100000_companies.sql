-- Companies
--
-- Back-office foundation. Today `contacts` models people only (full_name,
-- emails, phones), with no account behind them, so there is nowhere to hang a
-- bill-to address, payment terms, or tax status. The account a dealer sells to
-- becomes first-class:
--
--   companies  who you sell to  (bill-to, ship-to, terms, tax status)
--
-- Decisions baked in:
--   * contacts stay people. A contact optionally belongs to a company.
--   * There is deliberately no matching table for who you BUY from. Dealers
--     place orders in each manufacturer's own portal, not from here, so an
--     address book for a letter that never gets sent would be pure setup cost.
--     Manufacturers and series travel as text on the line, exactly as the
--     specification tool spelled them.
--   * Nothing here references a product catalog: specification tools already
--     resolve part numbers, options, and list price, so maintaining catalog
--     hierarchy would be a permanent cost with nothing to show for it.

-- ============================================================================
-- companies  (the customer account you sell to)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  -- Legal entity name when it differs from the trading name (used on invoices).
  legal_name text,
  company_type text NOT NULL DEFAULT 'Customer'
    CHECK (company_type IN ('Customer', 'Prospect', 'Partner', 'Other')),

  -- Bill-to
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text DEFAULT 'US',

  -- Default ship-to. Individual orders may override; this is the fallback.
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text DEFAULT 'US',

  phone text,
  website text,

  -- Commercial terms
  payment_terms text DEFAULT 'Net 30',
  tax_exempt boolean NOT NULL DEFAULT false,
  tax_exempt_certificate text,
  -- Overrides the state-derived rate when set (some jurisdictions/contracts differ).
  default_tax_rate numeric CHECK (default_tax_rate IS NULL OR default_tax_rate >= 0),

  primary_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  -- Customer id in the accounting system, so invoices post to the right account.
  external_accounting_id text,

  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_org
  ON public.companies (organization_id);
-- Supports the company picker: active companies for an org, alphabetical.
CREATE INDEX IF NOT EXISTS idx_companies_org_active_name
  ON public.companies (organization_id, is_active, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_name_unique
  ON public.companies (organization_id, lower(name));

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view companies" ON public.companies;
CREATE POLICY "Members can view companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert companies" ON public.companies;
CREATE POLICY "Members can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can update companies" ON public.companies;
CREATE POLICY "Members can update companies"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id))
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Deleting a customer account cascades into order history, so it stays with
-- Owner/Admin. Everyone else deactivates instead.
DROP POLICY IF EXISTS "Admin can delete companies" ON public.companies;
CREATE POLICY "Admin can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- contacts.company_id  (a person belongs to a company)
-- ============================================================================
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_company
  ON public.contacts (company_id) WHERE company_id IS NOT NULL;

COMMENT ON COLUMN public.contacts.company_id IS
  'Optional employer. Contacts remain people; companies are the account. Supersedes the free-text contacts.company_name, which is retained as the pre-migration value and as the fallback label for contacts not yet linked to a company.';
