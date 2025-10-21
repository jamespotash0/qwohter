-- Allow all active members to view organization subscription
-- Members need to check if org has valid subscription to pass paywall
--
-- Problem: Only Owner/Admin could view subscriptions, blocking Members from paywall checks
-- Solution: Allow all Active members to SELECT (read-only) their org's subscription

DROP POLICY IF EXISTS "subscriptions_select_policy" ON public.subscriptions;

CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
FOR SELECT USING (
  -- Allow all Active members (not just Owner/Admin) to view subscription
  is_active_member(auth.uid(), organization_id)
);

COMMENT ON POLICY "subscriptions_select_policy" ON public.subscriptions IS
'All active members can view organization subscription (needed for paywall check). Uses SECURITY DEFINER.';
