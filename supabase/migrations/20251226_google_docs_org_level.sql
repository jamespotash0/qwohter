-- ============================================================================
-- Google Docs Integration - Organization-Level OAuth
-- ============================================================================
-- One admin connects Google for the whole organization
-- All team members can generate docs using the org's token
-- Documents are created in a shared folder specified by the admin

-- 1. Add Google Docs to available integrations
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
  features,
  documentation_url,
  setup_difficulty,
  estimated_setup_time_minutes,
  display_order,
  platform_requirement
) VALUES (
  'google_docs',
  'Google Docs',
  'Generate professional proposals directly in your Google Drive. Templates are automatically filled with proposal data.',
  '/images/integrations/google-docs.png',
  'documents',
  true,
  false,
  false,
  NULL,
  '["Auto-generate from templates", "Variables replaced automatically", "Documents saved to your Drive", "Full Google Docs editing"]'::jsonb,
  'https://developers.google.com/docs/api',
  'easy',
  5,
  3,
  NULL
) ON CONFLICT (integration_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  updated_at = NOW();


-- 2. Create google_oauth_tokens table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  google_email TEXT,
  google_name TEXT,
  drive_folder_id TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One token per organization (org-level)
  CONSTRAINT google_oauth_tokens_organization_id_key UNIQUE (organization_id)
);

-- 3. Add columns if table already exists (for existing installations)
DO $$
BEGIN
  -- Add drive_folder_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_oauth_tokens' AND column_name = 'drive_folder_id'
  ) THEN
    ALTER TABLE google_oauth_tokens ADD COLUMN drive_folder_id TEXT;
  END IF;

  -- Add connected_by_user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_oauth_tokens' AND column_name = 'connected_by_user_id'
  ) THEN
    ALTER TABLE google_oauth_tokens ADD COLUMN connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. If there's an old user_id column, migrate data and handle constraints
DO $$
BEGIN
  -- Check if user_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_oauth_tokens' AND column_name = 'user_id'
  ) THEN
    -- Copy user_id to connected_by_user_id for existing records
    UPDATE google_oauth_tokens
    SET connected_by_user_id = user_id
    WHERE connected_by_user_id IS NULL AND user_id IS NOT NULL;

    -- Drop old unique constraint if exists
    ALTER TABLE google_oauth_tokens
      DROP CONSTRAINT IF EXISTS google_oauth_tokens_user_id_organization_id_key;

    -- Make user_id nullable (for backwards compat)
    ALTER TABLE google_oauth_tokens
      ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Ensure org-level unique constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'google_oauth_tokens_organization_id_key'
  ) THEN
    ALTER TABLE google_oauth_tokens
      ADD CONSTRAINT google_oauth_tokens_organization_id_key UNIQUE (organization_id);
  END IF;
END $$;

-- 5. Enable RLS
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 6. Drop old per-user RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view own Google tokens" ON google_oauth_tokens;
DROP POLICY IF EXISTS "Users can insert own Google tokens" ON google_oauth_tokens;
DROP POLICY IF EXISTS "Users can update own Google tokens" ON google_oauth_tokens;
DROP POLICY IF EXISTS "Users can delete own Google tokens" ON google_oauth_tokens;

-- 7. Create org-level RLS policies
-- All org members can view the token (to check if connected)
DROP POLICY IF EXISTS "Org members can view Google tokens" ON google_oauth_tokens;
CREATE POLICY "Org members can view Google tokens"
  ON google_oauth_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = google_oauth_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'Active'
    )
  );

-- Only admins/owners can insert tokens
DROP POLICY IF EXISTS "Admins can insert Google tokens" ON google_oauth_tokens;
CREATE POLICY "Admins can insert Google tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = google_oauth_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'Active'
        AND m.role IN ('Owner', 'Admin')
    )
  );

-- Only admins/owners can update tokens
DROP POLICY IF EXISTS "Admins can update Google tokens" ON google_oauth_tokens;
CREATE POLICY "Admins can update Google tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = google_oauth_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'Active'
        AND m.role IN ('Owner', 'Admin')
    )
  );

-- Only admins/owners can delete tokens
DROP POLICY IF EXISTS "Admins can delete Google tokens" ON google_oauth_tokens;
CREATE POLICY "Admins can delete Google tokens"
  ON google_oauth_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = google_oauth_tokens.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'Active'
        AND m.role IN ('Owner', 'Admin')
    )
  );

-- 8. Create indexes for efficient lookups
DROP INDEX IF EXISTS idx_google_oauth_tokens_user_org;
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_org
  ON google_oauth_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_oauth_tokens_valid
  ON google_oauth_tokens(organization_id, is_valid)
  WHERE is_valid = true;

-- 9. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_google_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_google_oauth_tokens_updated_at ON google_oauth_tokens;
CREATE TRIGGER set_google_oauth_tokens_updated_at
  BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 10. Remove integration_type check constraint to allow any integration type
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS valid_integration_type;
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_integration_type_check;

-- 11. Add documentation comments
COMMENT ON TABLE google_oauth_tokens IS
  'Stores Google OAuth tokens at the organization level. One admin connects for the whole org. All team members can use the token to generate documents.';
COMMENT ON COLUMN google_oauth_tokens.organization_id IS
  'The organization this token belongs to. One token per org.';
COMMENT ON COLUMN google_oauth_tokens.connected_by_user_id IS
  'The admin/owner who connected the Google account.';
COMMENT ON COLUMN google_oauth_tokens.drive_folder_id IS
  'Google Drive folder ID where generated documents will be created. Admin specifies this during connection.';
COMMENT ON COLUMN google_oauth_tokens.access_token IS
  'OAuth access token for Google API calls. Refreshed automatically when expired.';
COMMENT ON COLUMN google_oauth_tokens.refresh_token IS
  'OAuth refresh token used to obtain new access tokens.';
COMMENT ON COLUMN google_oauth_tokens.is_valid IS
  'Whether the token is still valid. Set to false if refresh fails.';
