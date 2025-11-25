/**
 * Add Platform Requirement Field
 *
 * Adds platform_requirement column to available_integrations table
 * to display platform-specific badges (e.g., "Windows Only")
 */

BEGIN;

-- ============================================================================
-- Add Platform Requirement Column
-- ============================================================================

ALTER TABLE available_integrations
ADD COLUMN IF NOT EXISTS platform_requirement TEXT;

COMMENT ON COLUMN available_integrations.platform_requirement IS
  'Platform requirement label (e.g., "Windows Only", "Mac Only", "Windows/Mac")';

-- ============================================================================
-- Set Platform Requirements for Existing Integrations
-- ============================================================================

-- QuickBooks Desktop requires Windows (Web Connector is Windows only)
UPDATE available_integrations
SET platform_requirement = 'Windows Only'
WHERE integration_type = 'quickbooks_desktop';

-- QuickBooks Online is web-based (no platform requirement)
UPDATE available_integrations
SET platform_requirement = NULL
WHERE integration_type = 'quickbooks_online';

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 * ALTER TABLE available_integrations DROP COLUMN IF EXISTS platform_requirement;
 * COMMIT;
 */
