-- Proposal E-Signature Tables
-- Stores signing tokens, signatures, and activity logs

-- Signing tokens sent to clients
CREATE TABLE IF NOT EXISTS proposal_signing_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_name TEXT,
  client_company TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'signed', 'expired', 'revoked')),
  unsigned_pdf_url TEXT,
  unsigned_pdf_path TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actual signatures
CREATE TABLE IF NOT EXISTS proposal_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  signing_token_id UUID REFERENCES proposal_signing_tokens(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_company TEXT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('draw', 'type')),
  signature_data TEXT NOT NULL,
  signature_font TEXT,
  signed_pdf_url TEXT,
  signed_pdf_path TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS proposal_signing_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  signing_token_id UUID REFERENCES proposal_signing_tokens(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signing_tokens_proposal ON proposal_signing_tokens(proposal_id);
CREATE INDEX IF NOT EXISTS idx_signing_tokens_org ON proposal_signing_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_signing_tokens_access ON proposal_signing_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_signing_tokens_status ON proposal_signing_tokens(status);

CREATE INDEX IF NOT EXISTS idx_signatures_proposal ON proposal_signatures(proposal_id);
CREATE INDEX IF NOT EXISTS idx_signatures_org ON proposal_signatures(organization_id);

CREATE INDEX IF NOT EXISTS idx_signing_activity_proposal ON proposal_signing_activity(proposal_id);
CREATE INDEX IF NOT EXISTS idx_signing_activity_token ON proposal_signing_activity(signing_token_id);

-- RLS Policies
ALTER TABLE proposal_signing_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_signing_activity ENABLE ROW LEVEL SECURITY;

-- Org members can view signing tokens
CREATE POLICY "Org members can view signing tokens"
  ON proposal_signing_tokens FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Org members can insert signing tokens
CREATE POLICY "Org members can insert signing tokens"
  ON proposal_signing_tokens FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Org members can update signing tokens
CREATE POLICY "Org members can update signing tokens"
  ON proposal_signing_tokens FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Org members can view signatures
CREATE POLICY "Org members can view signatures"
  ON proposal_signatures FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Org members can view activity
CREATE POLICY "Org members can view signing activity"
  ON proposal_signing_activity FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_signing_token_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_signing_token_timestamp
  BEFORE UPDATE ON proposal_signing_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_signing_token_updated_at();
