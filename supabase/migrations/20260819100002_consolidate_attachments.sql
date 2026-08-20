-- Consolidate project_attachments into attachments
--
-- Two tables were storing the same concept — a file in the projects-attachments
-- bucket with name/size/type/uploader metadata — differing only in how the owner
-- was expressed: a hard project_id FK versus a polymorphic entity_type/entity_id
-- pair. `attachments` is a strict superset ('project' is already a valid
-- entity_type), so this is a data migration rather than a redesign.
--
-- No files move. file_path is stored per row, so backfilled rows keep their
-- original {org}/{project_id}/{ts}_{name} paths. The storage RLS policy only
-- checks the first path segment against org membership, so both the old and new
-- path conventions pass unchanged.
--
-- Backfill and drop run in one transaction: if the copy fails, nothing is lost.
--
-- Two behavior changes, both deliberate:
--   * DELETE tightens from "any active member" to "uploader or Owner/Admin".
--     Deleting evidence in a vendor dispute should not be casual.
--   * public_url is not carried over. It has stored '' on every row since the
--     bucket went private; the app overwrites it with a signed URL at read time.

-- ============================================================================
-- 1. document_type gains 'proposal'
-- ============================================================================
-- project_attachments.category includes 'proposal', which has no equivalent in
-- the back-office document types. Add it rather than flattening those rows.

ALTER TABLE public.attachments
  DROP CONSTRAINT IF EXISTS attachments_document_type_check;

ALTER TABLE public.attachments
  ADD CONSTRAINT attachments_document_type_check
  CHECK (document_type IN (
    'acknowledgment',
    'packing_slip',
    'bill_of_lading',
    'damage_photo',
    'vendor_invoice',
    'customer_invoice',
    'quote',
    'proposal',
    'drawing',
    'specification',
    'spec_file',
    'photo',
    'contract',
    'other'
  ));

-- ============================================================================
-- 2. Backfill
-- ============================================================================
-- created_at/updated_at are carried across so file history is preserved rather
-- than every legacy file appearing to have been uploaded at migration time.

INSERT INTO public.attachments (
  id,
  organization_id,
  entity_type,
  entity_id,
  document_type,
  file_name,
  file_path,
  file_size,
  file_type,
  description,
  uploaded_by,
  created_at,
  updated_at
)
SELECT
  pa.id,
  pa.organization_id,
  'project',
  pa.project_id,
  CASE pa.category
    WHEN 'drawing'       THEN 'drawing'
    WHEN 'invoice'       THEN 'customer_invoice'
    WHEN 'photo'         THEN 'photo'
    WHEN 'contract'      THEN 'contract'
    WHEN 'proposal'      THEN 'proposal'
    WHEN 'specification' THEN 'specification'
    ELSE 'other'
  END,
  pa.file_name,
  pa.file_path,
  pa.file_size,
  pa.file_type,
  pa.description,
  -- project_attachments.uploaded_by is NOT NULL, but the user may since have
  -- been deleted; attachments.uploaded_by is ON DELETE SET NULL, so guard it.
  CASE WHEN EXISTS (SELECT 1 FROM auth.users u WHERE u.id = pa.uploaded_by)
       THEN pa.uploaded_by
       ELSE NULL
  END,
  pa.created_at,
  pa.updated_at
FROM public.project_attachments pa
-- Idempotent: re-running the migration must not duplicate rows.
WHERE NOT EXISTS (
  SELECT 1 FROM public.attachments a WHERE a.id = pa.id
);

-- ============================================================================
-- 3. Drop the old table
-- ============================================================================

DROP TABLE IF EXISTS public.project_attachments;

-- The trigger function existed only to stamp updated_at on that table;
-- attachments uses the shared handle_updated_at().
DROP FUNCTION IF EXISTS public.update_project_attachments_updated_at();

COMMENT ON TABLE public.attachments IS
  'Polymorphic file attachments. Supersedes project_attachments, which was folded in on 2026-08-19. entity_id has no foreign key; parent deletes must clean up here explicitly.';
