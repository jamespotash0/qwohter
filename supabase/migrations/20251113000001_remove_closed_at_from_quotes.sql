/**
 * Remove closed_at column from quotes table
 *
 * The closed_at column was used to track when a quote was finalized (Won or Rejected).
 * This is redundant because we already have won_at and rejected_at columns.
 *
 * This migration:
 * 1. Updates the trigger function to remove closed_at references
 * 2. Removes the index on closed_at
 * 3. Removes the closed_at column
 */

BEGIN;

-- ============================================================================
-- Update trigger function to remove closed_at references
-- ============================================================================

CREATE OR REPLACE FUNCTION track_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Insert transition record
    INSERT INTO quote_status_transitions (
      quote_id,
      organization_id,
      from_status,
      to_status,
      transitioned_by
    ) VALUES (
      NEW.id,
      NEW.organization_id,
      OLD.status,
      NEW.status,
      auth.uid()
    );

    -- Update denormalized timestamp fields on quotes table
    IF NEW.status = 'Submitted' AND NEW.submitted_at IS NULL THEN
      NEW.submitted_at = NOW();
    ELSIF NEW.status = 'Won' THEN
      NEW.won_at = NOW();
      -- removed: NEW.closed_at = NOW();
    ELSIF NEW.status = 'Rejected' THEN
      NEW.rejected_at = NOW();
      -- removed: NEW.closed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION track_quote_status_change IS 'Automatically logs status changes to quote_status_transitions table and updates timestamp fields';

-- ============================================================================
-- Remove index
-- ============================================================================

DROP INDEX IF EXISTS public.idx_quotes_closed_date;

-- ============================================================================
-- Remove column
-- ============================================================================

ALTER TABLE public.quotes
  DROP COLUMN IF EXISTS closed_at;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 *
 * -- Add column back
 * ALTER TABLE public.quotes
 *   ADD COLUMN closed_at TIMESTAMPTZ;
 *
 * -- Recreate index
 * CREATE INDEX idx_quotes_closed_date
 *   ON quotes(organization_id, closed_at DESC)
 *   WHERE closed_at IS NOT NULL;
 *
 * -- Repopulate data (set to won_at or rejected_at)
 * UPDATE public.quotes
 * SET closed_at = COALESCE(won_at, rejected_at)
 * WHERE won_at IS NOT NULL OR rejected_at IS NOT NULL;
 *
 * -- Add comment
 * COMMENT ON COLUMN quotes.closed_at IS
 *   'Timestamp when quote was finalized (Won or Rejected) - used for conversion analytics';
 *
 * -- Restore trigger function with closed_at
 * CREATE OR REPLACE FUNCTION track_quote_status_change()
 * RETURNS TRIGGER AS $$
 * BEGIN
 *   IF NEW.status IS DISTINCT FROM OLD.status THEN
 *     INSERT INTO quote_status_transitions (
 *       quote_id, organization_id, from_status, to_status, transitioned_by
 *     ) VALUES (
 *       NEW.id, NEW.organization_id, OLD.status, NEW.status, auth.uid()
 *     );
 *
 *     IF NEW.status = 'Submitted' AND NEW.submitted_at IS NULL THEN
 *       NEW.submitted_at = NOW();
 *     ELSIF NEW.status = 'Won' THEN
 *       NEW.won_at = NOW();
 *       NEW.closed_at = NOW();
 *     ELSIF NEW.status = 'Rejected' THEN
 *       NEW.rejected_at = NOW();
 *       NEW.closed_at = NOW();
 *     END IF;
 *   END IF;
 *   RETURN NEW;
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * COMMIT;
 */
