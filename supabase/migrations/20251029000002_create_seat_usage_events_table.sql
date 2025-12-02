-- Simplified seat usage events table for tracking seat changes
CREATE TABLE IF NOT EXISTS public.subscription_seat_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  previous_seat_count INTEGER NOT NULL,
  new_seat_count INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('seat_added', 'seat_removed', 'seat_count_updated')),
  triggered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/New_York')
);

-- Indexes for fast lookup
CREATE INDEX idx_seat_usage_subscription_id ON public.subscription_seat_usage_events(subscription_id);
CREATE INDEX idx_seat_usage_created_at ON public.subscription_seat_usage_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_seat_usage_events ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view their organization's seat usage events
CREATE POLICY "seat_usage_select" ON public.subscription_seat_usage_events
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT s.id
      FROM public.subscriptions s
      INNER JOIN public.memberships m ON m.organization_id = s.organization_id
      WHERE m.user_id = auth.uid()
        AND m.status = 'Active'
    )
  );

-- Only service role can insert/update/delete (for webhook and Edge Functions)
CREATE POLICY "seat_usage_insert_service_only" ON public.subscription_seat_usage_events
  FOR INSERT
  WITH CHECK (false); -- Regular users cannot insert; use service role key

CREATE POLICY "seat_usage_update_service_only" ON public.subscription_seat_usage_events
  FOR UPDATE
  USING (false); -- Regular users cannot update; use service role key

CREATE POLICY "seat_usage_delete_service_only" ON public.subscription_seat_usage_events
  FOR DELETE
  USING (false); -- Regular users cannot delete; use service role key
