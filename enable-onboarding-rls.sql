-- Enable RLS on user_onboarding_progress table
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "onboarding_select_policy" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "onboarding_insert_policy" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "onboarding_update_policy" ON public.user_onboarding_progress;
DROP POLICY IF EXISTS "onboarding_delete_policy" ON public.user_onboarding_progress;

-- Create RLS policies - Users can only access their own onboarding progress
CREATE POLICY "onboarding_select_policy" ON public.user_onboarding_progress
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "onboarding_insert_policy" ON public.user_onboarding_progress
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_update_policy" ON public.user_onboarding_progress
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_delete_policy" ON public.user_onboarding_progress
FOR DELETE USING (user_id = auth.uid());

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled and policies created for user_onboarding_progress table!';
END $$;
