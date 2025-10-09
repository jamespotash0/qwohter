-- Backfill analytics fields and historical data

-- Step 1: Update existing quotes with denormalized fields
UPDATE quotes
SET
  total_value = (price_details->>'final_selling_price')::DECIMAL,
WHERE price_details IS NOT NULL OR job_details IS NOT NULL;

-- Step 2: Create initial status transitions for existing quotes
-- This creates a baseline transition for each quote's current status
INSERT INTO quote_status_transitions (quote_id, organization_id, from_status, to_status, transitioned_at)
SELECT
  id,
  organization_id,
  NULL AS from_status,  -- No previous status (initial state)
  status AS to_status,
  COALESCE(status_last_updated, created_at) AS transitioned_at
FROM quotes
WHERE status IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 3: Update timestamp fields based on current status
UPDATE quotes
SET
  submitted_at = CASE WHEN status IN ('Submitted', 'Won', 'Rejected') THEN COALESCE(status_last_updated, created_at) ELSE NULL END,
  won_at = CASE WHEN status = 'Won' THEN COALESCE(status_last_updated, created_at) ELSE NULL END,
  rejected_at = CASE WHEN status = 'Rejected' THEN COALESCE(status_last_updated, created_at) ELSE NULL END,
  closed_at = CASE WHEN status IN ('Won', 'Rejected') THEN COALESCE(status_last_updated, created_at) ELSE NULL END
WHERE status IS NOT NULL;

-- Step 4: Refresh daily metrics for the last 90 days
-- DO $$
-- DECLARE
--   day_offset INT;
-- BEGIN
--   FOR day_offset IN 0..90 LOOP
--     PERFORM refresh_daily_analytics(CURRENT_DATE - day_offset);
--   END LOOP;
-- END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Analytics backfill complete!';
  RAISE NOTICE 'Updated % quotes with denormalized fields', (SELECT COUNT(*) FROM quotes WHERE total_value IS NOT NULL);
  RAISE NOTICE 'Created % status transitions', (SELECT COUNT(*) FROM quote_status_transitions);
  -- RAISE NOTICE 'Populated % days of metrics', (SELECT COUNT(*) FROM analytics_daily_metrics);
END $$;
