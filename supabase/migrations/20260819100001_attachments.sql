-- Polymorphic attachments
--
-- Back-office paperwork does not belong to a project or a proposal — it belongs
-- to the specific thing it documents. An acknowledgment attaches to the purchase
-- order it acknowledges; a packing slip and damage photos attach to the receipt;
-- a signed delivery ticket attaches to the work order. When a dealer disputes a
-- line with a manufacturer, "which PO was this against" is the whole question.
--
-- Superseded note: this migration originally left project_attachments in place.
-- 20260819100002_consolidate_attachments.sql folds it into this table
-- (entity_type = 'project') and drops it, so `attachments` is the only file
-- table from that point on.
--
-- Decisions baked in:
--   * entity_id carries no foreign key — that is the cost of a polymorphic
--     table. entity_type is constrained so a typo cannot silently orphan a file,
--     and deletes of a parent must clean up here explicitly.
--   * document_type describes what the paper IS, separately from what it hangs
--     off. The same acknowledgment PDF is an 'acknowledgment' whether it lands
--     on a PO or on an order line.
--   * Files live in the existing private 'projects-attachments' bucket and are
--     served through signed URLs, matching projectAttachmentsService.

CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What this file hangs off. No FK: the target table varies by row.
  entity_type text NOT NULL
    CHECK (entity_type IN (
      'project',
      'proposal',
      'company',
      'vendor',
      'sales_order',
      'order_line',
      'vendor_po',
      'acknowledgment',
      'receipt',
      'work_order',
      'punch_item'
    )),
  entity_id uuid NOT NULL,

  -- What the file is, independent of what it is attached to.
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN (
      'acknowledgment',
      'packing_slip',
      'bill_of_lading',
      'damage_photo',
      'vendor_invoice',
      'customer_invoice',
      'quote',
      'drawing',
      'specification',
      'spec_file',
      'photo',
      'contract',
      'other'
    )),

  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  description text,

  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The dominant read: everything attached to one thing, newest first.
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_org
  ON public.attachments (organization_id);
-- Supports "every acknowledgment awaiting review" style sweeps.
CREATE INDEX IF NOT EXISTS idx_attachments_org_doctype
  ON public.attachments (organization_id, document_type, created_at DESC);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Warehouse and field staff have to be able to attach a damage photo or a
-- signed delivery ticket, so read and write are open to active members. The
-- documents themselves carry no margin data; discounts and cost live elsewhere.
DROP POLICY IF EXISTS "Members can view attachments" ON public.attachments;
CREATE POLICY "Members can view attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (public.is_active_member((SELECT auth.uid()), organization_id));

DROP POLICY IF EXISTS "Members can insert attachments" ON public.attachments;
CREATE POLICY "Members can insert attachments"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member((SELECT auth.uid()), organization_id));

-- Editing the description of someone else's upload is an admin action; your own
-- upload is yours to correct.
DROP POLICY IF EXISTS "Uploader or admin can update attachments" ON public.attachments;
CREATE POLICY "Uploader or admin can update attachments"
  ON public.attachments FOR UPDATE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  )
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  );

-- Deleting evidence in a vendor dispute is consequential. Same rule as update.
DROP POLICY IF EXISTS "Uploader or admin can delete attachments" ON public.attachments;
CREATE POLICY "Uploader or admin can delete attachments"
  ON public.attachments FOR DELETE TO authenticated
  USING (
    uploaded_by = (SELECT auth.uid())
    OR public.has_org_role((SELECT auth.uid()), organization_id, ARRAY['Owner'::text, 'Admin'::text])
  );

DROP TRIGGER IF EXISTS set_attachments_updated_at ON public.attachments;
CREATE TRIGGER set_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.attachments IS
  'Polymorphic file attachments for back-office entities. entity_id has no foreign key; parent deletes must clean up here explicitly.';
COMMENT ON COLUMN public.attachments.entity_id IS
  'Id of the row named by entity_type. Deliberately unconstrained — validate in application code.';
COMMENT ON COLUMN public.attachments.file_path IS
  'Path within the private projects-attachments storage bucket. Served via signed URLs.';
