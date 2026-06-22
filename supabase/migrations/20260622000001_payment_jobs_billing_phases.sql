-- Phased billing: payment jobs and billing phases
--
-- Adds the billing layer on top of projects so a won project can be invoiced in
-- phases (e.g. Deposit / Progress / Final) instead of a single invoice:
--
--   project ──1:N── payment_job ──1:N── billing_phase ──1:1── invoice (QuickBooks)
--
-- Decisions baked in:
--   * Phases are configurable N (UI seeds a 3-phase template).
--   * Phase amount can be a percentage of the contract total OR a fixed dollar amount.
--   * Paid status is set manually for now (paid_at); a QuickBooks paid-status pull
--     drops in later without reshaping these tables.
--   * A project may have more than one payment job (change orders / extra scopes).
--
-- Billing data is invoice data, so every table here is Owner/Admin-only, matching
-- quickbooks_desktop_invoice_sync. The edge functions use the service role and
-- bypass RLS.

-- ============================================================================
-- payment_jobs  (a billing plan attached to a project)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NOT unique: a project can have multiple jobs (e.g. a change order).
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main Contract',
  contract_total numeric NOT NULL DEFAULT 0,
  -- Billing contact for the job; resolved from the linked contact when null.
  billing_email text,
  status text NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Complete', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_jobs_project
  ON public.payment_jobs (project_id);
CREATE INDEX IF NOT EXISTS idx_payment_jobs_org
  ON public.payment_jobs (organization_id);

ALTER TABLE public.payment_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can view payment jobs"
  ON public.payment_jobs FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can insert payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can insert payment jobs"
  ON public.payment_jobs FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can update payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can update payment jobs"
  ON public.payment_jobs FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can delete payment jobs" ON public.payment_jobs;
CREATE POLICY "Admin can delete payment jobs"
  ON public.payment_jobs FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_payment_jobs_updated_at ON public.payment_jobs;
CREATE TRIGGER set_payment_jobs_updated_at
  BEFORE UPDATE ON public.payment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- billing_phases  (the N phases under a payment job)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.billing_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_job_id uuid NOT NULL REFERENCES public.payment_jobs(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  -- percent: amount_value is 0-100 of contract_total; fixed: amount_value is dollars.
  amount_type text NOT NULL DEFAULT 'percent'
    CHECK (amount_type IN ('percent', 'fixed')),
  amount_value numeric NOT NULL DEFAULT 0 CHECK (amount_value >= 0),
  -- Dollar amount snapshotted when the phase is invoiced.
  resolved_amount numeric,
  trigger_type text NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'milestone', 'date')),
  trigger_milestone_key text,
  due_date date,
  -- Per-phase billing email override; falls back to the job's billing_email.
  billing_email text,
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Invoiced', 'Sent', 'Paid', 'Overdue', 'Void')),
  invoiced_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_phases_job
  ON public.billing_phases (payment_job_id, sequence);
CREATE INDEX IF NOT EXISTS idx_billing_phases_org
  ON public.billing_phases (organization_id);
-- Supports the follow-up sweep over unpaid, sent phases.
CREATE INDEX IF NOT EXISTS idx_billing_phases_status
  ON public.billing_phases (organization_id, status, due_date);

ALTER TABLE public.billing_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view billing phases" ON public.billing_phases;
CREATE POLICY "Admin can view billing phases"
  ON public.billing_phases FOR SELECT TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can insert billing phases" ON public.billing_phases;
CREATE POLICY "Admin can insert billing phases"
  ON public.billing_phases FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can update billing phases" ON public.billing_phases;
CREATE POLICY "Admin can update billing phases"
  ON public.billing_phases FOR UPDATE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
  WITH CHECK (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP POLICY IF EXISTS "Admin can delete billing phases" ON public.billing_phases;
CREATE POLICY "Admin can delete billing phases"
  ON public.billing_phases FOR DELETE TO authenticated
  USING (public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text]));

DROP TRIGGER IF EXISTS set_billing_phases_updated_at ON public.billing_phases;
CREATE TRIGGER set_billing_phases_updated_at
  BEFORE UPDATE ON public.billing_phases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Re-key quickbooks_desktop_invoice_sync from one-per-proposal to one-per-phase
-- ============================================================================
-- Phased billing means a proposal can have several invoices (one per phase), so
-- the original UNIQUE(quote_id) no longer holds. Uniqueness moves to the phase.

-- Drop the inline UNIQUE constraint on quote_id (default Postgres name).
ALTER TABLE public.quickbooks_desktop_invoice_sync
  DROP CONSTRAINT IF EXISTS quickbooks_desktop_invoice_sync_quote_id_key;

-- Link each invoice to the billing phase it bills. Nullable so the legacy
-- single-invoice path (no phase) still works; SET NULL keeps the QB invoice
-- record if a phase is removed.
ALTER TABLE public.quickbooks_desktop_invoice_sync
  ADD COLUMN IF NOT EXISTS billing_phase_id uuid
    REFERENCES public.billing_phases(id) ON DELETE SET NULL;

-- At most one invoice per phase (partial: legacy phase-less rows are unconstrained).
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_sync_billing_phase
  ON public.quickbooks_desktop_invoice_sync (billing_phase_id)
  WHERE billing_phase_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_sync_quote
  ON public.quickbooks_desktop_invoice_sync (quote_id);
