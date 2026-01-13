-- ============================================================================
-- Dropbox Integration & Storage Provider Settings
-- ============================================================================
-- Adds Dropbox to available integrations (coming soon)
-- Adds storage provider settings to organizations table

BEGIN;

-- ============================================================================
-- 1. Add Dropbox to available integrations (Coming Soon)
-- ============================================================================

INSERT INTO available_integrations (
  integration_type,
  name,
  description,
  logo_url,
  category,
  is_enabled,
  is_beta,
  coming_soon,
  required_plan,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order,
  platform_requirement
) VALUES (
  'dropbox',
  'Dropbox',
  'Store signed proposals and generated documents directly in your Dropbox. Organize files by proposal for easy access.',
  '/images/integrations/dropbox.png',
  'storage',
  true,
  false,
  true,  -- Coming soon
  NULL,
  'https://www.dropbox.com/developers/documentation',
  'easy',
  5,
  4,
  NULL
) ON CONFLICT (integration_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  coming_soon = EXCLUDED.coming_soon,
  updated_at = NOW();

-- ============================================================================
-- 2. Add Storage Provider Settings to Organizations
-- ============================================================================

-- Add primary storage provider setting
-- Options: 'google_drive', 'dropbox', null (no cloud storage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'primary_storage_provider'
  ) THEN
    ALTER TABLE organizations ADD COLUMN primary_storage_provider TEXT DEFAULT NULL;
  END IF;
END $$;

-- Add sync to all providers setting (for redundant storage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'sync_to_all_storage_providers'
  ) THEN
    ALTER TABLE organizations ADD COLUMN sync_to_all_storage_providers BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- 3. Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN organizations.primary_storage_provider IS
  'Primary cloud storage provider for documents. Options: google_drive, dropbox, or null for Supabase-only storage.';
COMMENT ON COLUMN organizations.sync_to_all_storage_providers IS
  'If true, documents are uploaded to all connected storage providers. If false, only the primary provider is used.';

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
/*
 * If you need to rollback this migration:
 *
 * BEGIN;
 * DELETE FROM available_integrations WHERE integration_type = 'dropbox';
 * ALTER TABLE organizations DROP COLUMN IF EXISTS primary_storage_provider;
 * ALTER TABLE organizations DROP COLUMN IF EXISTS sync_to_all_storage_providers;
 * COMMIT;
 */
