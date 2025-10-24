-- Add department column to invite_tokens table
-- This allows invitations to specify what department the invited user will join
ALTER TABLE public.invite_tokens
ADD COLUMN department text;

-- Add constraint to ensure department matches valid values
-- (same constraint as memberships table)
ALTER TABLE public.invite_tokens
ADD CONSTRAINT valid_department CHECK (
  department IS NULL OR
  department IN ('Sales', 'Marketing', 'Operations', 'IT', 'Finance', 'HR', 'Customer Success', 'Product', 'Engineering', 'Executive', 'Other')
);

-- Add comment for documentation
COMMENT ON COLUMN public.invite_tokens.department IS 'Department the invited user will be assigned to when they accept the invitation';
