-- COMPLETE FIX: Drop the old trigger and function that references status_last_updated
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the problematic trigger
DROP TRIGGER IF EXISTS trg_update_status_timestamp ON quotes;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS update_status_timestamp();

-- Step 3: Done! The other triggers will handle status timestamps correctly
-- (track_quote_status_change already sets submitted_at, won_at, rejected_at, closed_at)
-- Fix: Remove status_last_updated references from database functions
-- Copy and paste this entire SQL into your Supabase SQL Editor and run it

-- Recreate the track_quote_status_change function without status_last_updated
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
      NEW.closed_at = NOW();
    ELSIF NEW.status = 'Rejected' THEN
      NEW.rejected_at = NOW();
      NEW.closed_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
