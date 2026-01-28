-- ============================================================================
-- App-Side Task Reference Generation
-- ============================================================================
-- Since references are now generated app-side with retry logic (like proposals),
-- the database trigger should only generate if reference is NULL.
-- This prevents conflicts when app provides the reference.

BEGIN;

-- Update the trigger function to be a no-op when reference is already set
CREATE OR REPLACE FUNCTION auto_generate_task_reference()
RETURNS TRIGGER AS $$
BEGIN
  -- Reference is generated app-side with retry logic
  -- Only fallback to database generation if somehow NULL
  IF NEW.reference IS NULL OR NEW.reference = '' THEN
    -- Simple fallback: use a UUID prefix if somehow no reference was provided
    NEW.reference := 'TSK-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_generate_task_reference() IS
  'Fallback reference generation - primary generation is app-side with retry';

COMMIT;
