-- ============================================================================
-- WALL QUOTE WIZARD - COMPLETE SCHEMA MIGRATION
-- ============================================================================
-- This migration creates all tables, indexes, and triggers in dependency order
-- Run this in your Supabase SQL Editor for staging/new databases
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTIONS (Referenced by triggers)
-- ============================================================================
-- Note: These functions need to be created before the triggers that use them
-- If you already have these functions, you can skip this section

-- Handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Placeholder functions (create actual implementations as needed)
CREATE OR REPLACE FUNCTION handle_user_deletion() RETURNS TRIGGER AS $$ BEGIN RETURN OLD; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_quote_creator_name_on_profile_change() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION normalize_membership_role() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION normalize_membership_status() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_subscription_user_count() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION set_owner_department() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_quote_creator_name_on_membership_change() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_active_user_count() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION create_workflow_columns_for_new_org() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION mark_stripe_quantity_for_sync() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_subscription_is_active() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION check_quote_is_main_version_and_won(quote_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN TRUE; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_quote_on_board_status() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION ensure_single_main_version() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION increment_quote_version() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION normalize_quote_status() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION track_quote_status_change() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_projects_from_is_on_board() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION set_quote_creator_name() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_project_on_quote_status_change() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_quote_analytics_fields() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION sync_reminder_status() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION cleanup_expired_invite_tokens() RETURNS TRIGGER AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: CREATE BASE TABLES (No dependencies)
-- ============================================================================

-- Table: profiles (depends on auth.users which is built-in)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
    REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Table: organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organization_code TEXT NOT NULL,
  found_via TEXT,
  phone_number TEXT,
  fax_number TEXT,
  company_address TEXT,
  industry TEXT,
  website TEXT,
  quote_start_number TEXT,
  logo_data JSONB,
  has_used_trial BOOLEAN DEFAULT FALSE,
  CONSTRAINT organizations_pkey PRIMARY KEY (id),
  CONSTRAINT organizations_fax_number_key UNIQUE (fax_number),
  CONSTRAINT organizations_organization_code_key UNIQUE (organization_code),
  CONSTRAINT organizations_phone_number_key UNIQUE (phone_number)
);

-- Table: subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_per_month NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_per_yearly NUMERIC(10, 2) DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB DEFAULT '{}'::JSONB,
  max_users INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_product_id TEXT,
  min_users INTEGER,
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_plans_name_key UNIQUE (name),
  CONSTRAINT subscription_plans_stripe_product_id_key UNIQUE (stripe_product_id)
);

-- ============================================================================
-- STEP 3: CREATE DEPENDENT TABLES (Reference base tables)
-- ============================================================================

-- Table: subscriptions (depends on organizations, subscription_plans)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,
  current_period_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  access_blocked BOOLEAN DEFAULT FALSE,
  access_blocked_reason TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  number_of_active_users INTEGER DEFAULT 0,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_start TIMESTAMPTZ,
  pause_at_period_end BOOLEAN DEFAULT FALSE,
  billing_interval VARCHAR(20) DEFAULT 'Monthly',
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  has_payment_method BOOLEAN DEFAULT FALSE,
  last_payment_reminder_sent_at TIMESTAMPTZ,
  stripe_quantity_pending_sync BOOLEAN DEFAULT FALSE,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id),
  CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id),
  CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id),
  CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id)
    REFERENCES subscription_plans (id)
);

-- Table: memberships (depends on profiles, organizations)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  role TEXT DEFAULT 'Member',
  status TEXT DEFAULT 'Pending',
  invited_by UUID,
  invitation_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  department TEXT,
  join_type TEXT DEFAULT 'Direct',
  CONSTRAINT memberships_pkey PRIMARY KEY (id),
  CONSTRAINT memberships_user_id_organization_id_key UNIQUE (user_id, organization_id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT memberships_invited_by_fkey FOREIGN KEY (invited_by)
    REFERENCES profiles (id),
  CONSTRAINT memberships_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT valid_department CHECK (
    (department IS NULL) OR (department = ANY (ARRAY[
      'Executive', 'Finance', 'Sales', 'Marketing', 'IT', 'HR',
      'Customer Success', 'Product', 'Design', 'Engineering',
      'Operations', 'Legal', 'Other'
    ]))
  ),
  CONSTRAINT memberships_join_type_check CHECK (
    (join_type IS NULL) OR (join_type = ANY (ARRAY['Direct', 'Requested', 'Invited']))
  ),
  CONSTRAINT memberships_role_check CHECK (
    role = ANY (ARRAY['Owner', 'Admin', 'Member'])
  ),
  CONSTRAINT memberships_status_check CHECK (
    status = ANY (ARRAY['Pending', 'Active', 'Suspended', 'Inactive'])
  )
);

-- Table: organization_creation_log (depends on profiles)
CREATE TABLE IF NOT EXISTS public.organization_creation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  CONSTRAINT organization_creation_log_pkey PRIMARY KEY (id),
  CONSTRAINT organization_creation_log_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT organization_creation_log_status_check CHECK (
    status = ANY (ARRAY['Success', 'Failed', 'Rate_Limited'])
  )
);

-- Table: project_workflow_columns (depends on organizations)
CREATE TABLE IF NOT EXISTS public.project_workflow_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  column_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT project_workflow_columns_pkey PRIMARY KEY (id),
  CONSTRAINT project_workflow_columns_organization_id_name_key UNIQUE (organization_id, name),
  CONSTRAINT project_workflow_columns_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Table: user_onboarding_progress (depends on profiles)
CREATE TABLE public.user_onboarding_progress (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  current_step text not null,
  completed_steps text[] null default '{}'::text[],
  session_data jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null default (now() + '24:00:00'::interval),
  CONSTRAINT user_onboarding_progress_pkey primary key (id),
  CONSTRAINT user_onboarding_progress_user_id_key unique (user_id),
  CONSTRAINT user_onboarding_progress_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
);

-- Table: quotes (depends on profiles, organizations)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  proposal_number TEXT NOT NULL,
  quote_details JSONB NOT NULL DEFAULT '{}'::JSONB,
  job_details JSONB NOT NULL DEFAULT '[]'::JSONB,
  price_details JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  date_last_downloaded TIMESTAMPTZ,
  document_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_details JSONB NOT NULL DEFAULT '{}'::JSONB,
  labor_details JSONB NOT NULL DEFAULT '{}'::JSONB,
  project_name TEXT,
  wall_details JSONB NOT NULL DEFAULT '{}'::JSONB,
  organization_id UUID NOT NULL,
  customization JSONB,
  quote_source TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  total_value NUMERIC(12, 2),
  subtotal NUMERIC(12, 2),
  margin_percentage NUMERIC(5, 2),
  submitted_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  is_main_version BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_name TEXT,
  is_on_board BOOLEAN DEFAULT FALSE,
  template_type TEXT DEFAULT 'Generic',
  CONSTRAINT quotes_pkey PRIMARY KEY (id),
  CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT quotes_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  -- CONSTRAINT quotes_template_type_check CHECK (
  --   template_type = ANY (ARRAY['Generic', 'CWS'])
  -- )
);

-- ============================================================================
-- STEP 4: CREATE DEEPLY DEPENDENT TABLES
-- ============================================================================

-- Table: projects (depends on organizations, quotes)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  workflow_status TEXT NOT NULL DEFAULT 'Active',
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  board_order INTEGER DEFAULT 0,
  completion_date DATE,
  priority TEXT DEFAULT '',
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_quote_id_organization_id_key UNIQUE (quote_id, organization_id),
  CONSTRAINT projects_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT projects_quote_id_fkey FOREIGN KEY (quote_id)
    REFERENCES quotes (id) ON DELETE CASCADE,
  CONSTRAINT projects_must_link_to_main_version_and_won CHECK (
    check_quote_is_main_version_and_won(quote_id)
  )
);

-- Table: reminders (depends on profiles, organizations, quotes)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  quote_id UUID,
  reminder_type TEXT NOT NULL DEFAULT 'General',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_status TEXT,
  CONSTRAINT reminders_pkey PRIMARY KEY (id),
  CONSTRAINT reminders_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT reminders_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT reminders_completed_by_fkey FOREIGN KEY (completed_by)
    REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT reminders_quote_id_fkey FOREIGN KEY (quote_id)
    REFERENCES quotes (id) ON DELETE CASCADE,
  CONSTRAINT reminders_reminder_status_check CHECK (
    reminder_status = ANY (ARRAY['Pending', 'Completed', 'Dismissed'])
  ),
  CONSTRAINT reminders_reminder_type_check CHECK (
    reminder_type = ANY (ARRAY['Quote_Follow_Up', 'General', 'Meeting', 'Deadline', 'Task'])
  )
);

-- Table: quote_status_transitions (depends on organizations, quotes, auth.users)
CREATE TABLE IF NOT EXISTS public.quote_status_transitions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transitioned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quote_status_transitions_pkey PRIMARY KEY (id),
  CONSTRAINT quote_status_transitions_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id),
  CONSTRAINT quote_status_transitions_quote_id_fkey FOREIGN KEY (quote_id)
    REFERENCES quotes (id) ON DELETE CASCADE,
  CONSTRAINT quote_status_transitions_transitioned_by_fkey FOREIGN KEY (transitioned_by)
    REFERENCES auth.users (id)
);

-- Table: quote_activities (depends on organizations, quotes, auth.users)
CREATE TABLE IF NOT EXISTS public.quote_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  quote_id UUID,
  quote_number TEXT NOT NULL,
  project_name TEXT,
  user_id UUID,
  user_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_details JSONB,
  organization_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quote_activities_pkey PRIMARY KEY (id),
  CONSTRAINT quote_activities_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT quote_activities_quote_id_fkey FOREIGN KEY (quote_id)
    REFERENCES quotes (id) ON DELETE SET NULL,
  CONSTRAINT quote_activities_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Table: subscription_seat_usage_events (depends on subscriptions, auth.users)
CREATE TABLE IF NOT EXISTS public.subscription_seat_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  previous_seat_count INTEGER NOT NULL,
  new_seat_count INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  triggered_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'America/New_York'),
  CONSTRAINT subscription_seat_usage_events_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_seat_usage_events_subscription_id_fkey FOREIGN KEY (subscription_id)
    REFERENCES subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT subscription_seat_usage_events_triggered_by_user_id_fkey FOREIGN KEY (triggered_by_user_id)
    REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT subscription_seat_usage_events_event_type_check CHECK (
    event_type = ANY (ARRAY['seat_added', 'seat_removed', 'seat_count_updated'])
  )
);

-- Table: invite_tokens (depends on auth.users, organizations)
CREATE TABLE public.invite_tokens (
  id uuid not null default gen_random_uuid (),
  token text not null,
  organization_id uuid not null,
  organization_code text not null,
  role text not null,
  created_by uuid not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_used boolean null default false,
  email text not null,
  department text null,
  constraint invite_tokens_pkey primary key (id),
  constraint invite_tokens_token_key unique (token),
  constraint invite_tokens_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete CASCADE,
  constraint invite_tokens_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint invite_tokens_role_check check (
    (role = any (array['Admin'::text, 'Member'::text]))
  ),
  constraint valid_department check (
    (
      (department is null)
      or (
        department = any (
          array[
            'Executive'::text,
            'Finance'::text,
            'Sales'::text,
            'Marketing'::text,
            'IT'::text,
            'HR'::text,
            'Customer Success'::text,
            'Product'::text,
            'Design'::text,
            'Engineering'::text,
            'Operations'::text,
            'Legal'::text,
            'Other'::text
          ]
        )
      )
    )
  )
);

-- ============================================================================
-- STEP 5: CREATE INDEXES
-- ============================================================================

-- Indexes for profiles (none specified)

-- Indexes for organizations (none specified)

-- Indexes for subscription_plans (none specified)

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_cancel_at_period_end ON public.subscriptions USING btree (cancel_at_period_end) WHERE (cancel_at_period_end = TRUE);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pause_at_period_end ON public.subscriptions USING btree (pause_at_period_end) WHERE (pause_at_period_end = TRUE);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions USING btree (trial_end) WHERE (trial_end IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_reminder ON public.subscriptions USING btree (last_payment_reminder_sent_at) WHERE (has_payment_method = FALSE);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_interval ON public.subscriptions USING btree (billing_interval);

-- Indexes for memberships
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON public.memberships USING btree (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_status ON public.memberships USING btree (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_join_type ON public.memberships USING btree (join_type) WHERE (join_type IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_memberships_department ON public.memberships USING btree (department) WHERE (department IS NOT NULL);

-- Indexes for organization_creation_log
CREATE INDEX IF NOT EXISTS idx_creation_log_user_timestamp ON public.organization_creation_log USING btree (user_id, timestamp);

-- Indexes for project_workflow_columns
CREATE INDEX IF NOT EXISTS idx_project_workflow_columns_org ON public.project_workflow_columns USING btree (organization_id);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_archived ON public.quotes USING btree (archived);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes USING btree (status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_source ON public.quotes USING btree (quote_source);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by_name ON public.quotes USING btree (created_by_name);
CREATE INDEX IF NOT EXISTS idx_quotes_total_value ON public.quotes USING btree (total_value) WHERE (total_value IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_quotes_org_created ON public.quotes USING btree (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON public.quotes USING btree (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_won_date ON public.quotes USING btree (organization_id, won_at DESC) WHERE (won_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_quotes_submitted_date ON public.quotes USING btree (organization_id, submitted_at DESC) WHERE (submitted_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_quotes_is_main_version ON public.quotes USING btree (organization_id, is_main_version) WHERE (is_main_version = TRUE);
CREATE INDEX IF NOT EXISTS idx_quotes_template_type ON public.quotes USING btree (template_type);
CREATE INDEX IF NOT EXISTS idx_quotes_is_on_board ON public.quotes USING btree (is_on_board);

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_organization ON public.projects USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_quote ON public.projects USING btree (quote_id);
CREATE INDEX IF NOT EXISTS idx_projects_workflow_status ON public.projects USING btree (workflow_status);

-- Indexes for reminders
CREATE INDEX IF NOT EXISTS idx_reminders_organization ON public.reminders USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_quote ON public.reminders USING btree (quote_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_is_shared ON public.reminders USING btree (is_shared);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by_shared ON public.reminders USING btree (created_by, is_shared);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_status ON public.reminders USING btree (reminder_status);

-- Indexes for quote_status_transitions
CREATE INDEX IF NOT EXISTS idx_transitions_quote ON public.quote_status_transitions USING btree (quote_id);
CREATE INDEX IF NOT EXISTS idx_transitions_org_date ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_transitions_status_date ON public.quote_status_transitions USING btree (to_status, transitioned_at DESC);
CREATE INDEX IF NOT EXISTS idx_transitions_won ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC) WHERE (to_status = 'Won');
CREATE INDEX IF NOT EXISTS idx_transitions_rejected ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC) WHERE (to_status = 'Rejected');
CREATE INDEX IF NOT EXISTS idx_transitions_submitted ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC) WHERE (to_status = 'Submitted');

-- Indexes for quote_activities
CREATE INDEX IF NOT EXISTS idx_quote_activities_organization_id ON public.quote_activities USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_activities_created_at ON public.quote_activities USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_activities_quote_id ON public.quote_activities USING btree (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_activities_activity_type ON public.quote_activities USING btree (activity_type);

-- Indexes for subscription_seat_usage_events
CREATE INDEX IF NOT EXISTS idx_seat_usage_subscription_id ON public.subscription_seat_usage_events USING btree (subscription_id);
CREATE INDEX IF NOT EXISTS idx_seat_usage_created_at ON public.subscription_seat_usage_events USING btree (created_at DESC);

-- Indexes for user_onboarding_progress
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.user_onboarding_progress USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_expires_at ON public.user_onboarding_progress USING btree (expires_at);

-- Indexes for invite_tokens
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_org_id ON public.invite_tokens USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON public.invite_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_is_used ON public.invite_tokens USING btree (is_used);

-- ============================================================================
-- STEP 6: CREATE TRIGGERS
-- ============================================================================

-- Triggers for profiles
CREATE TRIGGER trigger_handle_user_deletion
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

CREATE TRIGGER trigger_update_quote_creator_name_on_profile
  AFTER UPDATE OF full_name, email ON profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION update_quote_creator_name_on_profile_change();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for organizations
CREATE TRIGGER trigger_create_workflow_columns_for_new_org
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_workflow_columns_for_new_org();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for subscriptions
CREATE TRIGGER mark_quantity_sync_needed
  BEFORE UPDATE OF number_of_active_users ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION mark_stripe_quantity_for_sync();

CREATE TRIGGER set_subscription_is_active
  BEFORE INSERT OR UPDATE OF stripe_subscription_status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_is_active();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for memberships
CREATE TRIGGER normalize_membership_role_trigger
  BEFORE INSERT OR UPDATE OF role ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION normalize_membership_role();

CREATE TRIGGER normalize_membership_status_trigger
  BEFORE INSERT OR UPDATE OF status ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION normalize_membership_status();

CREATE TRIGGER sync_user_count_on_delete
  AFTER DELETE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_user_count();

CREATE TRIGGER sync_user_count_on_insert
  AFTER INSERT ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_user_count();

CREATE TRIGGER sync_user_count_on_update
  AFTER UPDATE OF status ON memberships
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_subscription_user_count();

CREATE TRIGGER trigger_set_owner_department
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION set_owner_department();

CREATE TRIGGER trigger_update_quote_creator_name
  AFTER INSERT OR DELETE OR UPDATE OF status ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_creator_name_on_membership_change();

CREATE TRIGGER update_active_users_trigger
  AFTER INSERT OR DELETE OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_active_user_count();

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for project_workflow_columns
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON project_workflow_columns
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for quotes
CREATE TRIGGER ensure_single_main_version_trigger
  BEFORE UPDATE OF is_main_version ON quotes
  FOR EACH ROW
  WHEN (NEW.is_main_version = TRUE)
  EXECUTE FUNCTION ensure_single_main_version();

CREATE TRIGGER increment_version_on_download
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION increment_quote_version();

CREATE TRIGGER normalize_quote_status_trigger
  BEFORE INSERT OR UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION normalize_quote_status();

CREATE TRIGGER on_quote_status_change
  BEFORE UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION track_quote_status_change();

CREATE TRIGGER sync_projects_on_is_on_board_change
  AFTER UPDATE OF is_on_board ON quotes
  FOR EACH ROW
  WHEN (OLD.is_on_board IS DISTINCT FROM NEW.is_on_board)
  EXECUTE FUNCTION sync_projects_from_is_on_board();

CREATE TRIGGER trigger_set_quote_creator_name
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_creator_name();

CREATE TRIGGER trigger_sync_project_on_quote_status_change
  AFTER INSERT OR UPDATE OF status, is_on_board ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_on_quote_status_change();

CREATE TRIGGER update_analytics_fields
  BEFORE INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_analytics_fields();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for projects
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER sync_quote_on_board_after_project_changes
  AFTER INSERT OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_quote_on_board_status();

-- Triggers for reminders
CREATE TRIGGER keep_reminder_status_in_sync
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION sync_reminder_status();

CREATE TRIGGER update_reminders_updated_at_trigger
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Triggers for user_onboarding 
CREATE TRIGGER update_user_onboarding_progress_updated_at 
  BEFORE UPDATE on user_onboarding_progress 
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at ();

-- Triggers for invite_tokens
CREATE TRIGGER trigger_cleanup_expired_invite_tokens
  AFTER INSERT ON invite_tokens FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_invite_tokens ();

CREATE TRIGGER update_invite_tokens_updated_at BEFORE
  UPDATE ON invite_tokens FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at ();

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Schema migration complete. Next steps:
-- 1. Implement actual trigger functions (currently placeholders)
-- 2. Set up RLS policies
-- 3. Insert seed data for subscription_plans
-- 4. Test with sample data
-- ============================================================================
