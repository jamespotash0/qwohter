-- Create invite_tokens table for secure, expiring invite links
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL UNIQUE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_code text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Member')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_used boolean DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_org_id ON public.invite_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON public.invite_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_is_used ON public.invite_tokens(is_used);

-- Enable RLS
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_tokens
CREATE POLICY "Users can view invite tokens for their organization" ON public.invite_tokens
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
    )
  );

CREATE POLICY "Admins can create invite tokens for their organization" ON public.invite_tokens
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
      AND role IN ('Admin', 'Owner')
    )
  );

CREATE POLICY "Admins can update invite tokens for their organization" ON public.invite_tokens
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
      AND role IN ('Admin', 'Owner')
    )
  );

CREATE POLICY "Admins can delete invite tokens for their organization" ON public.invite_tokens
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.memberships
      WHERE user_id = auth.uid()
      AND status = 'Active'
      AND role IN ('Admin', 'Owner')
    )
  );

-- Function to automatically clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_invite_tokens()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.invite_tokens
  WHERE expires_at < now() - interval '1 day';
  RETURN NULL;
END;
$$;

-- Trigger to clean up expired tokens daily
DROP TRIGGER IF EXISTS trigger_cleanup_expired_invite_tokens ON public.invite_tokens;
CREATE TRIGGER trigger_cleanup_expired_invite_tokens
  AFTER INSERT ON public.invite_tokens
  EXECUTE FUNCTION cleanup_expired_invite_tokens();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_tokens TO authenticated;