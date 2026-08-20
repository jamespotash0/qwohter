-- Companies, vendors, and vendor discount agreements
--
-- Back-office foundation. Today `contacts` models people only (full_name,
-- emails, phones) and manufacturers exist as loose strings on a proposal. A
-- purchase order cannot be addressed to a string, so the accounts a dealer
-- transacts with become first-class:
--
--   companies         who you sell to    (bill-to, ship-to, terms, tax status)
--   vendors           who you buy from   (remit-to, order routing, freight terms)
--   vendor_discounts  what you pay them  (discount off list, by series and contract)
--
-- Decisions baked in:
--   * contacts stay people. A contact optionally belongs to a company.
--   * vendors optionally link to product_manufacturers so the catalog hierarchy
--     and the purchasing relationship stay in step without being the same row.
--   * Discounts resolve most-specific-first: series + contract beats series
--     beats contract beats the vendor default. Resolution lives in application
--     code (src/lib/pricing) so quoting and purchasing agree; this table is
--     only storage.
--   * Discount data IS margin data. It is gated behind can_view_cost(), not
--     plain membership — an installer with an account must never read it.

-- ============================================================================
-- can_view_cost  (cost/margin visibility)
-- ============================================================================
-- Introduced here because vendor_discounts is the first table that exposes
-- buy-side numbers. Resolves to Owner/Admin against today's role vocabulary
-- (Owner, Admin, Member); when the back-office roles land (PM, warehouse,
-- installer, AP) this function is the single place that changes.

CREATE OR REPLACE FUNCTION public.can_view_cost(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.memberships
    WHERE user_id = check_user_id
      AND organization_id = check_org_id
      AND role = ANY(ARRAY['Owner'::text, 'Admin'::text])
      AND status = 'Active'
  ) INTO allowed;

  RETURN allowed;
END;
$$;

ALTER FUNCTION public.can_view_cost(uuid, uuid) OWNER TO postgres;
COMMENT ON FUNCTION public.can_view_cost(uuid, uuid) IS
  'Whether a user may see cost and margin figures for an organization. Single source of truth for buy-side visibility. SECURITY DEFINER bypasses RLS.';

REVOKE ALL ON FUNCTION public.can_view_cost(uuid, uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_view_cost(uuid, uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_view_cost(uuid, uuid) TO service_role;

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

-- ============================================================================
-- vendors  (who you buy from)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor_type text NOT NULL DEFAULT 'Manufacturer'
    CHECK (vendor_type IN ('Manufacturer', 'Supplier', 'Subcontractor', 'Freight', 'Other')),

  -- Optional link to the catalog hierarchy. A manufacturer can exist in the
  -- catalog without being a vendor you hold an account with, and vice versa.
  manufacturer_id uuid REFERENCES public.product_manufacturers(id) ON DELETE SET NULL,

  -- The dealer's account number with this vendor; goes on every PO.
  account_number text,

  -- Where purchase orders go and how
  order_method text NOT NULL DEFAULT 'Email'
    CHECK (order_method IN ('Email', 'Portal', 'EDI', 'Fax', 'Phone')),
  order_email text,
  -- Acknowledgments often return to a different inbox than orders are sent from.
  acknowledgment_email text,
  portal_url text,

  -- Remit-to (where payment goes; often not the same as the plant)
  remit_to_name text,
  remit_to_address_line1 text,
  remit_to_address_line2 text,
  remit_to_city text,
  remit_to_state text,
  remit_to_postal_code text,
  remit_to_country text DEFAULT 'US',

  phone text,

  -- Commercial terms
  payment_terms text DEFAULT 'Net 30',
  freight_terms text
    CHECK (freight_terms IS NULL OR freight_terms IN (
      'FOB Origin', 'FOB Destination', 'Prepaid', 'Prepaid and Add', 'Collect'
    )),
  -- Nominal quoted lead time. Real dates come from acknowledgments; this is
  -- only the planning default before an ACK exists.
  standard_lead_time_days integer CHECK (standard_lead_time_days IS NULL OR standard_lead_time_days >= 0),

  -- Manufacturer's rep for this dealer
  rep_name text,
  rep_email text,
  rep_phone text,

  -- Vendor id in the accounting system, so bills post to the right account.
  external_accounting_id text,

  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_org
  ON public.vendors (organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_active_name
  ON public.vendors (organization_id, is_active, name);
CREATE INDEX IF NOT EXISTS idx_vendors_manufacturer
  ON public.vendors (manufacturer_id) WHERE manufacturer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_org_name_unique
  ON public.vendors (organization_id, lower(name));

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Any member may read vendors: a PM needs to know who an order goes to. The
-- money terms on this row are commercial, not margin; discounts live in
-- vendor_discounts, which is gated separately.
DROP POLICY IF EXISTS "Members can view vendors" ON public.vendors;
CREATE POLICY "Members can view vendors"
  ON public.vendors FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Admin can insert vendors" ON public.vendors;
CREATE POLICY "Admin can insert vendors"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can update vendors" ON public.vendors;
CREATE POLICY "Admin can update vendors"
  ON public.vendors FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can delete vendors" ON public.vendors;
CREATE POLICY "Admin can delete vendors"
  ON public.vendors FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_vendors_updated_at ON public.vendors;
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- vendor_discounts  (discount off list, by series and contract vehicle)
-- ============================================================================
-- A dealer's discount from one manufacturer is not a single number. It varies
-- by product series and by the contract the sale runs under (GSA, a purchasing
-- cooperative, or the dealer's standard agreement), and it changes on renewal.
--
-- Rows are matched most-specific-first. A NULL in series_id or contract_vehicle
-- means "applies to anything", so a vendor's blanket discount is one row with
-- both NULL.

CREATE TABLE IF NOT EXISTS public.vendor_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,

  -- NULL = applies to every series from this vendor.
  series_id uuid REFERENCES public.product_series(id) ON DELETE CASCADE,
  -- NULL = applies under any contract. Free text: the set of contract vehicles
  -- is dealer-specific and changes faster than a CHECK constraint should.
  contract_vehicle text,

  -- Discount off manufacturer list, as a percentage. 55 means "55 off",
  -- i.e. a 0.45 multiplier. Stored as the discount rather than the multiplier
  -- to match how agreements are written and how the app's pricing library
  -- (dealerDiscountPercent) reads it.
  discount_percent numeric NOT NULL
    CHECK (discount_percent >= 0 AND discount_percent <= 100),

  effective_from date,
  effective_to date,
  CONSTRAINT vendor_discounts_effective_range
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),

  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The resolution query: everything for a vendor, narrowed by series/contract/date.
CREATE INDEX IF NOT EXISTS idx_vendor_discounts_lookup
  ON public.vendor_discounts (vendor_id, series_id, contract_vehicle);
CREATE INDEX IF NOT EXISTS idx_vendor_discounts_org
  ON public.vendor_discounts (organization_id);

ALTER TABLE public.vendor_discounts ENABLE ROW LEVEL SECURITY;

-- Margin data. Gated on can_view_cost(), not membership.
DROP POLICY IF EXISTS "Cost viewers can view vendor discounts" ON public.vendor_discounts;
CREATE POLICY "Cost viewers can view vendor discounts"
  ON public.vendor_discounts FOR SELECT TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Cost viewers can insert vendor discounts" ON public.vendor_discounts;
CREATE POLICY "Cost viewers can insert vendor discounts"
  ON public.vendor_discounts FOR INSERT TO authenticated
  WITH CHECK (public.can_view_cost((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Cost viewers can update vendor discounts" ON public.vendor_discounts;
CREATE POLICY "Cost viewers can update vendor discounts"
  ON public.vendor_discounts FOR UPDATE TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id))
  WITH CHECK (public.can_view_cost((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Cost viewers can delete vendor discounts" ON public.vendor_discounts;
CREATE POLICY "Cost viewers can delete vendor discounts"
  ON public.vendor_discounts FOR DELETE TO authenticated
  USING (public.can_view_cost((SELECT auth.uid()), organization_id));

DROP TRIGGER IF EXISTS set_vendor_discounts_updated_at ON public.vendor_discounts;
CREATE TRIGGER set_vendor_discounts_updated_at
  BEFORE UPDATE ON public.vendor_discounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
