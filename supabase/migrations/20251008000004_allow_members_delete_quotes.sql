-- Allow all active members to delete quotes in their organization
-- Previously only admins/owners could delete quotes

DROP POLICY IF EXISTS "quotes_delete_policy" ON public.quotes;

CREATE POLICY "quotes_delete_policy" ON public.quotes
FOR DELETE USING (
  organization_id IS NULL AND auth.uid() = created_by OR -- Own personal quotes
  (
    organization_id = get_current_user_organization() AND
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.organization_id = quotes.organization_id
      AND m.status = 'Active'
    )
  )
);

COMMENT ON POLICY "quotes_delete_policy" ON public.quotes IS 'Any active member can delete quotes in their organization';
