# Database Schema Documentation
> Last updated: 2025-01-13
>
> **Purpose**: This file serves as the single source of truth for the WallQu database schema.
> Use this instead of migration files, which may be outdated or incorrect.

## Table of Contents
- [Tables](#tables)
- [Foreign Keys](#foreign-keys)
- [Functions](#functions)
- [RLS Policies](#rls-policies)
- [Triggers](#triggers)
- [Indexes](#indexes)

---

## Tables

[
  {
    "documentation": "## Table: dashboard_configurations",
    "columns": "- `name` (text) NOT NULL DEFAULT 'My Dashboard'::text\n  - `tiles` (jsonb) NOT NULL DEFAULT '[]'::jsonb\n  - `layout` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT timezone('utc'::text, now())\n  - `updated_at` (timestamp with time zone) NOT NULL DEFAULT timezone('utc'::text, now())\n  - `user_id` (uuid) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `organization_id` (uuid) NOT NULL\n  - `is_default` (boolean) DEFAULT false"
  },
  {
    "documentation": "## Table: form_definitions",
    "columns": "- `updated_at` (timestamp with time zone) DEFAULT now()\n  - `is_active` (boolean) DEFAULT true\n  - `organization_id` (uuid)\n  - `metadata` (jsonb) DEFAULT '{}'::jsonb\n  - `is_default` (boolean) DEFAULT false\n  - `description` (text)\n  - `name` (text) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `tags` (ARRAY)\n  - `form_type` (text) DEFAULT 'Quote'::text\n  - `tabs` (jsonb) NOT NULL DEFAULT '[]'::jsonb\n  - `created_by` (uuid)\n  - `created_at` (timestamp with time zone) DEFAULT now()"
  },
  {
    "documentation": "## Table: form_submissions",
    "columns": "- `updated_at` (timestamp with time zone) DEFAULT now()\n  - `organization_id` (uuid)\n  - `status` (text) DEFAULT 'draft'::text\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `form_definition_id` (uuid)\n  - `form_data` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `submitted_by` (uuid)\n  - `submitted_at` (timestamp with time zone) DEFAULT now()"
  },
  {
    "documentation": "## Table: invite_tokens",
    "columns": "- `created_by` (uuid) NOT NULL\n  - `role` (text) NOT NULL\n  - `organization_code` (text) NOT NULL\n  - `token` (text) NOT NULL\n  - `email` (text) NOT NULL\n  - `expires_at` (timestamp with time zone) NOT NULL\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `is_used` (boolean) DEFAULT false\n  - `organization_id` (uuid) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()"
  },
  {
    "documentation": "## Table: memberships",
    "columns": "- `invited_by` (uuid)\n  - `status` (text) DEFAULT 'Pending'::text\n  - `organization_id` (uuid) NOT NULL\n  - `role` (text) DEFAULT 'Member'::text\n  - `joined_at` (timestamp with time zone)\n  - `updated_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `user_id` (uuid) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `invitation_sent_at` (timestamp with time zone)"
  },
  {
    "documentation": "## Table: organization_creation_log",
    "columns": "- `user_id` (uuid) NOT NULL\n  - `status` (text) NOT NULL\n  - `ip_address` (text)\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `error_message` (text)\n  - `timestamp` (timestamp with time zone) NOT NULL DEFAULT now()"
  },
  {
    "documentation": "## Table: organizations",
    "columns": "- `quote_start_number` (text)\n  - `logo_data` (jsonb)\n  - `updated_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `website` (text)\n  - `name` (text) NOT NULL\n  - `organization_code` (text) NOT NULL\n  - `found_via` (text)\n  - `phone_number` (text)\n  - `fax_number` (text)\n  - `company_address` (text)\n  - `industry` (text)\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()"
  },
  {
    "documentation": "## Table: product_categories",
    "columns": "- `has_model` (boolean)\n  - `name` (text) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `manufacturer_id` (uuid)\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `has_series` (boolean) DEFAULT true\n  - `required` (boolean)\n  - `code` (text) NOT NULL"
  },
  {
    "documentation": "## Table: product_manufacturers",
    "columns": "- `required` (boolean)\n  - `product_type_id` (uuid)\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `code` (text) NOT NULL\n  - `name` (text) NOT NULL"
  },
  {
    "documentation": "## Table: product_models",
    "columns": "- `updated_at` (timestamp with time zone) DEFAULT now()\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `product_category_id` (uuid) NOT NULL\n  - `product_series_id` (uuid)\n  - `default_configurations` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `name` (text) NOT NULL"
  },
  {
    "documentation": "## Table: product_series",
    "columns": "- `has_model` (boolean) NOT NULL\n  - `product_category_id` (uuid) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `name` (text) NOT NULL\n  - `updated_at` (timestamp with time zone)\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `required` (boolean) NOT NULL"
  },
  {
    "documentation": "## Table: product_types",
    "columns": "- `name` (text) NOT NULL\n  - `code` (text) NOT NULL\n  - `required` (boolean)\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()"
  },
  {
    "documentation": "## Table: profiles",
    "columns": "- `updated_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `join_type` (text) DEFAULT 'Direct'::text\n  - `full_name` (text)\n  - `email` (text) NOT NULL\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `id` (uuid) NOT NULL"
  },
  {
    "documentation": "## Table: project_workflow_columns",
    "columns": "- `name` (text) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `organization_id` (uuid) NOT NULL\n  - `column_order` (integer) NOT NULL DEFAULT 0\n  - `is_default` (boolean) DEFAULT false\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `color` (text) DEFAULT '#6B7280'::text"
  },
  {
    "documentation": "## Table: projects",
    "columns": "- `priority` (text) DEFAULT ''::text\n  - `completion_date` (date)\n  - `board_order` (integer) DEFAULT 0\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `organization_id` (uuid) NOT NULL\n  - `quote_id` (uuid) NOT NULL\n  - `workflow_status` (text) NOT NULL DEFAULT 'Active'::text\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()"
  },
  {
    "documentation": "## Table: quote_activities",
    "columns": "- `organization_id` (uuid) NOT NULL\n  - `activity_details` (jsonb)\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `quote_number` (text) NOT NULL\n  - `project_name` (text)\n  - `user_name` (text) NOT NULL\n  - `user_id` (uuid)\n  - `activity_type` (text) NOT NULL\n  - `quote_id` (uuid)\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()"
  },
  {
    "documentation": "## Table: quote_status_transitions",
    "columns": "- `notes` (text)\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `transitioned_by` (uuid)\n  - `transitioned_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `organization_id` (uuid) NOT NULL\n  - `quote_id` (uuid) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `from_status` (text)\n  - `to_status` (text) NOT NULL"
  },
  {
    "documentation": "## Table: quotes",
    "columns": "- `project_name` (text)\n  - `archived` (boolean) NOT NULL DEFAULT false\n  - `customization` (jsonb)\n  - `organization_id` (uuid) NOT NULL\n  - `wall_details` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `labor_details` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `delivery_details` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `updated_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `version` (integer) NOT NULL DEFAULT 1\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `created_by` (uuid) NOT NULL\n  - `quote_details` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `job_details` (jsonb) NOT NULL DEFAULT '[]'::jsonb\n  - `price_details` (jsonb) NOT NULL DEFAULT '[]'::jsonb\n  - `status` (text) NOT NULL DEFAULT 'draft'::text\n  - `date_last_downloaded` (timestamp with time zone)\n  - `proposal_number` (text) NOT NULL\n  - `quote_source` (text)\n  - `closed_at` (timestamp with time zone)\n  - `rejected_at` (timestamp with time zone)\n  - `won_at` (timestamp with time zone)\n  - `submitted_at` (timestamp with time zone)\n  - `margin_percentage` (numeric)\n  - `subtotal` (numeric)\n  - `total_value` (numeric)"
  },
  {
    "documentation": "## Table: quotes_formbuilder_test",
    "columns": "- `organization_id` (uuid)\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `form_definition_id` (uuid)\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `product_items` (jsonb) DEFAULT '[]'::jsonb\n  - `form_response_data` (jsonb) NOT NULL DEFAULT '{}'::jsonb\n  - `computed_totals` (jsonb) DEFAULT '{}'::jsonb\n  - `proposal_number` (text) NOT NULL\n  - `created_by` (uuid)\n  - `archived` (boolean) DEFAULT false\n  - `rejected_at` (timestamp with time zone)\n  - `closed_at` (timestamp with time zone)\n  - `project_name` (text)\n  - `status` (text) DEFAULT 'Draft'::text\n  - `version` (integer) DEFAULT 1\n  - `date_last_downloaded` (timestamp with time zone)\n  - `submitted_at` (timestamp with time zone)\n  - `won_at` (timestamp with time zone)\n  - `quote_source` (text)"
  },
  {
    "documentation": "## Table: reminders",
    "columns": "- `completed_at` (timestamp with time zone)\n  - `reminder_type` (text) NOT NULL DEFAULT 'General'::text\n  - `status` (text) NOT NULL DEFAULT 'Pending'::text\n  - `due_date` (timestamp with time zone) NOT NULL\n  - `created_by` (uuid) NOT NULL\n  - `organization_id` (uuid) NOT NULL\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `title` (text) NOT NULL\n  - `description` (text)\n  - `is_shared` (boolean) NOT NULL DEFAULT false\n  - `updated_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `created_at` (timestamp with time zone) NOT NULL DEFAULT now()\n  - `completed_by` (uuid)\n  - `quote_id` (uuid)"
  },
  {
    "documentation": "## Table: subscription_plans",
    "columns": "- `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `price_per_user_yearly` (numeric) NOT NULL DEFAULT 0\n  - `features` (jsonb) DEFAULT '{}'::jsonb\n  - `max_users` (integer)\n  - `max_quotes` (integer)\n  - `is_active` (boolean) DEFAULT true\n  - `sort_order` (integer) DEFAULT 0\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `stripe_product_id` (text)\n  - `stripe_price_id_monthly` (text)\n  - `stripe_price_id_yearly` (text)\n  - `name` (text) NOT NULL\n  - `display_name` (text) NOT NULL\n  - `description` (text)\n  - `price_per_user_monthly` (numeric) NOT NULL DEFAULT 0"
  },
  {
    "documentation": "## Table: subscriptions",
    "columns": "- `stripe_subscription_status` (text)\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `updated_at` (timestamp with time zone) DEFAULT now()\n  - `plan_id` (uuid) NOT NULL\n  - `current_period_end` (timestamp with time zone)\n  - `is_active` (boolean) DEFAULT true\n  - `access_blocked` (boolean) DEFAULT false\n  - `stripe_customer_id` (text)\n  - `stripe_subscription_id` (text)\n  - `access_blocked_reason` (text)\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `organization_id` (uuid) NOT NULL\n  - `metadata` (jsonb) DEFAULT '{}'::jsonb"
  },
  {
    "documentation": "## Table: user_onboarding_progress",
    "columns": "- `user_id` (uuid)\n  - `id` (uuid) NOT NULL DEFAULT gen_random_uuid()\n  - `session_data` (jsonb) DEFAULT '{}'::jsonb\n  - `expires_at` (timestamp with time zone) DEFAULT (now() + '24:00:00'::interval)\n  - `current_step` (text) NOT NULL\n  - `completed_steps` (ARRAY) DEFAULT '{}'::text[]\n  - `created_at` (timestamp with time zone) DEFAULT now()\n  - `updated_at` (timestamp with time zone) DEFAULT now()"
  }
]

---

## Foreign Keys

[
  {
    "foreign_keys": "FK: memberships.user_id -> profiles.id"
  },
  {
    "foreign_keys": "FK: memberships.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: memberships.invited_by -> profiles.id"
  },
  {
    "foreign_keys": "FK: invite_tokens.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: reminders.quote_id -> quotes.id"
  },
  {
    "foreign_keys": "FK: product_manufacturers.product_type_id -> product_types.id"
  },
  {
    "foreign_keys": "FK: product_categories.manufacturer_id -> product_manufacturers.id"
  },
  {
    "foreign_keys": "FK: product_series.product_category_id -> product_categories.id"
  },
  {
    "foreign_keys": "FK: product_models.product_category_id -> product_categories.id"
  },
  {
    "foreign_keys": "FK: reminders.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: quotes.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: product_models.product_series_id -> product_series.id"
  },
  {
    "foreign_keys": "FK: form_definitions.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: form_submissions.form_definition_id -> form_definitions.id"
  },
  {
    "foreign_keys": "FK: form_submissions.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: dashboard_configurations.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: quotes.created_by -> profiles.id"
  },
  {
    "foreign_keys": "FK: organization_creation_log.user_id -> profiles.id"
  },
  {
    "foreign_keys": "FK: quote_activities.quote_id -> quotes.id"
  },
  {
    "foreign_keys": "FK: quote_activities.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: reminders.created_by -> profiles.id"
  },
  {
    "foreign_keys": "FK: reminders.completed_by -> profiles.id"
  },
  {
    "foreign_keys": "FK: subscriptions.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: subscriptions.plan_id -> subscription_plans.id"
  },
  {
    "foreign_keys": "FK: projects.quote_id -> quotes.id"
  },
  {
    "foreign_keys": "FK: projects.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: project_workflow_columns.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: quote_status_transitions.quote_id -> quotes.id"
  },
  {
    "foreign_keys": "FK: quote_status_transitions.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: quotes_formbuilder_test.organization_id -> organizations.id"
  },
  {
    "foreign_keys": "FK: quotes_formbuilder_test.created_by -> profiles.id"
  },
  {
    "foreign_keys": "FK: quotes_formbuilder_test.form_definition_id -> form_definitions.id"
  }
]

---

## Indexes

[
  {
    "table_name": "public.dashboard_configurations",
    "indexname": "dashboard_configurations_pkey",
    "indexdef": "CREATE UNIQUE INDEX dashboard_configurations_pkey ON public.dashboard_configurations USING btree (id)"
  },
  {
    "table_name": "public.dashboard_configurations",
    "indexname": "idx_dashboard_configurations_is_default",
    "indexdef": "CREATE INDEX idx_dashboard_configurations_is_default ON public.dashboard_configurations USING btree (organization_id, user_id, is_default)"
  },
  {
    "table_name": "public.dashboard_configurations",
    "indexname": "idx_dashboard_configurations_organization_id",
    "indexdef": "CREATE INDEX idx_dashboard_configurations_organization_id ON public.dashboard_configurations USING btree (organization_id)"
  },
  {
    "table_name": "public.dashboard_configurations",
    "indexname": "idx_dashboard_configurations_user_id",
    "indexdef": "CREATE INDEX idx_dashboard_configurations_user_id ON public.dashboard_configurations USING btree (user_id)"
  },
  {
    "table_name": "public.form_definitions",
    "indexname": "form_definitions_pkey",
    "indexdef": "CREATE UNIQUE INDEX form_definitions_pkey ON public.form_definitions USING btree (id)"
  },
  {
    "table_name": "public.form_definitions",
    "indexname": "idx_form_definitions_created_by",
    "indexdef": "CREATE INDEX idx_form_definitions_created_by ON public.form_definitions USING btree (created_by)"
  },
  {
    "table_name": "public.form_definitions",
    "indexname": "idx_form_definitions_is_active",
    "indexdef": "CREATE INDEX idx_form_definitions_is_active ON public.form_definitions USING btree (is_active)"
  },
  {
    "table_name": "public.form_definitions",
    "indexname": "idx_form_definitions_is_default",
    "indexdef": "CREATE INDEX idx_form_definitions_is_default ON public.form_definitions USING btree (organization_id, is_default) WHERE (is_default = true)"
  },
  {
    "table_name": "public.form_definitions",
    "indexname": "idx_form_definitions_organization_id",
    "indexdef": "CREATE INDEX idx_form_definitions_organization_id ON public.form_definitions USING btree (organization_id)"
  },
  {
    "table_name": "public.form_submissions",
    "indexname": "form_submissions_pkey",
    "indexdef": "CREATE UNIQUE INDEX form_submissions_pkey ON public.form_submissions USING btree (id)"
  },
  {
    "table_name": "public.form_submissions",
    "indexname": "idx_form_submissions_form_id",
    "indexdef": "CREATE INDEX idx_form_submissions_form_id ON public.form_submissions USING btree (form_definition_id)"
  },
  {
    "table_name": "public.form_submissions",
    "indexname": "idx_form_submissions_organization_id",
    "indexdef": "CREATE INDEX idx_form_submissions_organization_id ON public.form_submissions USING btree (organization_id)"
  },
  {
    "table_name": "public.form_submissions",
    "indexname": "idx_form_submissions_status",
    "indexdef": "CREATE INDEX idx_form_submissions_status ON public.form_submissions USING btree (status)"
  },
  {
    "table_name": "public.form_submissions",
    "indexname": "idx_form_submissions_submitted_by",
    "indexdef": "CREATE INDEX idx_form_submissions_submitted_by ON public.form_submissions USING btree (submitted_by)"
  },
  {
    "table_name": "public.invite_tokens",
    "indexname": "idx_invite_tokens_expires_at",
    "indexdef": "CREATE INDEX idx_invite_tokens_expires_at ON public.invite_tokens USING btree (expires_at)"
  },
  {
    "table_name": "public.invite_tokens",
    "indexname": "idx_invite_tokens_is_used",
    "indexdef": "CREATE INDEX idx_invite_tokens_is_used ON public.invite_tokens USING btree (is_used)"
  },
  {
    "table_name": "public.invite_tokens",
    "indexname": "idx_invite_tokens_org_id",
    "indexdef": "CREATE INDEX idx_invite_tokens_org_id ON public.invite_tokens USING btree (organization_id)"
  },
  {
    "table_name": "public.invite_tokens",
    "indexname": "idx_invite_tokens_token",
    "indexdef": "CREATE INDEX idx_invite_tokens_token ON public.invite_tokens USING btree (token)"
  },
  {
    "table_name": "public.invite_tokens",
    "indexname": "invite_tokens_pkey",
    "indexdef": "CREATE UNIQUE INDEX invite_tokens_pkey ON public.invite_tokens USING btree (id)"
  },
  {
    "table_name": "public.invite_tokens",
    "indexname": "invite_tokens_token_key",
    "indexdef": "CREATE UNIQUE INDEX invite_tokens_token_key ON public.invite_tokens USING btree (token)"
  },
  {
    "table_name": "public.memberships",
    "indexname": "idx_memberships_org_status",
    "indexdef": "CREATE INDEX idx_memberships_org_status ON public.memberships USING btree (organization_id, status)"
  },
  {
    "table_name": "public.memberships",
    "indexname": "idx_memberships_user_org",
    "indexdef": "CREATE INDEX idx_memberships_user_org ON public.memberships USING btree (user_id, organization_id)"
  },
  {
    "table_name": "public.memberships",
    "indexname": "memberships_pkey",
    "indexdef": "CREATE UNIQUE INDEX memberships_pkey ON public.memberships USING btree (id)"
  },
  {
    "table_name": "public.memberships",
    "indexname": "memberships_user_id_organization_id_key",
    "indexdef": "CREATE UNIQUE INDEX memberships_user_id_organization_id_key ON public.memberships USING btree (user_id, organization_id)"
  },
  {
    "table_name": "public.organization_creation_log",
    "indexname": "idx_creation_log_user_timestamp",
    "indexdef": "CREATE INDEX idx_creation_log_user_timestamp ON public.organization_creation_log USING btree (user_id, \"timestamp\")"
  },
  {
    "table_name": "public.organization_creation_log",
    "indexname": "organization_creation_log_pkey",
    "indexdef": "CREATE UNIQUE INDEX organization_creation_log_pkey ON public.organization_creation_log USING btree (id)"
  },
  {
    "table_name": "public.organizations",
    "indexname": "organizations_fax_number_key",
    "indexdef": "CREATE UNIQUE INDEX organizations_fax_number_key ON public.organizations USING btree (fax_number)"
  },
  {
    "table_name": "public.organizations",
    "indexname": "organizations_organization_code_key",
    "indexdef": "CREATE UNIQUE INDEX organizations_organization_code_key ON public.organizations USING btree (organization_code)"
  },
  {
    "table_name": "public.organizations",
    "indexname": "organizations_phone_number_key",
    "indexdef": "CREATE UNIQUE INDEX organizations_phone_number_key ON public.organizations USING btree (phone_number)"
  },
  {
    "table_name": "public.organizations",
    "indexname": "organizations_pkey",
    "indexdef": "CREATE UNIQUE INDEX organizations_pkey ON public.organizations USING btree (id)"
  },
  {
    "table_name": "public.product_categories",
    "indexname": "product_categories_manufacturer_id_code_key",
    "indexdef": "CREATE UNIQUE INDEX product_categories_manufacturer_id_code_key ON public.product_categories USING btree (manufacturer_id, code)"
  },
  {
    "table_name": "public.product_categories",
    "indexname": "product_categories_pkey",
    "indexdef": "CREATE UNIQUE INDEX product_categories_pkey ON public.product_categories USING btree (id)"
  },
  {
    "table_name": "public.product_manufacturers",
    "indexname": "product_manufacturers_code_key",
    "indexdef": "CREATE UNIQUE INDEX product_manufacturers_code_key ON public.product_manufacturers USING btree (code)"
  },
  {
    "table_name": "public.product_manufacturers",
    "indexname": "product_manufacturers_name_key",
    "indexdef": "CREATE UNIQUE INDEX product_manufacturers_name_key ON public.product_manufacturers USING btree (name)"
  },
  {
    "table_name": "public.product_manufacturers",
    "indexname": "product_manufacturers_pkey",
    "indexdef": "CREATE UNIQUE INDEX product_manufacturers_pkey ON public.product_manufacturers USING btree (id)"
  },
  {
    "table_name": "public.product_manufacturers",
    "indexname": "product_manufacturers_unique_type_name",
    "indexdef": "CREATE UNIQUE INDEX product_manufacturers_unique_type_name ON public.product_manufacturers USING btree (product_type_id, name)"
  },
  {
    "table_name": "public.product_models",
    "indexname": "models_pkey",
    "indexdef": "CREATE UNIQUE INDEX models_pkey ON public.product_models USING btree (id)"
  },
  {
    "table_name": "public.product_series",
    "indexname": "series_pkey",
    "indexdef": "CREATE UNIQUE INDEX series_pkey ON public.product_series USING btree (id)"
  },
  {
    "table_name": "public.product_types",
    "indexname": "product_types_code_key",
    "indexdef": "CREATE UNIQUE INDEX product_types_code_key ON public.product_types USING btree (code)"
  },
  {
    "table_name": "public.product_types",
    "indexname": "product_types_name_key",
    "indexdef": "CREATE UNIQUE INDEX product_types_name_key ON public.product_types USING btree (name)"
  },
  {
    "table_name": "public.product_types",
    "indexname": "product_types_pkey",
    "indexdef": "CREATE UNIQUE INDEX product_types_pkey ON public.product_types USING btree (id)"
  },
  {
    "table_name": "public.profiles",
    "indexname": "idx_profiles_join_type",
    "indexdef": "CREATE INDEX idx_profiles_join_type ON public.profiles USING btree (join_type)"
  },
  {
    "table_name": "public.profiles",
    "indexname": "profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
  },
  {
    "table_name": "public.project_workflow_columns",
    "indexname": "idx_project_workflow_columns_org",
    "indexdef": "CREATE INDEX idx_project_workflow_columns_org ON public.project_workflow_columns USING btree (organization_id)"
  },
  {
    "table_name": "public.project_workflow_columns",
    "indexname": "project_workflow_columns_organization_id_name_key",
    "indexdef": "CREATE UNIQUE INDEX project_workflow_columns_organization_id_name_key ON public.project_workflow_columns USING btree (organization_id, name)"
  },
  {
    "table_name": "public.project_workflow_columns",
    "indexname": "project_workflow_columns_pkey",
    "indexdef": "CREATE UNIQUE INDEX project_workflow_columns_pkey ON public.project_workflow_columns USING btree (id)"
  },
  {
    "table_name": "public.projects",
    "indexname": "idx_projects_organization",
    "indexdef": "CREATE INDEX idx_projects_organization ON public.projects USING btree (organization_id)"
  },
  {
    "table_name": "public.projects",
    "indexname": "idx_projects_quote",
    "indexdef": "CREATE INDEX idx_projects_quote ON public.projects USING btree (quote_id)"
  },
  {
    "table_name": "public.projects",
    "indexname": "idx_projects_workflow_status",
    "indexdef": "CREATE INDEX idx_projects_workflow_status ON public.projects USING btree (workflow_status)"
  },
  {
    "table_name": "public.projects",
    "indexname": "projects_pkey",
    "indexdef": "CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id)"
  },
  {
    "table_name": "public.projects",
    "indexname": "projects_quote_id_organization_id_key",
    "indexdef": "CREATE UNIQUE INDEX projects_quote_id_organization_id_key ON public.projects USING btree (quote_id, organization_id)"
  },
  {
    "table_name": "public.quote_activities",
    "indexname": "idx_quote_activities_activity_type",
    "indexdef": "CREATE INDEX idx_quote_activities_activity_type ON public.quote_activities USING btree (activity_type)"
  },
  {
    "table_name": "public.quote_activities",
    "indexname": "idx_quote_activities_created_at",
    "indexdef": "CREATE INDEX idx_quote_activities_created_at ON public.quote_activities USING btree (created_at DESC)"
  },
  {
    "table_name": "public.quote_activities",
    "indexname": "idx_quote_activities_organization_id",
    "indexdef": "CREATE INDEX idx_quote_activities_organization_id ON public.quote_activities USING btree (organization_id)"
  },
  {
    "table_name": "public.quote_activities",
    "indexname": "idx_quote_activities_quote_id",
    "indexdef": "CREATE INDEX idx_quote_activities_quote_id ON public.quote_activities USING btree (quote_id)"
  },
  {
    "table_name": "public.quote_activities",
    "indexname": "quote_activities_pkey",
    "indexdef": "CREATE UNIQUE INDEX quote_activities_pkey ON public.quote_activities USING btree (id)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "idx_transitions_org_date",
    "indexdef": "CREATE INDEX idx_transitions_org_date ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "idx_transitions_quote",
    "indexdef": "CREATE INDEX idx_transitions_quote ON public.quote_status_transitions USING btree (quote_id)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "idx_transitions_rejected",
    "indexdef": "CREATE INDEX idx_transitions_rejected ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC) WHERE (to_status = 'Rejected'::text)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "idx_transitions_status_date",
    "indexdef": "CREATE INDEX idx_transitions_status_date ON public.quote_status_transitions USING btree (to_status, transitioned_at DESC)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "idx_transitions_submitted",
    "indexdef": "CREATE INDEX idx_transitions_submitted ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC) WHERE (to_status = 'Submitted'::text)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "idx_transitions_won",
    "indexdef": "CREATE INDEX idx_transitions_won ON public.quote_status_transitions USING btree (organization_id, transitioned_at DESC) WHERE (to_status = 'Won'::text)"
  },
  {
    "table_name": "public.quote_status_transitions",
    "indexname": "quote_status_transitions_pkey",
    "indexdef": "CREATE UNIQUE INDEX quote_status_transitions_pkey ON public.quote_status_transitions USING btree (id)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_archived",
    "indexdef": "CREATE INDEX idx_quotes_archived ON public.quotes USING btree (archived)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_closed_date",
    "indexdef": "CREATE INDEX idx_quotes_closed_date ON public.quotes USING btree (organization_id, closed_at DESC) WHERE (closed_at IS NOT NULL)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_org_created",
    "indexdef": "CREATE INDEX idx_quotes_org_created ON public.quotes USING btree (organization_id, created_at DESC)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_org_status",
    "indexdef": "CREATE INDEX idx_quotes_org_status ON public.quotes USING btree (organization_id, status)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_quote_source",
    "indexdef": "CREATE INDEX idx_quotes_quote_source ON public.quotes USING btree (quote_source)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_status",
    "indexdef": "CREATE INDEX idx_quotes_status ON public.quotes USING btree (status)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_submitted_date",
    "indexdef": "CREATE INDEX idx_quotes_submitted_date ON public.quotes USING btree (organization_id, submitted_at DESC) WHERE (submitted_at IS NOT NULL)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_total_value",
    "indexdef": "CREATE INDEX idx_quotes_total_value ON public.quotes USING btree (total_value) WHERE (total_value IS NOT NULL)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "idx_quotes_won_date",
    "indexdef": "CREATE INDEX idx_quotes_won_date ON public.quotes USING btree (organization_id, won_at DESC) WHERE (won_at IS NOT NULL)"
  },
  {
    "table_name": "public.quotes",
    "indexname": "quotes_pkey",
    "indexdef": "CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id)"
  },
  {
    "table_name": "public.quotes_formbuilder_test",
    "indexname": "quotes_formbuilder_test_pkey",
    "indexdef": "CREATE UNIQUE INDEX quotes_formbuilder_test_pkey ON public.quotes_formbuilder_test USING btree (id)"
  },
  {
    "table_name": "public.quotes_formbuilder_test",
    "indexname": "quotes_formbuilder_test_proposal_number_key",
    "indexdef": "CREATE UNIQUE INDEX quotes_formbuilder_test_proposal_number_key ON public.quotes_formbuilder_test USING btree (proposal_number)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_created_by",
    "indexdef": "CREATE INDEX idx_reminders_created_by ON public.reminders USING btree (created_by)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_created_by_shared",
    "indexdef": "CREATE INDEX idx_reminders_created_by_shared ON public.reminders USING btree (created_by, is_shared)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_due_date",
    "indexdef": "CREATE INDEX idx_reminders_due_date ON public.reminders USING btree (due_date)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_is_shared",
    "indexdef": "CREATE INDEX idx_reminders_is_shared ON public.reminders USING btree (is_shared)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_organization",
    "indexdef": "CREATE INDEX idx_reminders_organization ON public.reminders USING btree (organization_id)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_quote",
    "indexdef": "CREATE INDEX idx_reminders_quote ON public.reminders USING btree (quote_id)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "idx_reminders_status",
    "indexdef": "CREATE INDEX idx_reminders_status ON public.reminders USING btree (status)"
  },
  {
    "table_name": "public.reminders",
    "indexname": "reminders_pkey",
    "indexdef": "CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id)"
  },
  {
    "table_name": "public.subscription_plans",
    "indexname": "subscription_plans_name_key",
    "indexdef": "CREATE UNIQUE INDEX subscription_plans_name_key ON public.subscription_plans USING btree (name)"
  },
  {
    "table_name": "public.subscription_plans",
    "indexname": "subscription_plans_pkey",
    "indexdef": "CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id)"
  },
  {
    "table_name": "public.subscription_plans",
    "indexname": "subscription_plans_stripe_product_id_key",
    "indexdef": "CREATE UNIQUE INDEX subscription_plans_stripe_product_id_key ON public.subscription_plans USING btree (stripe_product_id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "idx_subscriptions_organization_id",
    "indexdef": "CREATE INDEX idx_subscriptions_organization_id ON public.subscriptions USING btree (organization_id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "idx_subscriptions_stripe_customer_id",
    "indexdef": "CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "idx_subscriptions_stripe_subscription_id",
    "indexdef": "CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "subscriptions_organization_id_key",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_organization_id_key ON public.subscriptions USING btree (organization_id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "subscriptions_pkey",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "subscriptions_stripe_customer_id_key",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_stripe_customer_id_key ON public.subscriptions USING btree (stripe_customer_id)"
  },
  {
    "table_name": "public.subscriptions",
    "indexname": "subscriptions_stripe_subscription_id_key",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id)"
  },
  {
    "table_name": "public.user_onboarding_progress",
    "indexname": "idx_onboarding_expires_at",
    "indexdef": "CREATE INDEX idx_onboarding_expires_at ON public.user_onboarding_progress USING btree (expires_at)"
  },
  {
    "table_name": "public.user_onboarding_progress",
    "indexname": "idx_onboarding_user_id",
    "indexdef": "CREATE INDEX idx_onboarding_user_id ON public.user_onboarding_progress USING btree (user_id)"
  },
  {
    "table_name": "public.user_onboarding_progress",
    "indexname": "user_onboarding_progress_pkey",
    "indexdef": "CREATE UNIQUE INDEX user_onboarding_progress_pkey ON public.user_onboarding_progress USING btree (id)"
  },
  {
    "table_name": "public.user_onboarding_progress",
    "indexname": "user_onboarding_progress_user_id_key",
    "indexdef": "CREATE UNIQUE INDEX user_onboarding_progress_user_id_key ON public.user_onboarding_progress USING btree (user_id)"
  }
]

---

## Triggers

[
  {
    "table_name": "dashboard_configurations",
    "trigger_name": "update_dashboard_configurations_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_dashboard_configurations_updated_at()"
  },
  {
    "table_name": "form_definitions",
    "trigger_name": "update_form_definitions_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "table_name": "form_submissions",
    "trigger_name": "update_form_submissions_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "table_name": "invite_tokens",
    "trigger_name": "trigger_cleanup_expired_invite_tokens",
    "event": "INSERT",
    "action_statement": "EXECUTE FUNCTION cleanup_expired_invite_tokens()"
  },
  {
    "table_name": "memberships",
    "trigger_name": "update_memberships_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_updated_at()"
  },
  {
    "table_name": "organizations",
    "trigger_name": "trigger_create_workflow_columns_for_new_org",
    "event": "INSERT",
    "action_statement": "EXECUTE FUNCTION create_workflow_columns_for_new_org()"
  },
  {
    "table_name": "organizations",
    "trigger_name": "update_organizations_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_updated_at()"
  },
  {
    "table_name": "profiles",
    "trigger_name": "update_profiles_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_updated_at()"
  },
  {
    "table_name": "project_workflow_columns",
    "trigger_name": "update_project_workflow_columns_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "table_name": "projects",
    "trigger_name": "update_projects_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "increment_version_on_download",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION increment_quote_version()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "on_quote_status_change",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION track_quote_status_change()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "trg_update_status_timestamp",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_status_timestamp()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "trigger_sync_project_on_quote_status_change",
    "event": "INSERT",
    "action_statement": "EXECUTE FUNCTION sync_project_on_quote_status_change()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "trigger_sync_project_on_quote_status_change",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION sync_project_on_quote_status_change()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "update_analytics_fields",
    "event": "INSERT",
    "action_statement": "EXECUTE FUNCTION update_quote_analytics_fields()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "update_analytics_fields",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_quote_analytics_fields()"
  },
  {
    "table_name": "quotes",
    "trigger_name": "update_quotes_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_updated_at()"
  },
  {
    "table_name": "reminders",
    "trigger_name": "update_reminders_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_reminders_updated_at()"
  },
  {
    "table_name": "subscription_plans",
    "trigger_name": "update_subscription_plans_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_updated_at()"
  },
  {
    "table_name": "subscriptions",
    "trigger_name": "update_subscriptions_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_updated_at()"
  },
  {
    "table_name": "user_onboarding_progress",
    "trigger_name": "update_user_onboarding_progress_updated_at",
    "event": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  }
]

---

## Functions

[
  {
    "schema": "public",
    "function_name": "approve_member",
    "arguments": "member_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.approve_member(member_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n    member_org_id uuid;\n    current_user_role text;\nBEGIN\n    -- Get the member's organization from memberships table\n    SELECT organization_id INTO member_org_id\n    FROM public.memberships\n    WHERE user_id = member_id;\n\n    IF member_org_id IS NULL THEN\n        RAISE EXCEPTION 'Membership not found';\n    END IF;\n\n    -- Get current user's role in the organization\n    SELECT role INTO current_user_role\n    FROM public.memberships\n    WHERE user_id = auth.uid()\n    AND organization_id = member_org_id\n    AND status = 'Active';\n\n    -- Check if current user is admin/owner of that organization\n    IF current_user_role NOT IN ('Admin', 'Owner') THEN\n        RAISE EXCEPTION 'Only Admins and Owners can approve members';\n    END IF;\n\n    -- Approve the member in memberships table\n    UPDATE public.memberships\n    SET status = 'Active',\n        updated_at = NOW()\n    WHERE user_id = member_id\n    AND organization_id = member_org_id\n    AND status = 'Pending';\n\n    RETURN true;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "attempt_org_creation",
    "arguments": "p_profile_id uuid, p_ip text",
    "definition": "CREATE OR REPLACE FUNCTION public.attempt_org_creation(p_profile_id uuid, p_ip text)\n RETURNS text\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    recent_attempts int;\nBEGIN\n    -- Count successful org creations in the last 10 minutes for this profile\n    SELECT COUNT(*) INTO recent_attempts\n    FROM organization_creation_log\n    WHERE profile_id = p_profile_id\n      AND timestamp > now() - interval '10 minutes'\n      AND status = 'success';\n\n    IF recent_attempts >= 1 THEN\n        -- Log failed attempt\n        INSERT INTO organization_creation_log(profile_id, ip_address, status)\n        VALUES (p_profile_id, p_ip, 'failed');\n        RETURN 'limit reached';\n    ELSE\n        -- Log success (you would also create the org here)\n        INSERT INTO organization_creation_log(profile_id, ip_address, status)\n        VALUES (p_profile_id, p_ip, 'success');\n        RETURN 'allowed';\n    END IF;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "block_access",
    "arguments": "org_id uuid, reason text",
    "definition": "CREATE OR REPLACE FUNCTION public.block_access(org_id uuid, reason text)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  UPDATE public.subscriptions\n  SET access_blocked = true,\n      access_blocked_reason = reason,\n      updated_at = now()\n  WHERE organization_id = org_id;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "can_view_membership",
    "arguments": "check_user_id uuid, membership_user_id uuid, membership_org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.can_view_membership(check_user_id uuid, membership_user_id uuid, membership_org_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nDECLARE\n  can_view boolean;\nBEGIN\n  -- User can always see their own membership\n  IF check_user_id = membership_user_id THEN\n    RETURN true;\n  END IF;\n\n  -- Check if user is active member of same organization\n  SELECT EXISTS(\n    SELECT 1\n    FROM public.memberships\n    WHERE user_id = check_user_id\n    AND organization_id = membership_org_id\n    AND status = 'Active'\n  ) INTO can_view;\n\n  RETURN can_view;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "cleanup_expired_invite_tokens",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.cleanup_expired_invite_tokens()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  DELETE FROM public.invite_tokens\n  WHERE expires_at < now() - interval '1 day';\n  RETURN NULL;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "cleanup_expired_onboarding",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.cleanup_expired_onboarding()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  DELETE FROM public.user_onboarding_progress\n  WHERE expires_at < now();\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "cleanup_org_rate_limits",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.cleanup_org_rate_limits()\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n    DELETE FROM public.organization_creation_rate_limit \n    WHERE created_at < now() - interval '1 hour';\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "create_default_workflow_columns",
    "arguments": "org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_default_workflow_columns(org_id uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  INSERT INTO project_workflow_columns (organization_id, name, color, column_order, is_default)\n  VALUES\n    (org_id, 'Active', '#94A3B8', 0, true)\n  ON CONFLICT (organization_id, name) DO NOTHING;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "create_org_with_owner",
    "arguments": "org_name text, org_code text, found_via text DEFAULT NULL::text, industry text DEFAULT NULL::text, owner_id uuid DEFAULT auth.uid()",
    "definition": "CREATE OR REPLACE FUNCTION public.create_org_with_owner(org_name text, org_code text, found_via text DEFAULT NULL::text, industry text DEFAULT NULL::text, owner_id uuid DEFAULT auth.uid())\n RETURNS TABLE(org_id uuid)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n  new_org_id uuid;\nBEGIN\n  -- Insert organization with industry and found_via\n  INSERT INTO organizations (\n    name,\n    organization_code,\n    industry,\n    found_via,\n    created_at,\n    updated_at\n  ) VALUES (\n    org_name,\n    org_code,\n    industry,\n    found_via,\n    now(),\n    now()\n  )\n  RETURNING id INTO new_org_id;\n\n  -- Insert owner membership\n  INSERT INTO memberships (\n    user_id,\n    organization_id,\n    role,\n    status,\n    joined_at,\n    created_at,\n    updated_at\n  ) VALUES (\n    owner_id,\n    new_org_id,\n    'Owner',\n    'Active',\n    now(),\n    now(),\n    now()\n  );\n\n  -- Return the organization ID\n  RETURN QUERY SELECT new_org_id;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "create_organization_and_link_user",
    "arguments": "org_name text, org_code text, creator_user_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.create_organization_and_link_user(org_name text, org_code text, creator_user_id uuid)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n    new_org_id uuid;\n    result json;\nBEGIN\n\n        -- SECURITY: Ensure user can only create org for themselves\n    IF creator_user_id != auth.uid() THEN\n        RAISE EXCEPTION 'Access denied: Can only create organization for yourself';\n    END IF;\n    \n    -- SECURITY: Validate organization name\n    IF org_name IS NULL OR length(trim(org_name)) < 2 THEN\n        RAISE EXCEPTION 'Organization name must be at least 2 characters';\n    END IF;\n    \n    IF length(org_name) > 100 THEN\n        RAISE EXCEPTION 'Organization name cannot exceed 100 characters';\n    END IF;\n    \n    -- SECURITY: Validate organization code format\n    IF org_code IS NULL OR length(org_code) != 8 THEN\n        RAISE EXCEPTION 'Organization code must be exactly 8 characters';\n    END IF;\n    \n    IF org_code !~ '^[A-Z0-9]{8}$' THEN\n        RAISE EXCEPTION 'Organization code must contain only uppercase letters and numbers';\n    END IF;\n    \n    -- SECURITY: Check if user already has an organization\n    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = creator_user_id AND organization_id IS NOT NULL) THEN\n        RAISE EXCEPTION 'User already belongs to an organization';\n    END IF;\n    \n    -- SECURITY: Ensure organization code is unique\n    IF EXISTS (SELECT 1 FROM public.organizations WHERE organization_code = org_code) THEN\n        RAISE EXCEPTION 'Organization code already exists. Please try again.';\n    END IF;\n    \n    -- SECURITY: Rate limiting - max 3 organization creation attempts per hour\n    PERFORM public.cleanup_org_rate_limits(); -- Clean up old records first\n    \n    IF (SELECT count(*) FROM public.organization_creation_rate_limit WHERE user_id = creator_user_id AND created_at > now() - interval '1 hour') >= 3 THEN\n        RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 organization creation attempts per hour';\n    END IF;\n    \n    -- Record this attempt for rate limiting\n    INSERT INTO public.organization_creation_rate_limit (user_id) VALUES (creator_user_id);\n    \n    -- Create the organization\n    INSERT INTO public.organizations (name, organization_code, organization_info)\n    VALUES (org_name, org_code, '{}'::jsonb)\n    RETURNING id INTO new_org_id;\n    \n    -- Update the user's profile with the organization\n    UPDATE public.profiles \n    SET \n        organization_id = new_org_id,\n        role = 'admin',\n        status = 'active',\n        updated_at = now()\n    WHERE id = creator_user_id;\n    \n    -- Return the organization data\n    SELECT to_json(o.*) INTO result\n    FROM public.organizations o\n    WHERE o.id = new_org_id;\n    \n    RETURN result;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "create_project_on_quote_won",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.create_project_on_quote_won()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  -- Check if status changed to 'Won'\n  IF NEW.status = 'Won' AND (OLD.status IS NULL OR OLD.status != 'Won') THEN\n    -- Create project in Unassigned column\n    INSERT INTO projects (quote_id, workflow_status, organization_id)\n    VALUES (NEW.id, 'Unassigned', NEW.organization_id)\n    ON CONFLICT (quote_id, organization_id) DO NOTHING;\n  END IF;\n\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "create_workflow_columns_for_new_org",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.create_workflow_columns_for_new_org()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  PERFORM create_default_workflow_columns(NEW.id);\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "get_current_user_organization",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.get_current_user_organization()\n RETURNS uuid\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  RETURN (\n    SELECT m.organization_id\n    FROM public.memberships m  -- <- fixed here\n    WHERE m.user_id = auth.uid()\n      AND m.status = 'Active'\n    LIMIT 1\n  );\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "get_current_user_role",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.get_current_user_role()\n RETURNS text\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN (\n    SELECT m.role\n    FROM public.memberships m\n    WHERE m.user_id = auth.uid()\n    AND m.status = 'Active'\n    LIMIT 1\n  );\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "get_org_member_ids",
    "arguments": "target_user_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.get_org_member_ids(target_user_id uuid)\n RETURNS TABLE(user_id uuid)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN QUERY\n  SELECT DISTINCT m2.user_id\n  FROM public.memberships m1\n  JOIN public.memberships m2 ON m1.organization_id = m2.organization_id\n  WHERE m1.user_id = target_user_id\n  AND m1.status = 'Active'  -- Current user must be Active\n  AND m2.status IN ('Active', 'Pending');  -- Can see both Active and Pending members\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "get_organization_by_code",
    "arguments": "input_code text",
    "definition": "CREATE OR REPLACE FUNCTION public.get_organization_by_code(input_code text)\n RETURNS TABLE(id uuid, organization_code text)\n LANGUAGE sql\n SECURITY DEFINER\nAS $function$SET search_path = public;\n\nSELECT id, organization_code\nFROM organizations\nWHERE organization_code = input_code\nLIMIT 1;$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "get_user_org_folders",
    "arguments": "check_user_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.get_user_org_folders(check_user_id uuid)\n RETURNS TABLE(org_folder text)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN QUERY\n  SELECT m.organization_id::text\n  FROM public.memberships m\n  WHERE m.user_id = check_user_id\n  AND m.status = 'Active';\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "get_user_org_ids",
    "arguments": "check_user_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.get_user_org_ids(check_user_id uuid)\n RETURNS TABLE(organization_id uuid)\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN QUERY\n  SELECT m.organization_id\n  FROM public.memberships m\n  WHERE m.user_id = check_user_id\n  AND m.status = 'Active';\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "handle_auth_user_email_sync",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_auth_user_email_sync()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  IF TG_OP = 'INSERT' THEN\n    -- Create profile with email when user signs up\n    INSERT INTO public.profiles (id, email, created_at, updated_at)\n    VALUES (NEW.id, NEW.email, now(), now())\n    ON CONFLICT (id) DO UPDATE SET\n      email = NEW.email,\n      updated_at = now();\n  ELSIF TG_OP = 'UPDATE' AND OLD.email IS DISTINCT FROM NEW.email THEN\n    -- Update profile email when auth email changes\n    UPDATE public.profiles\n    SET email = NEW.email, updated_at = now()\n    WHERE id = NEW.id;\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "handle_new_user",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nBEGIN\n    -- Create the user's profile WITHOUT an organization\n    -- User will choose to create or join organization in the UI flow\n    INSERT INTO public.profiles (id, email, full_name, organization_id, role, status, joined_at)\n    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NULL, 'member', 'pending', now());\n    \n    RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "handle_updated_at",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.handle_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN\n    NEW.updated_at = now();\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "has_org_role",
    "arguments": "check_user_id uuid, check_org_id uuid, required_roles text[]",
    "definition": "CREATE OR REPLACE FUNCTION public.has_org_role(check_user_id uuid, check_org_id uuid, required_roles text[])\n RETURNS boolean\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nDECLARE\n  has_role boolean;\nBEGIN\n  SELECT EXISTS(\n    SELECT 1\n    FROM public.memberships\n    WHERE user_id = check_user_id\n    AND organization_id = check_org_id\n    AND role = ANY(required_roles)\n    AND status = 'Active'\n  ) INTO has_role;\n\n  RETURN has_role;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "has_valid_subscription",
    "arguments": "org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN EXISTS (\n    SELECT 1\n    FROM public.subscriptions s\n    WHERE s.organization_id = org_id\n    AND s.is_active = true\n    AND s.access_blocked = false\n    AND s.stripe_subscription_status IN ('active', 'trialing')\n  );\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "increment_quote_version",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.increment_quote_version()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public'\nAS $function$\nBEGIN\n    IF NEW.date_last_downloaded IS DISTINCT FROM OLD.date_last_downloaded AND NEW.date_last_downloaded IS NOT NULL THEN\n        NEW.version = OLD.version + 1;\n    END IF;\n    RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "is_active_member",
    "arguments": "check_user_id uuid, check_org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.is_active_member(check_user_id uuid, check_org_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nDECLARE\n  is_member boolean;\nBEGIN\n  SELECT EXISTS(\n    SELECT 1\n    FROM public.memberships\n    WHERE user_id = check_user_id\n    AND organization_id = check_org_id\n    AND status = 'Active'\n  ) INTO is_member;\n\n  RETURN is_member;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "is_org_folder_admin",
    "arguments": "check_user_id uuid, folder_name text",
    "definition": "CREATE OR REPLACE FUNCTION public.is_org_folder_admin(check_user_id uuid, folder_name text)\n RETURNS boolean\n LANGUAGE plpgsql\n STABLE SECURITY DEFINER\nAS $function$\nDECLARE\n  is_admin boolean;\n  org_uuid uuid;\nBEGIN\n  -- Convert folder name (text) to UUID\n  BEGIN\n    org_uuid := folder_name::uuid;\n  EXCEPTION WHEN OTHERS THEN\n    RETURN false;\n  END;\n\n  -- Check if user is Owner/Admin in this org\n  SELECT EXISTS(\n    SELECT 1\n    FROM public.memberships\n    WHERE user_id = check_user_id\n    AND organization_id = org_uuid\n    AND status = 'Active'\n    AND role IN ('Owner', 'Admin')\n  ) INTO is_admin;\n\n  RETURN is_admin;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "is_owner_or_admin",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.is_owner_or_admin()\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN get_current_user_role() IN ('Owner', 'Admin');\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "reject_member",
    "arguments": "member_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.reject_member(member_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n    member_org_id uuid;\n    current_user_role text;\nBEGIN\n    -- Get the member's organization from memberships table\n    SELECT organization_id INTO member_org_id\n    FROM public.memberships\n    WHERE user_id = member_id;\n\n    IF member_org_id IS NULL THEN\n        RAISE EXCEPTION 'Membership not found';\n    END IF;\n\n    -- Get current user's role in the organization\n    SELECT role INTO current_user_role\n    FROM public.memberships\n    WHERE user_id = auth.uid()\n    AND organization_id = member_org_id\n    AND status = 'Active';\n\n    -- Check if current user is admin/owner of that organization\n    IF current_user_role NOT IN ('Admin', 'Owner') THEN\n        RAISE EXCEPTION 'Only Admins and Owners can reject members';\n    END IF;\n\n    -- Delete the pending member from memberships table\n    DELETE FROM public.memberships\n    WHERE user_id = member_id\n    AND organization_id = member_org_id\n    AND status = 'Pending';\n\n    RETURN true;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "restore_access",
    "arguments": "org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.restore_access(org_id uuid)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  UPDATE public.subscriptions\n  SET access_blocked = false,\n      access_blocked_reason = NULL,\n      updated_at = now()\n  WHERE organization_id = org_id;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "sync_profile_email",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.sync_profile_email()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  -- Auto-populate email from auth metadata when profile is created\n  IF NEW.email IS NULL THEN\n    NEW.email := NEW.id::text; -- Will be updated by trigger below\n  END IF;\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "sync_project_on_quote_status_change",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.sync_project_on_quote_status_change()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  next_board_order INTEGER;\nBEGIN\n  -- If status changed TO 'Won', create project\n  IF NEW.status = 'Won' AND (OLD.status IS NULL OR OLD.status != 'Won') THEN\n    -- Get the next board_order for the Active column (1-based indexing)\n    SELECT COALESCE(MAX(board_order), 0) + 1 INTO next_board_order\n    FROM projects\n    WHERE workflow_status = 'Active' AND organization_id = NEW.organization_id;\n\n    INSERT INTO projects (quote_id, workflow_status, organization_id, board_order)\n    VALUES (NEW.id, 'Active', NEW.organization_id, next_board_order)\n    ON CONFLICT (quote_id, organization_id) DO NOTHING;\n\n  -- If status changed FROM 'Won' to anything else, delete project and reorder remaining\n  ELSIF OLD.status = 'Won' AND NEW.status != 'Won' THEN\n    -- Store the workflow_status before deletion for reordering\n    DECLARE\n      deleted_status TEXT;\n      deleted_order INTEGER;\n    BEGIN\n      SELECT workflow_status, board_order INTO deleted_status, deleted_order\n      FROM projects\n      WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;\n\n      -- Delete the project\n      DELETE FROM projects\n      WHERE quote_id = NEW.id AND organization_id = NEW.organization_id;\n\n      -- Reorder remaining projects in that column\n      UPDATE projects\n      SET board_order = board_order - 1\n      WHERE workflow_status = deleted_status\n        AND organization_id = NEW.organization_id\n        AND board_order > deleted_order;\n    END;\n  END IF;\n\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "track_quote_status_change",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.track_quote_status_change()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  -- Only track if status actually changed\n  IF NEW.status IS DISTINCT FROM OLD.status THEN\n    -- Insert transition record\n    INSERT INTO quote_status_transitions (\n      quote_id,\n      organization_id,\n      from_status,\n      to_status,\n      transitioned_by\n    ) VALUES (\n      NEW.id,\n      NEW.organization_id,\n      OLD.status,\n      NEW.status,\n      auth.uid()\n    );\n\n    -- Update denormalized timestamp fields on quotes table\n    IF NEW.status = 'Submitted' AND NEW.submitted_at IS NULL THEN\n      NEW.submitted_at = NOW();\n    ELSIF NEW.status = 'Won' THEN\n      NEW.won_at = NOW();\n      NEW.closed_at = NOW();\n    ELSIF NEW.status = 'Rejected' THEN\n      NEW.rejected_at = NOW();\n      NEW.closed_at = NOW();\n    END IF;\n  END IF;\n\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "update_dashboard_configurations_updated_at",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_dashboard_configurations_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = timezone('utc'::text, now());\n    RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "update_member_role",
    "arguments": "member_id uuid, new_role text",
    "definition": "CREATE OR REPLACE FUNCTION public.update_member_role(member_id uuid, new_role text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n    member_org_id uuid;\n    current_user_role text;\n    member_data json;\nBEGIN\n    -- Validate role input (convert to proper case)\n    IF LOWER(new_role) NOT IN ('admin', 'member', 'owner') THEN\n        RAISE EXCEPTION 'Invalid role. Must be Admin, Member, or Owner';\n    END IF;\n\n    -- Normalize the role to match database format (capitalize first letter)\n    new_role := INITCAP(LOWER(new_role));\n\n    -- Get the member's organization from memberships table\n    SELECT organization_id INTO member_org_id\n    FROM public.memberships\n    WHERE user_id = member_id\n    AND status = 'Active';\n\n    IF member_org_id IS NULL THEN\n        RAISE EXCEPTION 'Member not found or not active in any organization';\n    END IF;\n\n    -- Get current user's role in the same organization\n    SELECT role INTO current_user_role\n    FROM public.memberships\n    WHERE user_id = auth.uid()\n    AND organization_id = member_org_id\n    AND status = 'Active';\n\n    -- Check if current user has admin/owner role\n    IF current_user_role NOT IN ('Admin', 'Owner') THEN\n        RAISE EXCEPTION 'Access denied: Only Admins and Owners can update member roles';\n    END IF;\n\n    -- Prevent changing owner role\n    IF EXISTS (\n        SELECT 1 FROM public.memberships\n        WHERE user_id = member_id\n        AND organization_id = member_org_id\n        AND role = 'Owner'\n    ) THEN\n        RAISE EXCEPTION 'Cannot change Owner role. Use transfer_ownership function instead';\n    END IF;\n\n    -- Prevent promoting to Owner (must use transfer_ownership)\n    IF new_role = 'Owner' THEN\n        RAISE EXCEPTION 'Cannot promote to Owner. Use transfer_ownership function instead';\n    END IF;\n\n    -- Update the member's role in memberships table\n    UPDATE public.memberships\n    SET\n        role = new_role,\n        updated_at = NOW()\n    WHERE user_id = member_id\n    AND organization_id = member_org_id;\n\n    -- Return updated member data\n    SELECT json_build_object(\n        'user_id', m.user_id,\n        'organization_id', m.organization_id,\n        'role', m.role,\n        'status', m.status,\n        'updated_at', m.updated_at\n    ) INTO member_data\n    FROM public.memberships m\n    WHERE m.user_id = member_id\n    AND m.organization_id = member_org_id;\n\n    RETURN member_data;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "update_org_creator_profile",
    "arguments": "user_id uuid, org_id uuid DEFAULT NULL::uuid, role_value text DEFAULT 'Admin'::text, status_value text DEFAULT 'Active'::text",
    "definition": "CREATE OR REPLACE FUNCTION public.update_org_creator_profile(user_id uuid, org_id uuid DEFAULT NULL::uuid, role_value text DEFAULT 'Admin'::text, status_value text DEFAULT 'Active'::text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n  result json;\nBEGIN\n  -- Validate inputs\n  IF role_value NOT IN ('Owner', 'Admin', 'Member') THEN\n    RETURN json_build_object('success', false, 'error', 'Invalid role');\n  END IF;\n\n  IF status_value NOT IN ('Pending', 'Active', 'Suspended') THEN\n    RETURN json_build_object('success', false, 'error', 'Invalid status');\n  END IF;\n\n  UPDATE public.memberships\n  SET role = role_value,\n      status = status_value,\n      updated_at = now()\n  WHERE user_id = update_org_creator_profile.user_id\n    AND (org_id IS NULL OR organization_id = org_id);\n\n  IF FOUND THEN\n    SELECT json_build_object('success', true, 'role', role_value, 'status', status_value) INTO result;\n  ELSE\n    SELECT json_build_object('success', false, 'error', 'memberships not found') INTO result;\n  END IF;\n\n  RETURN result;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "update_product_series_timestamp",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_product_series_timestamp()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "update_quote_analytics_fields",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_quote_analytics_fields()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  -- Extract total value from price_details JSONB\n  IF NEW.price_details IS NOT NULL THEN\n    NEW.total_value = (NEW.price_details->>'final_selling_price')::DECIMAL;\n\n    -- Calculate margin if we have both selling price and cost\n    IF NEW.price_details->>'total_cost' IS NOT NULL AND\n       NEW.price_details->>'final_selling_price' IS NOT NULL THEN\n      NEW.margin_percentage = (\n        ((NEW.price_details->>'final_selling_price')::DECIMAL -\n         (NEW.price_details->>'total_cost')::DECIMAL) /\n        NULLIF((NEW.price_details->>'final_selling_price')::DECIMAL, 0) * 100\n      );\n    END IF;\n  END IF;\n\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "update_reminders_updated_at",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_reminders_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "update_status_timestamp",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_status_timestamp()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Only update timestamp if status actually changed\n    IF NEW.status IS DISTINCT FROM OLD.status THEN\n        NEW.status_last_updated := NOW();\n    END IF;\n\n    RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "update_updated_at_column",
    "arguments": "",
    "definition": "CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  NEW.updated_at = CURRENT_TIMESTAMP;\n  RETURN NEW;\nEND;\n$function$\n",
    "security": "SECURITY INVOKER"
  },
  {
    "schema": "public",
    "function_name": "update_user_profile",
    "arguments": "user_id uuid, full_name_value text",
    "definition": "CREATE OR REPLACE FUNCTION public.update_user_profile(user_id uuid, full_name_value text)\n RETURNS json\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\nDECLARE\n    result json;\nBEGIN\n    \n    -- SECURITY: Ensure user can only update their own profile\n    IF user_id != auth.uid() THEN\n        RAISE EXCEPTION 'Access denied: Can only update own profile';\n    END IF;\n    \n    -- SECURITY: Validate full name input\n    IF full_name_value IS NULL OR length(trim(full_name_value)) < 1 THEN\n        RAISE EXCEPTION 'Full name cannot be empty';\n    END IF;\n    \n    IF length(full_name_value) > 100 THEN\n        RAISE EXCEPTION 'Full name cannot exceed 100 characters';\n    END IF;\n    \n    -- Update the profile with full name\n    UPDATE public.profiles \n    SET \n        full_name = full_name_value,\n        updated_at = now()\n    WHERE id = user_id;\n    \n    -- If no profile was updated (doesn't exist), create one\n    IF NOT FOUND THEN\n        INSERT INTO public.profiles (id, email, full_name)\n        SELECT user_id, au.email, full_name_value\n        FROM auth.users au\n        WHERE au.id = user_id;\n    END IF;\n    \n    -- Return the updated profile\n    SELECT to_json(p.*) INTO result\n    FROM public.profiles p\n    WHERE p.id = user_id;\n    \n    RETURN result;\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "user_has_admin_role_in_org",
    "arguments": "org_id uuid",
    "definition": "CREATE OR REPLACE FUNCTION public.user_has_admin_role_in_org(org_id uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  RETURN EXISTS (\n    SELECT 1 FROM public.memberships m\n    WHERE m.user_id = auth.uid()\n    AND m.organization_id = org_id\n    AND m.role IN ('Owner', 'Admin')\n    AND m.status = 'Active'\n  );\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  },
  {
    "schema": "public",
    "function_name": "user_has_role_in_org",
    "arguments": "org_id uuid, required_role text",
    "definition": "CREATE OR REPLACE FUNCTION public.user_has_role_in_org(org_id uuid, required_role text)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n  -- Validate role input\n  IF required_role NOT IN ('Owner', 'Admin', 'Member') THEN\n    RETURN false;\n  END IF;\n\n  RETURN EXISTS (\n    SELECT 1 FROM public.memberships m\n    WHERE m.user_id = auth.uid()\n    AND m.organization_id = org_id\n    AND m.role = required_role\n    AND m.status = 'Active'\n  );\nEND;\n$function$\n",
    "security": "SECURITY DEFINER"
  }
]

---

## RLS Policies

[
  {
    "schemaname": "public",
    "tablename": "form_definitions",
    "policyname": "Users can create forms in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "form_definitions",
    "policyname": "Users can delete forms in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "form_definitions",
    "policyname": "Users can update forms in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "form_definitions",
    "policyname": "Users can view forms in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "form_submissions",
    "policyname": "Users can create submissions in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "form_submissions",
    "policyname": "Users can delete submissions in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "form_submissions",
    "policyname": "Users can update submissions in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "form_submissions",
    "policyname": "Users can view submissions in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "invite_tokens",
    "policyname": "Admins can create invite tokens for their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Admin'::text, 'Owner'::text])))))"
  },
  {
    "schemaname": "public",
    "tablename": "invite_tokens",
    "policyname": "Admins can delete invite tokens for their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Admin'::text, 'Owner'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "invite_tokens",
    "policyname": "Admins can update invite tokens for their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Admin'::text, 'Owner'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "invite_tokens",
    "policyname": "Users can view invite tokens for their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "memberships",
    "policyname": "memberships_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "memberships",
    "policyname": "memberships_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "memberships",
    "policyname": "memberships_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "can_view_membership(auth.uid(), user_id, organization_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "memberships",
    "policyname": "memberships_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organization_creation_log",
    "policyname": "creation_log_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "is_owner_or_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organization_creation_log",
    "policyname": "creation_log_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "organization_creation_log",
    "policyname": "creation_log_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((user_id = auth.uid()) OR is_owner_or_admin())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organization_creation_log",
    "policyname": "creation_log_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organizations",
    "policyname": "Allow users to search organizations by code",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organizations",
    "policyname": "Authenticated users can create organizations",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "organizations",
    "policyname": "Only members can update their organization",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "has_org_role(auth.uid(), id, ARRAY['Owner'::text, 'Admin'::text])",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organizations",
    "policyname": "organizations_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.organization_id = organizations.id) AND (m.user_id = auth.uid()) AND (m.role = 'Owner'::text) AND (m.status = 'Active'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "organizations",
    "policyname": "organizations_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() IS NOT NULL)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "Users can view profiles in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM (memberships m1\n     JOIN memberships m2 ON ((m1.organization_id = m2.organization_id)))\n  WHERE ((m1.user_id = auth.uid()) AND (m1.status = 'Active'::text) AND (m2.user_id = profiles.id)))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = id)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((auth.uid() = id) OR (id IN ( SELECT get_org_member_ids.user_id\n   FROM get_org_member_ids(auth.uid()) get_org_member_ids(user_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "profiles_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": "(auth.uid() = id)"
  },
  {
    "schemaname": "public",
    "tablename": "project_workflow_columns",
    "policyname": "Admins can manage workflow columns",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.role = ANY (ARRAY['Owner'::text, 'Admin'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "project_workflow_columns",
    "policyname": "Users can view workflow columns in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "projects",
    "policyname": "Users can create projects in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))"
  },
  {
    "schemaname": "public",
    "tablename": "projects",
    "policyname": "Users can delete projects in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "projects",
    "policyname": "Users can update projects in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "projects",
    "policyname": "Users can view projects in their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE (memberships.user_id = auth.uid())))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quote_activities",
    "policyname": "Users can insert activities for their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "quote_activities",
    "policyname": "Users can view activities from their organization",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quote_activities",
    "policyname": "quote_activities_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(is_active_member(auth.uid(), organization_id) AND (user_id = auth.uid()))"
  },
  {
    "schemaname": "public",
    "tablename": "quote_activities",
    "policyname": "quote_activities_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_active_member(auth.uid(), organization_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quote_status_transitions",
    "policyname": "System can insert transitions",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "quote_status_transitions",
    "policyname": "Users can view transitions in their org",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quotes",
    "policyname": "quotes_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(((organization_id IS NULL) AND (auth.uid() = created_by)) OR ((organization_id = get_current_user_organization()) AND (EXISTS ( SELECT 1\n   FROM memberships m\n  WHERE ((m.user_id = auth.uid()) AND (m.organization_id = quotes.organization_id) AND (m.status = 'Active'::text))))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quotes",
    "policyname": "quotes_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(is_active_member(auth.uid(), organization_id) AND (created_by = auth.uid()))"
  },
  {
    "schemaname": "public",
    "tablename": "quotes",
    "policyname": "quotes_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_active_member(auth.uid(), organization_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quotes",
    "policyname": "quotes_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_active_member(auth.uid(), organization_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quotes_formbuilder_test",
    "policyname": "Anybody can delete quotes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Owner'::text, 'Admin'::text, 'Member'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quotes_formbuilder_test",
    "policyname": "Members can create quotes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))) AND (created_by = auth.uid()))"
  },
  {
    "schemaname": "public",
    "tablename": "quotes_formbuilder_test",
    "policyname": "Members can update quotes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "quotes_formbuilder_test",
    "policyname": "Users can view their org's quotes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(organization_id IN ( SELECT memberships.organization_id\n   FROM memberships\n  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Active members can create organization reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(is_active_member(auth.uid(), organization_id) AND (created_by = auth.uid()))"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Active members can delete organization reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(is_active_member(auth.uid(), organization_id) AND ((created_by = auth.uid()) OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Active members can update organization reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(is_active_member(auth.uid(), organization_id) AND ((created_by = auth.uid()) OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Active members can view organization reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_active_member(auth.uid(), organization_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscription_plans",
    "policyname": "subscription_plans_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_active = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "subscriptions_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((auth.uid() IS NOT NULL) AND (organization_id IN ( SELECT m.organization_id\n   FROM memberships m\n  WHERE ((m.user_id = auth.uid()) AND (m.role = 'Owner'::text) AND (m.status = 'Active'::text)))))"
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "subscriptions_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_active_member(auth.uid(), organization_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "subscriptions_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text])",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_onboarding_progress",
    "policyname": "onboarding_delete_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_onboarding_progress",
    "policyname": "onboarding_insert_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "user_onboarding_progress",
    "policyname": "onboarding_select_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "user_onboarding_progress",
    "policyname": "onboarding_update_policy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))",
    "with_check": "((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))"
  }
]

---

## RLS Tables Enabled

[
  {
    "schemaname": "public",
    "tablename": "user_onboarding_progress",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "quotes_formbuilder_test",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "organizations",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "quotes",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "dashboard_configurations",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "subscription_plans",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "memberships",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "quote_activities",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "invite_tokens",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "form_definitions",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "organization_creation_log",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "form_submissions",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "project_workflow_columns",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "projects",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "quote_status_transitions",
    "rls_enabled": true
  },
  {
    "schemaname": "public",
    "tablename": "product_types",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "product_series",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "product_categories",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "product_manufacturers",
    "rls_enabled": false
  },
  {
    "schemaname": "public",
    "tablename": "product_models",
    "rls_enabled": false
  }
]