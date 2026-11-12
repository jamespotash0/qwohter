-- Repair: re-apply constraints and indexes for the new project.
-- Safe to re-run. Objects that already exist are skipped silently;
-- anything else is reported as a WARNING instead of aborting the run,
-- so a genuine problem is visible rather than swallowed.
-- Constraints: 189  Indexes: 214

DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_agent_runs"
      ADD CONSTRAINT "ai_agent_runs_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_capability_gaps"
      ADD CONSTRAINT "ai_capability_gaps_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_messages"
      ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_suggestions"
      ADD CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_user_feedback"
      ADD CONSTRAINT "ai_user_feedback_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."auth_rate_limits"
      ADD CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."available_integrations"
      ADD CONSTRAINT "available_integrations_integration_type_key" UNIQUE ("integration_type");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."available_integrations"
      ADD CONSTRAINT "available_integrations_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."calendar_events"
      ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."contacts"
      ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_retry_queue"
      ADD CONSTRAINT "email_notification_queue_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."forms"
      ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."google_oauth_tokens"
      ADD CONSTRAINT "google_oauth_tokens_organization_id_key" UNIQUE ("organization_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."google_oauth_tokens"
      ADD CONSTRAINT "google_oauth_tokens_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."integrations"
      ADD CONSTRAINT "integrations_organization_id_integration_type_key" UNIQUE ("organization_id", "integration_type");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."integrations"
      ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."invite_token_attempts"
      ADD CONSTRAINT "invite_token_attempts_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."invite_tokens"
      ADD CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."invite_tokens"
      ADD CONSTRAINT "invite_tokens_token_key" UNIQUE ("token");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."memberships"
      ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."memberships"
      ADD CONSTRAINT "memberships_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_preferences"
      ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_preferences"
      ADD CONSTRAINT "notification_preferences_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notifications"
      ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."organization_creation_log"
      ADD CONSTRAINT "organization_creation_log_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."organizations"
      ADD CONSTRAINT "organizations_fax_number_key" UNIQUE ("fax_number");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."organizations"
      ADD CONSTRAINT "organizations_phone_number_key" UNIQUE ("phone_number");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."organizations"
      ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."password_reset_audit"
      ADD CONSTRAINT "password_reset_audit_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."products"
      ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."products"
      ADD CONSTRAINT "products_unique_display_id_per_org" UNIQUE ("organization_id", "display_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."profiles"
      ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_attachments"
      ADD CONSTRAINT "project_attachments_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_reference_unique" UNIQUE ("organization_id", "reference");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_workflow_columns"
      ADD CONSTRAINT "project_workflow_columns_organization_id_name_key" UNIQUE ("organization_id", "name");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_workflow_columns"
      ADD CONSTRAINT "project_workflow_columns_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."projects"
      ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_approval_requests"
      ADD CONSTRAINT "proposal_approval_requests_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_documents"
      ADD CONSTRAINT "proposal_documents_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signatures"
      ADD CONSTRAINT "proposal_signatures_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_activity"
      ADD CONSTRAINT "proposal_signing_activity_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_tokens"
      ADD CONSTRAINT "proposal_signing_tokens_access_token_key" UNIQUE ("access_token");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_tokens"
      ADD CONSTRAINT "proposal_signing_tokens_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposals"
      ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposals"
      ADD CONSTRAINT "proposals_proposal_number_key" UNIQUE ("proposal_number");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_status_transitions"
      ADD CONSTRAINT "proposal_status_transitions_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."scheduled_notifications"
      ADD CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."security_audit_log"
      ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."signup_invites"
      ADD CONSTRAINT "signup_invites_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."signup_invites"
      ADD CONSTRAINT "signup_invites_token_key" UNIQUE ("token");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."stripe_webhook_events"
      ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."stripe_webhook_events"
      ADD CONSTRAINT "stripe_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscription_plans"
      ADD CONSTRAINT "subscription_plans_name_key" UNIQUE ("name");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscription_plans"
      ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscription_plans"
      ADD CONSTRAINT "subscription_plans_stripe_product_id_key" UNIQUE ("stripe_product_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscription_seat_usage_events"
      ADD CONSTRAINT "subscription_seat_usage_events_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscriptions"
      ADD CONSTRAINT "subscriptions_organization_id_key" UNIQUE ("organization_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscriptions"
      ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscriptions"
      ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscriptions"
      ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_activities"
      ADD CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_attachments"
      ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_board_columns"
      ADD CONSTRAINT "task_board_columns_organization_id_slug_key" UNIQUE ("organization_id", "slug");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_board_columns"
      ADD CONSTRAINT "task_board_columns_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_comments"
      ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."user_onboarding_progress"
      ADD CONSTRAINT "user_onboarding_progress_pkey" PRIMARY KEY ("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."user_onboarding_progress"
      ADD CONSTRAINT "user_onboarding_progress_user_id_key" UNIQUE ("user_id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_agent_runs"
      ADD CONSTRAINT "ai_agent_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_agent_runs"
      ADD CONSTRAINT "ai_agent_runs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_agent_runs"
      ADD CONSTRAINT "ai_agent_runs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_capability_gaps"
      ADD CONSTRAINT "ai_capability_gaps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_capability_gaps"
      ADD CONSTRAINT "ai_capability_gaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_messages"
      ADD CONSTRAINT "ai_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_messages"
      ADD CONSTRAINT "ai_messages_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_messages"
      ADD CONSTRAINT "ai_messages_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_messages"
      ADD CONSTRAINT "ai_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_suggestions"
      ADD CONSTRAINT "ai_suggestions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_suggestions"
      ADD CONSTRAINT "ai_suggestions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_suggestions"
      ADD CONSTRAINT "ai_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_user_feedback"
      ADD CONSTRAINT "ai_user_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_user_feedback"
      ADD CONSTRAINT "ai_user_feedback_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_user_feedback"
      ADD CONSTRAINT "ai_user_feedback_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."ai_user_feedback"
      ADD CONSTRAINT "ai_user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."calendar_events"
      ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."calendar_events"
      ADD CONSTRAINT "calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."contacts"
      ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."contacts"
      ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."contacts"
      ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_retry_queue"
      ADD CONSTRAINT "email_notification_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_retry_queue"
      ADD CONSTRAINT "email_notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."forms"
      ADD CONSTRAINT "forms_copied_from_form_id_fkey" FOREIGN KEY ("copied_from_form_id") REFERENCES "public"."forms"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."forms"
      ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."forms"
      ADD CONSTRAINT "forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."google_oauth_tokens"
      ADD CONSTRAINT "google_oauth_tokens_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."google_oauth_tokens"
      ADD CONSTRAINT "google_oauth_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."integrations"
      ADD CONSTRAINT "integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."invite_tokens"
      ADD CONSTRAINT "invite_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."invite_tokens"
      ADD CONSTRAINT "invite_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."memberships"
      ADD CONSTRAINT "memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."memberships"
      ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."memberships"
      ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_preferences"
      ADD CONSTRAINT "notification_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notification_preferences"
      ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notifications"
      ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."notifications"
      ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."organization_creation_log"
      ADD CONSTRAINT "organization_creation_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."products"
      ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."products"
      ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."profiles"
      ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_attachments"
      ADD CONSTRAINT "project_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_attachments"
      ADD CONSTRAINT "project_attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_attachments"
      ADD CONSTRAINT "project_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_tasks"
      ADD CONSTRAINT "project_tasks_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."project_workflow_columns"
      ADD CONSTRAINT "project_workflow_columns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."projects"
      ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."projects"
      ADD CONSTRAINT "projects_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_approval_requests"
      ADD CONSTRAINT "proposal_approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_approval_requests"
      ADD CONSTRAINT "proposal_approval_requests_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_approval_requests"
      ADD CONSTRAINT "proposal_approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_approval_requests"
      ADD CONSTRAINT "proposal_approval_requests_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_documents"
      ADD CONSTRAINT "proposal_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_documents"
      ADD CONSTRAINT "proposal_documents_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_documents"
      ADD CONSTRAINT "proposal_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signatures"
      ADD CONSTRAINT "proposal_signatures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signatures"
      ADD CONSTRAINT "proposal_signatures_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signatures"
      ADD CONSTRAINT "proposal_signatures_signing_token_id_fkey" FOREIGN KEY ("signing_token_id") REFERENCES "public"."proposal_signing_tokens"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_activity"
      ADD CONSTRAINT "proposal_signing_activity_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_activity"
      ADD CONSTRAINT "proposal_signing_activity_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_activity"
      ADD CONSTRAINT "proposal_signing_activity_signing_token_id_fkey" FOREIGN KEY ("signing_token_id") REFERENCES "public"."proposal_signing_tokens"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_tokens"
      ADD CONSTRAINT "proposal_signing_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_tokens"
      ADD CONSTRAINT "proposal_signing_tokens_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_signing_tokens"
      ADD CONSTRAINT "proposal_signing_tokens_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposals"
      ADD CONSTRAINT "proposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposals"
      ADD CONSTRAINT "proposals_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON UPDATE CASCADE ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposals"
      ADD CONSTRAINT "proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_status_transitions"
      ADD CONSTRAINT "proposal_status_transitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."proposal_status_transitions"
      ADD CONSTRAINT "proposal_status_transitions_transitioned_by_fkey" FOREIGN KEY ("transitioned_by") REFERENCES "auth"."users"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."scheduled_notifications"
      ADD CONSTRAINT "scheduled_notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."scheduled_notifications"
      ADD CONSTRAINT "scheduled_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."scheduled_notifications"
      ADD CONSTRAINT "scheduled_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."signup_invites"
      ADD CONSTRAINT "signup_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."signup_invites"
      ADD CONSTRAINT "signup_invites_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "auth"."users"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."signup_invites"
      ADD CONSTRAINT "signup_invites_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "auth"."users"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscription_seat_usage_events"
      ADD CONSTRAINT "subscription_seat_usage_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscription_seat_usage_events"
      ADD CONSTRAINT "subscription_seat_usage_events_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscriptions"
      ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."subscriptions"
      ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_activities"
      ADD CONSTRAINT "task_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_activities"
      ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_activities"
      ADD CONSTRAINT "task_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_attachments"
      ADD CONSTRAINT "task_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_attachments"
      ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_attachments"
      ADD CONSTRAINT "task_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_board_columns"
      ADD CONSTRAINT "task_board_columns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_comments"
      ADD CONSTRAINT "task_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_comments"
      ADD CONSTRAINT "task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_comments"
      ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."task_comments"
      ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE ONLY "public"."user_onboarding_progress"
      ADD CONSTRAINT "user_onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;
DO $repair$ BEGIN
  ALTER TABLE public.auth_rate_limits
    ADD CONSTRAINT auth_rate_limits_attempt_type_check
    CHECK (attempt_type = ANY (ARRAY[
      'login'::text,
      'otp'::text,
      'password_reset'::text,
      'signup'::text,
      'signing-get'::text,
      'signing-submit'::text,
      'signing-view'::text
    ]));
EXCEPTION
  WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
  WHEN others THEN RAISE WARNING 'skipped [%] %', SQLSTATE, SQLERRM;
END $repair$;

CREATE INDEX IF NOT EXISTS "idx_ai_agent_runs_org" ON "public"."ai_agent_runs" USING "btree" ("organization_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_agent_runs_proposal" ON "public"."ai_agent_runs" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_runs_status" ON "public"."ai_agent_runs" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_ai_agent_runs_type" ON "public"."ai_agent_runs" USING "btree" ("agent_type");
CREATE INDEX IF NOT EXISTS "idx_ai_capability_gaps_category" ON "public"."ai_capability_gaps" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "idx_ai_capability_gaps_created_at" ON "public"."ai_capability_gaps" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_capability_gaps_org_id" ON "public"."ai_capability_gaps" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_feedback_has_content" ON "public"."ai_user_feedback" USING "btree" ("organization_id", "created_at" DESC) WHERE ("message_content" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_ai_feedback_message" ON "public"."ai_user_feedback" USING "btree" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_ai_feedback_org" ON "public"."ai_user_feedback" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_feedback_suggestion" ON "public"."ai_user_feedback" USING "btree" ("suggestion_id");
CREATE INDEX IF NOT EXISTS "idx_ai_feedback_user" ON "public"."ai_user_feedback" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_messages_organization" ON "public"."ai_messages" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_ai_messages_proposal" ON "public"."ai_messages" USING "btree" ("proposal_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_messages_user" ON "public"."ai_messages" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_created" ON "public"."ai_suggestions" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_org_status" ON "public"."ai_suggestions" USING "btree" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_proposal_status" ON "public"."ai_suggestions" USING "btree" ("proposal_id", "status");
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_type_status" ON "public"."ai_suggestions" USING "btree" ("suggestion_type", "status");
CREATE INDEX IF NOT EXISTS "idx_ai_suggestions_user_status" ON "public"."ai_suggestions" USING "btree" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_org" ON "public"."proposal_approval_requests" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_proposal" ON "public"."proposal_approval_requests" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_requested_by" ON "public"."proposal_approval_requests" USING "btree" ("requested_by");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_responded_by" ON "public"."proposal_approval_requests" USING "btree" ("responded_by");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_status" ON "public"."proposal_approval_requests" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_auth_rate_limits_blocked" ON "public"."auth_rate_limits" USING "btree" ("blocked_until") WHERE ("blocked_until" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_auth_rate_limits_lookup" ON "public"."auth_rate_limits" USING "btree" ("identifier", "identifier_type", "attempt_type");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_created_by" ON "public"."calendar_events" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_date_range" ON "public"."calendar_events" USING "btree" ("organization_id", "start_date", "end_date");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_event_type" ON "public"."calendar_events" USING "btree" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_organization" ON "public"."calendar_events" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_start_date" ON "public"."calendar_events" USING "btree" ("start_date");
CREATE INDEX IF NOT EXISTS "idx_contacts_created_by" ON "public"."contacts" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_contacts_emails_gin" ON "public"."contacts" USING "gin" ("emails");
CREATE INDEX IF NOT EXISTS "idx_contacts_full_name" ON "public"."contacts" USING "btree" ("full_name");
CREATE INDEX IF NOT EXISTS "idx_contacts_organization_id" ON "public"."contacts" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_contacts_type" ON "public"."contacts" USING "btree" ("contact_type");
CREATE INDEX IF NOT EXISTS "idx_contacts_user_id" ON "public"."contacts" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_creation_log_user_timestamp" ON "public"."organization_creation_log" USING "btree" ("user_id", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_email_notification_queue_org" ON "public"."notification_retry_queue" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_email_queue_status_scheduled" ON "public"."notification_retry_queue" USING "btree" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "idx_email_queue_user" ON "public"."notification_retry_queue" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_forms_copied_from_form" ON "public"."forms" USING "btree" ("copied_from_form_id") WHERE ("copied_from_form_id" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_forms_created_by" ON "public"."forms" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_forms_is_archived" ON "public"."forms" USING "btree" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_forms_is_default" ON "public"."forms" USING "btree" ("organization_id", "is_default") WHERE ("is_default" = true);
CREATE INDEX IF NOT EXISTS "idx_forms_is_template" ON "public"."forms" USING "btree" ("is_template") WHERE ("is_template" = true);
CREATE INDEX IF NOT EXISTS "idx_forms_organization_id" ON "public"."forms" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_google_oauth_tokens_connected_by" ON "public"."google_oauth_tokens" USING "btree" ("connected_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_google_oauth_tokens_org" ON "public"."google_oauth_tokens" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_google_oauth_tokens_risc_event" ON "public"."google_oauth_tokens" USING "btree" ((("last_risc_event" ->> 'event_type'::"text"))) WHERE ("last_risc_event" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_google_oauth_tokens_valid" ON "public"."google_oauth_tokens" USING "btree" ("organization_id", "is_valid") WHERE ("is_valid" = true);
CREATE INDEX IF NOT EXISTS "idx_invite_attempts_ip_time" ON "public"."invite_token_attempts" USING "btree" ("ip_address", "attempted_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_invite_attempts_token_time" ON "public"."invite_token_attempts" USING "btree" ("invite_token", "attempted_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_invite_attempts_user_time" ON "public"."invite_token_attempts" USING "btree" ("user_id", "attempted_at" DESC) WHERE ("user_id" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_invite_tokens_created_by" ON "public"."invite_tokens" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_invite_tokens_expires_at" ON "public"."invite_tokens" USING "btree" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_invite_tokens_is_used" ON "public"."invite_tokens" USING "btree" ("is_used");
CREATE INDEX IF NOT EXISTS "idx_invite_tokens_org_id" ON "public"."invite_tokens" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_invite_tokens_revoked" ON "public"."invite_tokens" USING "btree" ("organization_id", "revoked_at") WHERE ("revoked_at" IS NULL);
CREATE INDEX IF NOT EXISTS "idx_invite_tokens_token" ON "public"."invite_tokens" USING "btree" ("token");
CREATE INDEX IF NOT EXISTS "idx_memberships_department" ON "public"."memberships" USING "btree" ("department") WHERE ("department" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_memberships_invited_by" ON "public"."memberships" USING "btree" ("invited_by");
CREATE INDEX IF NOT EXISTS "idx_memberships_join_type" ON "public"."memberships" USING "btree" ("join_type") WHERE ("join_type" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_memberships_org_status" ON "public"."memberships" USING "btree" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_memberships_user_org" ON "public"."memberships" USING "btree" ("user_id", "organization_id");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_org" ON "public"."notification_preferences" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_user_org" ON "public"."notification_preferences" USING "btree" ("user_id", "organization_id");
CREATE INDEX IF NOT EXISTS "idx_notification_retry_queue_pending" ON "public"."notification_retry_queue" USING "btree" ("status", "next_retry_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'retrying'::"text"]));
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_organization_id" ON "public"."notifications" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);
CREATE INDEX IF NOT EXISTS "idx_onboarding_expires_at" ON "public"."user_onboarding_progress" USING "btree" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_onboarding_user_id" ON "public"."user_onboarding_progress" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_organizations_has_logo" ON "public"."organizations" USING "btree" ((("logo_data" IS NOT NULL))) WHERE ("logo_data" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_password_reset_audit_email" ON "public"."password_reset_audit" USING "btree" ("email", "requested_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_products_category" ON "public"."products" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "idx_products_created_by" ON "public"."products" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_products_name" ON "public"."products" USING "btree" ("name");
CREATE INDEX IF NOT EXISTS "idx_products_organization_id" ON "public"."products" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_products_product_number" ON "public"."products" USING "btree" ("organization_id", "product_number");
CREATE INDEX IF NOT EXISTS "idx_profiles_is_super_admin" ON "public"."profiles" USING "btree" ("is_super_admin") WHERE ("is_super_admin" = true);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");
CREATE INDEX IF NOT EXISTS "idx_project_attachments_category" ON "public"."project_attachments" USING "btree" ("category");
CREATE INDEX IF NOT EXISTS "idx_project_attachments_created_at" ON "public"."project_attachments" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_project_attachments_organization_id" ON "public"."project_attachments" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_project_attachments_project_id" ON "public"."project_attachments" USING "btree" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_attachments_uploaded_by" ON "public"."project_attachments" USING "btree" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_assigned_to" ON "public"."project_tasks" USING "btree" ("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_created_at" ON "public"."project_tasks" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_project_tasks_created_by" ON "public"."project_tasks" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_due_date" ON "public"."project_tasks" USING "btree" ("due_date");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_org_status_position" ON "public"."project_tasks" USING "btree" ("organization_id", "status", "position");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_organization_id" ON "public"."project_tasks" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_priority" ON "public"."project_tasks" USING "btree" ("priority");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_project_id" ON "public"."project_tasks" USING "btree" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_proposal_id" ON "public"."project_tasks" USING "btree" ("proposal_id") WHERE ("proposal_id" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_project_tasks_reference" ON "public"."project_tasks" USING "btree" ("organization_id", "reference");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_status" ON "public"."project_tasks" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_project_workflow_columns_org" ON "public"."project_workflow_columns" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_projects_organization" ON "public"."projects" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_projects_proposal" ON "public"."projects" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_projects_timeline_milestones" ON "public"."projects" USING "gin" ("timeline_milestones");
CREATE INDEX IF NOT EXISTS "idx_projects_workflow_status" ON "public"."projects" USING "btree" ("workflow_status");
CREATE INDEX IF NOT EXISTS "idx_proposal_documents_organization_id" ON "public"."proposal_documents" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_proposal_documents_proposal_id" ON "public"."proposal_documents" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_proposal_documents_tab_key" ON "public"."proposal_documents" USING "btree" ("tab_key") WHERE ("tab_key" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_proposal_documents_uploaded_by" ON "public"."proposal_documents" USING "btree" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_proposal_signatures_token" ON "public"."proposal_signatures" USING "btree" ("signing_token_id");
CREATE INDEX IF NOT EXISTS "idx_proposal_signing_activity_org" ON "public"."proposal_signing_activity" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_proposal_signing_tokens_sent_by" ON "public"."proposal_signing_tokens" USING "btree" ("sent_by");
CREATE INDEX IF NOT EXISTS "idx_proposal_transitions_org_date" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_proposal_transitions_proposal" ON "public"."proposal_status_transitions" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_proposal_transitions_rejected" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC) WHERE ("to_status" = 'Rejected'::"text");
CREATE INDEX IF NOT EXISTS "idx_proposal_transitions_status_date" ON "public"."proposal_status_transitions" USING "btree" ("to_status", "transitioned_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_proposal_transitions_submitted" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC) WHERE ("to_status" = 'Submitted'::"text");
CREATE INDEX IF NOT EXISTS "idx_proposal_transitions_won" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC) WHERE ("to_status" = 'Won'::"text");
CREATE INDEX IF NOT EXISTS "idx_proposals_client_company" ON "public"."proposals" USING "btree" ("client_company");
CREATE INDEX IF NOT EXISTS "idx_proposals_completed_at" ON "public"."proposals" USING "btree" ("completed_at") WHERE ("completed_at" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_proposals_created_by" ON "public"."proposals" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_proposals_created_by_name" ON "public"."proposals" USING "btree" ("created_by_name");
CREATE INDEX IF NOT EXISTS "idx_proposals_document_type" ON "public"."proposals" USING "btree" ("organization_id", "document_type");
CREATE INDEX IF NOT EXISTS "idx_proposals_documents_count" ON "public"."proposals" USING "btree" ("documents_count") WHERE ("documents_count" > 0);
CREATE INDEX IF NOT EXISTS "idx_proposals_form_id" ON "public"."proposals" USING "btree" ("form_id");
CREATE INDEX IF NOT EXISTS "idx_proposals_is_complete" ON "public"."proposals" USING "btree" ("is_complete");
CREATE INDEX IF NOT EXISTS "idx_proposals_is_on_board" ON "public"."proposals" USING "btree" ("organization_id", "is_on_board") WHERE ("is_on_board" = true);
CREATE INDEX IF NOT EXISTS "idx_proposals_job_location" ON "public"."proposals" USING "btree" ("job_location");
CREATE INDEX IF NOT EXISTS "idx_proposals_org_client" ON "public"."proposals" USING "btree" ("organization_id", "client_company");
CREATE INDEX IF NOT EXISTS "idx_proposals_organization_id" ON "public"."proposals" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_proposals_organization_name" ON "public"."proposals" USING "btree" ("organization_name");
CREATE INDEX IF NOT EXISTS "idx_proposals_proposal_number" ON "public"."proposals" USING "btree" ("proposal_number");
CREATE INDEX IF NOT EXISTS "idx_proposals_proposal_source" ON "public"."proposals" USING "btree" ("proposal_source") WHERE ("proposal_source" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_proposals_proposal_status" ON "public"."proposals" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_proposals_total_value" ON "public"."proposals" USING "btree" ("total_value") WHERE ("total_value" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_proposal_status_transitions_transitioned_by" ON "public"."proposal_status_transitions" USING "btree" ("transitioned_by");
CREATE INDEX IF NOT EXISTS "idx_scheduled_notifications_entity" ON "public"."scheduled_notifications" USING "btree" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_notifications_org" ON "public"."scheduled_notifications" USING "btree" ("organization_id", "status");
CREATE INDEX IF NOT EXISTS "idx_scheduled_notifications_pending" ON "public"."scheduled_notifications" USING "btree" ("scheduled_for") WHERE ("status" = 'pending'::"text");
CREATE INDEX IF NOT EXISTS "idx_scheduled_notifications_user" ON "public"."scheduled_notifications" USING "btree" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_seat_usage_created_at" ON "public"."subscription_seat_usage_events" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_seat_usage_subscription_id" ON "public"."subscription_seat_usage_events" USING "btree" ("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_security_audit_event_type" ON "public"."security_audit_log" USING "btree" ("event_type", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_security_audit_user" ON "public"."security_audit_log" USING "btree" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_signatures_org" ON "public"."proposal_signatures" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_signatures_proposal" ON "public"."proposal_signatures" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_signing_activity_proposal" ON "public"."proposal_signing_activity" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_signing_activity_token" ON "public"."proposal_signing_activity" USING "btree" ("signing_token_id");
CREATE INDEX IF NOT EXISTS "idx_signing_tokens_access" ON "public"."proposal_signing_tokens" USING "btree" ("access_token");
CREATE INDEX IF NOT EXISTS "idx_signing_tokens_org" ON "public"."proposal_signing_tokens" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_signing_tokens_proposal" ON "public"."proposal_signing_tokens" USING "btree" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_signing_tokens_status" ON "public"."proposal_signing_tokens" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_signup_invites_email" ON "public"."signup_invites" USING "btree" ("email");
CREATE INDEX IF NOT EXISTS "idx_signup_invites_status" ON "public"."signup_invites" USING "btree" ("is_used", "expires_at");
CREATE INDEX IF NOT EXISTS "idx_signup_invites_token" ON "public"."signup_invites" USING "btree" ("token");
CREATE INDEX IF NOT EXISTS "idx_stripe_webhook_events_event_id" ON "public"."stripe_webhook_events" USING "btree" ("stripe_event_id");
CREATE INDEX IF NOT EXISTS "idx_subscription_seat_usage_events_triggered_by_user_id" ON "public"."subscription_seat_usage_events" USING "btree" ("triggered_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_billing_interval" ON "public"."subscriptions" USING "btree" ("billing_interval");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_cancel_at_period_end" ON "public"."subscriptions" USING "btree" ("cancel_at_period_end") WHERE ("cancel_at_period_end" = true);
CREATE INDEX IF NOT EXISTS "idx_subscriptions_organization_id" ON "public"."subscriptions" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_pause_at_period_end" ON "public"."subscriptions" USING "btree" ("pause_at_period_end") WHERE ("pause_at_period_end" = true);
CREATE INDEX IF NOT EXISTS "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_stripe_customer_id" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_trial_end" ON "public"."subscriptions" USING "btree" ("trial_end") WHERE ("trial_end" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "idx_task_activities_activity_type" ON "public"."task_activities" USING "btree" ("activity_type");
CREATE INDEX IF NOT EXISTS "idx_task_activities_created_at" ON "public"."task_activities" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_task_activities_organization_id" ON "public"."task_activities" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_task_activities_task_id" ON "public"."task_activities" USING "btree" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_attachments_created_at" ON "public"."task_attachments" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_task_attachments_organization_id" ON "public"."task_attachments" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_task_attachments_task_id" ON "public"."task_attachments" USING "btree" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_board_columns_org" ON "public"."task_board_columns" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_task_board_columns_position" ON "public"."task_board_columns" USING "btree" ("organization_id", "position");
CREATE INDEX IF NOT EXISTS "idx_task_comments_created_at" ON "public"."task_comments" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_task_comments_organization_id" ON "public"."task_comments" USING "btree" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_parent_id" ON "public"."task_comments" USING "btree" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_task_id" ON "public"."task_comments" USING "btree" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_user_id" ON "public"."task_comments" USING "btree" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_qbd_connections_org
  ON public.quickbooks_desktop_connections (organization_id);
CREATE INDEX IF NOT EXISTS idx_qb_queue_dispatch
  ON public.quickbooks_request_queue (organization_id, queue_status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_qb_queue_inflight
  ON public.quickbooks_request_queue (organization_id, queue_status, processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_qbd_invoice_sync_org
  ON public.quickbooks_desktop_invoice_sync (organization_id);
CREATE INDEX IF NOT EXISTS idx_qbd_session_ticket
  ON public.quickbooks_desktop_session_logs (session_ticket, status);
CREATE INDEX IF NOT EXISTS idx_qbd_session_org
  ON public.quickbooks_desktop_session_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_jobs_project
  ON public.payment_jobs (project_id);
CREATE INDEX IF NOT EXISTS idx_payment_jobs_org
  ON public.payment_jobs (organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_phases_job
  ON public.billing_phases (payment_job_id, sequence);
CREATE INDEX IF NOT EXISTS idx_billing_phases_org
  ON public.billing_phases (organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_phases_status
  ON public.billing_phases (organization_id, status, due_date);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_sync_billing_phase
  ON public.quickbooks_desktop_invoice_sync (billing_phase_id)
  WHERE billing_phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_sync_proposal
  ON public.quickbooks_desktop_invoice_sync (proposal_id);
