-- Rename quickbooks_desktop_invoice_sync.quote_id → proposal_id
--
-- The column always referenced proposals(id); "quote" was legacy naming.
-- proposals is the forward model, so the column name should match.
--
-- Guarded so it is safe on both an already-migrated database (column still
-- named quote_id) and a fresh reset (earlier migrations create quote_id first,
-- this renames it) — and a no-op if it has already been renamed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quickbooks_desktop_invoice_sync'
      AND column_name = 'quote_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quickbooks_desktop_invoice_sync'
      AND column_name = 'proposal_id'
  )
  THEN
    ALTER TABLE public.quickbooks_desktop_invoice_sync
      RENAME COLUMN quote_id TO proposal_id;
  END IF;
END $$;

-- Keep the index name consistent with the column.
ALTER INDEX IF EXISTS idx_invoice_sync_quote RENAME TO idx_invoice_sync_proposal;
