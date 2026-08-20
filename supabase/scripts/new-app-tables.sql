-- Qwohter (new version) -- table structure only.
-- Generated from supabase/migrations on branch test/form-builder-merge,
-- then purged of every quote-era object and of document_templates.
--
-- Contains: CREATE TABLE, constraints (PK/FK/UNIQUE/CHECK), indexes, defaults,
--           the pgcrypto extension, and the 2 helper functions that
--           CHECK constraints call.
-- Excludes: triggers, RLS policies, grants, cron jobs, views, seed data -- all
--           of which live in new-app-layer.sql.
--
-- STEP 1 of 3.  Run order: tables -> layer -> storage.
-- Until the layer file is applied, RLS is OFF and every table is unprotected.
-- Tables: 60   Statements: 542

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE OR REPLACE FUNCTION "public"."is_valid_config_schema"("schema" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check required top-level keys
  IF schema IS NULL THEN
    RETURN TRUE; -- NULL is allowed
  END IF;

  IF NOT (schema ? 'version' AND schema ? 'options') THEN
    RETURN FALSE;
  END IF;

  -- Check version is a string
  IF jsonb_typeof(schema->'version') != 'string' THEN
    RETURN FALSE;
  END IF;

  -- Check options is an object
  IF jsonb_typeof(schema->'options') != 'object' THEN
    RETURN FALSE;
  END IF;

  -- If groups exists, it must be an array
  IF schema ? 'groups' AND jsonb_typeof(schema->'groups') != 'array' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;
CREATE OR REPLACE FUNCTION "public"."check_project_linked_to_main_version_and_won"("p_proposal_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_main BOOLEAN;
  item_status TEXT;
BEGIN
  IF p_proposal_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_main_version, status INTO is_main, item_status
  FROM public.proposals
  WHERE id = p_proposal_id;

  RETURN COALESCE(is_main, false) AND COALESCE(item_status, '') = 'Won';
END;
$$;
CREATE TABLE IF NOT EXISTS "public"."available_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "integration_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "category" "text" DEFAULT 'accounting'::"text",
    "is_enabled" boolean DEFAULT true,
    "is_beta" boolean DEFAULT false,
    "coming_soon" boolean DEFAULT false,
    "required_plan" "text",
    "documentation_url" "text",
    "setup_difficulty" "text",
    "estimated_setup_time_minutes" integer,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "platform_requirement" "text"
);
ALTER TABLE "public"."available_integrations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ai_agent_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "triggered_by" "uuid",
    "agent_type" "text" NOT NULL,
    "trigger_event" "text" NOT NULL,
    "proposal_id" "uuid",
    "input_data" "jsonb" DEFAULT '{}'::"jsonb",
    "suggestions_generated" integer DEFAULT 0,
    "output_data" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'pending'::"text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "duration_ms" integer,
    "error_message" "text",
    "total_tokens" integer,
    "estimated_cost_usd" numeric(10,6),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_agent_runs_agent_type_check" CHECK (("agent_type" = ANY (ARRAY['follow_up_generator'::"text", 'reminder_suggester'::"text", 'win_loss_analyzer'::"text", 'status_monitor'::"text", 'recommendation_engine'::"text"]))),
    CONSTRAINT "ai_agent_runs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "ai_agent_runs_trigger_event_check" CHECK (("trigger_event" = ANY (ARRAY['manual'::"text", 'status_change'::"text", 'scheduled'::"text", 'proposal_age'::"text"])))
);
ALTER TABLE "public"."ai_agent_runs" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ai_capability_gaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_request" "text" NOT NULL,
    "reason" "text" NOT NULL,
    "suggested_workaround" "text",
    "category" "text" DEFAULT 'missing_tool'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    CONSTRAINT "ai_capability_gaps_category_check" CHECK (("category" = ANY (ARRAY['missing_tool'::"text", 'permission_denied'::"text", 'integration_needed'::"text", 'out_of_scope'::"text"])))
);
ALTER TABLE "public"."ai_capability_gaps" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ai_user_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "suggestion_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "rating" integer,
    "feedback_type" "text",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message_id" "uuid",
    "organization_id" "uuid",
    "context_type" "text" DEFAULT 'suggestion'::"text",
    "user_correction" "text",
    "message_content" "text",
    CONSTRAINT "ai_user_feedback_context_type_check" CHECK (("context_type" = ANY (ARRAY['suggestion'::"text", 'chat_message'::"text", 'tool_action'::"text"]))),
    CONSTRAINT "ai_user_feedback_feedback_type_check" CHECK (("feedback_type" = ANY (ARRAY['helpful'::"text", 'not_helpful'::"text", 'incorrect'::"text", 'too_generic'::"text"]))),
    CONSTRAINT "ai_user_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "feedback_requires_reference" CHECK ((("suggestion_id" IS NOT NULL) OR ("message_id" IS NOT NULL) OR ("message_content" IS NOT NULL)))
);
ALTER TABLE "public"."ai_user_feedback" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ai_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "suggestion_id" "uuid",
    "is_proactive" boolean DEFAULT false,
    "model_used" "text",
    "tokens_used" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'system'::"text", 'assistant'::"text"])))
);
ALTER TABLE "public"."ai_messages" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."ai_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "suggestion_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "reasoning" "text",
    "email_subject" "text",
    "email_recipient" "text",
    "status" "text" DEFAULT '''Pending''::text'::"text",
    "applied_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "dismissed_reason" "text",
    "model_used" "text" DEFAULT 'gpt-4o-mini'::"text",
    "prompt_tokens" integer,
    "completion_tokens" integer,
    "confidence_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "ai_suggestions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "ai_suggestions_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Applied'::"text", 'Dismissed'::"text", 'Expired'::"text"]))),
    CONSTRAINT "ai_suggestions_suggestion_type_check" CHECK (("suggestion_type" = ANY (ARRAY['follow_up_email'::"text", 'status_reminder'::"text", 'action_recommendation'::"text", 'win_loss_insight'::"text", 'pricing_suggestion'::"text"])))
);
ALTER TABLE "public"."ai_suggestions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."auth_rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "identifier_type" "text" NOT NULL,
    "attempt_type" "text" NOT NULL,
    "attempt_count" integer DEFAULT 1,
    "first_attempt_at" timestamp with time zone DEFAULT "now"(),
    "last_attempt_at" timestamp with time zone DEFAULT "now"(),
    "blocked_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "auth_rate_limits_attempt_type_check" CHECK (("attempt_type" = ANY (ARRAY['login'::"text", 'otp'::"text", 'password_reset'::"text", 'signup'::"text", 'signing-get'::"text", 'signing-submit'::"text", 'signing-view'::"text"]))),
    CONSTRAINT "auth_rate_limits_identifier_type_check" CHECK (("identifier_type" = ANY (ARRAY['email'::"text", 'ip'::"text"])))
);
ALTER TABLE "public"."auth_rate_limits" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone,
    "all_day" boolean DEFAULT false NOT NULL,
    "event_type" "text" DEFAULT 'Custom'::"text" NOT NULL,
    "color" "text" DEFAULT '#3B82F6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "calendar_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['Custom'::"text", 'Meeting'::"text", 'Site Visit'::"text", 'Follow Up'::"text", 'Deadline'::"text", 'Milestone'::"text", 'Delivery'::"text", 'Installation'::"text"])))
);
ALTER TABLE "public"."calendar_events" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."config_option_group_metadata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" character varying(100) NOT NULL,
    "field_type" character varying(50) NOT NULL,
    "input_type" character varying(50),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."config_option_group_metadata" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."config_value_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" character varying(100) NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100),
    "manufacturer_id" "uuid",
    "values" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."config_value_sets" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "emails" "text"[] NOT NULL,
    "phones" "jsonb"[],
    "company_name" "text",
    "contact_type" "text",
    "addresses" "text"[],
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_in_organization" boolean DEFAULT false NOT NULL,
    "user_id" "uuid",
    "created_by_name" "text",
    CONSTRAINT "contacts_emails_not_empty" CHECK (("array_length"("emails", 1) > 0))
);
ALTER TABLE ONLY "public"."contacts" REPLICA IDENTITY FULL;
ALTER TABLE "public"."contacts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT true,
    "organization_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_default" boolean DEFAULT false,
    "is_template" boolean DEFAULT false NOT NULL,
    "copied_from_form_id" "uuid",
    "document_type" "text" DEFAULT 'Proposal'::"text",
    CONSTRAINT "forms_document_type_check" CHECK (("document_type" = ANY (ARRAY['Proposal'::"text", 'Invoice'::"text", 'Service_Request'::"text"]))),
    CONSTRAINT "forms_template_organization_check" CHECK (((("is_template" = true) AND ("organization_id" IS NULL)) OR (("is_template" = false) AND ("organization_id" IS NOT NULL))))
);
ALTER TABLE ONLY "public"."forms" REPLICA IDENTITY FULL;
ALTER TABLE "public"."forms" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."google_oauth_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "connected_by_user_id" "uuid",
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "google_email" "text",
    "google_name" "text",
    "drive_folder_id" "text",
    "is_valid" boolean DEFAULT true NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_risc_event" "jsonb"
);
ALTER TABLE "public"."google_oauth_tokens" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "integration_type" "text" NOT NULL,
    "integration_name" "text" NOT NULL,
    "is_connected" boolean DEFAULT false,
    "connection_status" "text" DEFAULT 'Disconnected'::"text",
    "last_connection_check_at" timestamp with time zone,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "connection_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."integrations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."invite_token_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ip_address" "inet" NOT NULL,
    "user_id" "uuid",
    "invite_token" "text" NOT NULL,
    "attempted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "success" boolean DEFAULT false NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."invite_token_attempts" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."invite_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_used" boolean DEFAULT false,
    "email" "text" NOT NULL,
    "department" "text",
    "revoked_at" timestamp with time zone,
    CONSTRAINT "invite_tokens_role_check" CHECK (("role" = ANY (ARRAY['Admin'::"text", 'Member'::"text"]))),
    CONSTRAINT "valid_department" CHECK ((("department" IS NULL) OR ("department" = ANY (ARRAY['Executive'::"text", 'Finance'::"text", 'Sales'::"text", 'Marketing'::"text", 'IT'::"text", 'HR'::"text", 'Customer Success'::"text", 'Product'::"text", 'Design'::"text", 'Engineering'::"text", 'Operations'::"text", 'Legal'::"text", 'Other'::"text"]))))
);
ALTER TABLE ONLY "public"."invite_tokens" REPLICA IDENTITY FULL;
ALTER TABLE "public"."invite_tokens" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."manufacturer_product_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manufacturer_id" "uuid" NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."manufacturer_product_domains" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'Member'::"text",
    "status" "text" DEFAULT 'Active'::"text",
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "joined_at" timestamp with time zone,
    "department" "text",
    "join_type" "text" DEFAULT 'Direct'::"text" NOT NULL,
    CONSTRAINT "memberships_role_check" CHECK (("role" = ANY (ARRAY['Owner'::"text", 'Admin'::"text", 'Member'::"text"]))),
    CONSTRAINT "memberships_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Suspended'::"text", 'Inactive'::"text"]))),
    CONSTRAINT "valid_department" CHECK ((("department" IS NULL) OR ("department" = ANY (ARRAY['Executive'::"text", 'Finance'::"text", 'Sales'::"text", 'Marketing'::"text", 'IT'::"text", 'HR'::"text", 'Customer Success'::"text", 'Product'::"text", 'Design'::"text", 'Engineering'::"text", 'Operations'::"text", 'Legal'::"text", 'Other'::"text"])))),
    CONSTRAINT "valid_join_type" CHECK (("join_type" = ANY (ARRAY['Direct'::"text", 'Invited'::"text"])))
);
ALTER TABLE ONLY "public"."memberships" REPLICA IDENTITY FULL;
ALTER TABLE "public"."memberships" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email_enabled" boolean DEFAULT true,
    "email_on_signature_sent" boolean DEFAULT true,
    "email_on_signature_viewed" boolean DEFAULT true,
    "email_on_signature_signed" boolean DEFAULT true,
    "email_on_proposal_submitted" boolean DEFAULT true,
    "email_on_proposal_won" boolean DEFAULT true,
    "email_on_proposal_rejected" boolean DEFAULT false,
    "email_on_mention" boolean DEFAULT true,
    "email_on_task_assigned" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email_on_reminder_due" boolean DEFAULT true,
    "email_on_task_due" boolean DEFAULT true,
    "notification_email" "text",
    "email_on_member_joined" boolean DEFAULT true,
    "email_on_payment_success" boolean DEFAULT true,
    "email_on_payment_failed" boolean DEFAULT true,
    "email_on_trial_ending" boolean DEFAULT true,
    "email_on_subscription_activated" boolean DEFAULT true,
    "email_on_subscription_canceled" boolean DEFAULT true,
    "email_on_subscription_renewed" boolean DEFAULT true,
    "email_on_seat_count_changed" boolean DEFAULT false,
    "sms_enabled" boolean DEFAULT false,
    "sms_phone" "text",
    "email_on_task_reminder" boolean DEFAULT true,
    "sms_on_task_reminder" boolean DEFAULT false
);
ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."notification_retry_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "notification_type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "body_text" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT '''Pending''::text'::"text",
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "channel" "text" DEFAULT 'email'::"text",
    "retry_count" integer DEFAULT 0,
    "next_retry_at" timestamp with time zone DEFAULT "now"(),
    "last_error" "text",
    CONSTRAINT "notification_queue_channel_check" CHECK (("channel" = ANY (ARRAY['email'::"text", 'sms'::"text", 'push'::"text"]))),
    CONSTRAINT "notification_retry_queue_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Retrying'::"text", 'Sent'::"text", 'Failed'::"text"])))
);
ALTER TABLE "public"."notification_retry_queue" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "is_read" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['task_assigned'::"text", 'task_due'::"text", 'task_reminder'::"text", 'reminder'::"text", 'update_mention'::"text", 'update_reply'::"text", 'general'::"text", 'signature_sent'::"text", 'signature_viewed'::"text", 'signature_signed'::"text", 'proposal_submitted'::"text", 'proposal_won'::"text", 'proposal_rejected'::"text", 'approval_requested'::"text", 'approval_approved'::"text", 'approval_rejected'::"text", 'reminder_due'::"text", 'member_joined'::"text", 'payment_success'::"text", 'payment_failed'::"text", 'trial_ending'::"text", 'subscription_activated'::"text", 'subscription_canceled'::"text", 'subscription_renewed'::"text", 'seat_count_changed'::"text"])))
);
ALTER TABLE "public"."notifications" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."organization_creation_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "text",
    "status" "text" NOT NULL,
    "error_message" "text",
    CONSTRAINT "organization_creation_log_status_check" CHECK (("status" = ANY (ARRAY['Success'::"text", 'Failed'::"text", 'Rate_Limited'::"text"])))
);
ALTER TABLE "public"."organization_creation_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "found_via" "text",
    "phone_number" "text",
    "fax_number" "text",
    "company_address" "text",
    "industry" "text",
    "website" "text",
    "logo_data" "jsonb",
    "has_used_trial" boolean DEFAULT false,
    "numbering_config" "jsonb" DEFAULT '{}'::"jsonb",
    "primary_storage_provider" "text",
    "sync_to_all_storage_providers" boolean DEFAULT false,
    "require_proposal_approval" boolean DEFAULT false,
    "payment_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "org_prefix" "text" NOT NULL DEFAULT 'TSK'::"text",
    "signing_reminder_defaults" "jsonb" DEFAULT '{"enabled": true, "intervalDays": 3, "maxReminders": 3}'::"jsonb"
);
ALTER TABLE ONLY "public"."organizations" REPLICA IDENTITY FULL;
ALTER TABLE "public"."organizations" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."password_reset_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "success" boolean
);
ALTER TABLE "public"."password_reset_audit" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."product_domain" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."product_domain" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."product_line" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "domain_id" "uuid",
    "manufacturer_id" "uuid"
);
ALTER TABLE "public"."product_line" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."product_manufacturers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "logo_url" "text"
);
ALTER TABLE "public"."product_manufacturers" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."product_models" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_line_id" "uuid" NOT NULL,
    "product_series_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "product_manufacturer_id" "uuid",
    "config_schema" "jsonb" DEFAULT '{"groups": [], "options": {}, "version": "2.0"}'::"jsonb",
    CONSTRAINT "product_models_config_schema_valid" CHECK ("public"."is_valid_config_schema"("config_schema"))
);
ALTER TABLE "public"."product_models" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."product_series" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "product_line_id" "uuid"
);
ALTER TABLE "public"."product_series" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "product_number" integer NOT NULL,
    "display_id" "text",
    "name" "text" NOT NULL,
    "amount" numeric(10,2),
    "category" "text",
    "manufacturer" "text",
    "product_type" "text",
    "series" "text",
    "model" "text",
    "specifications" "jsonb" DEFAULT '{}'::"jsonb",
    "options" "jsonb" DEFAULT '{}'::"jsonb",
    "sort_order" integer DEFAULT 0,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_unit" "text" DEFAULT 'Flat'::"text"
);
ALTER TABLE "public"."products" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_super_admin" boolean DEFAULT false NOT NULL
);
ALTER TABLE ONLY "public"."profiles" REPLICA IDENTITY FULL;
ALTER TABLE "public"."profiles" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."project_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT '''Todo''::text'::"text" NOT NULL,
    "priority" "text" DEFAULT 'Medium'::"text" NOT NULL,
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "reference" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "proposal_id" "uuid",
    CONSTRAINT "project_tasks_priority_check" CHECK ((("priority" IS NULL) OR ("priority" = ANY (ARRAY['Low'::"text", 'Medium'::"text", 'High'::"text"])))),
    CONSTRAINT "project_tasks_status_check" CHECK ((("status" IS NOT NULL) AND ("status" <> ''::"text")))
);
ALTER TABLE "public"."project_tasks" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."project_workflow_columns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#6B7280'::"text",
    "column_order" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE ONLY "public"."project_workflow_columns" REPLICA IDENTITY FULL;
ALTER TABLE "public"."project_workflow_columns" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "board_order" integer DEFAULT 0,
    "completion_date" "date",
    "priority" "text" DEFAULT ''::"text",
    "timeline_milestones" "jsonb" DEFAULT '[]'::"jsonb",
    "proposal_id" "uuid",
    CONSTRAINT "projects_must_link_to_main_version_and_won" CHECK ("public"."check_project_linked_to_main_version_and_won"("proposal_id"))
);
ALTER TABLE ONLY "public"."projects" REPLICA IDENTITY FULL;
ALTER TABLE "public"."projects" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposal_approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "responded_by" "uuid",
    "responded_at" timestamp with time zone,
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "request_comment" "text",
    "response_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "proposal_approval_requests_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Approved'::"text", 'Rejected'::"text"])))
);
ALTER TABLE "public"."proposal_approval_requests" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposal_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_size" bigint,
    "mime_type" "text",
    "tab_key" "text",
    "description" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."proposal_documents" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposal_signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "signing_token_id" "uuid",
    "signer_name" "text" NOT NULL,
    "signer_email" "text" NOT NULL,
    "signer_company" "text",
    "signature_type" "text" NOT NULL,
    "signature_data" "text" NOT NULL,
    "signature_font" "text",
    "signed_pdf_url" "text",
    "signed_pdf_path" "text",
    "signed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "proposal_signatures_signature_type_check" CHECK (("signature_type" = ANY (ARRAY['Draw'::"text", 'Type'::"text"])))
);
ALTER TABLE "public"."proposal_signatures" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposal_signing_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "signing_token_id" "uuid",
    "event_type" "text" NOT NULL,
    "event_data" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."proposal_signing_activity" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposal_signing_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "access_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_email" "text" NOT NULL,
    "client_name" "text",
    "client_company" "text",
    "status" "text" DEFAULT 'Pending'::"text" NOT NULL,
    "unsigned_pdf_url" "text",
    "unsigned_pdf_path" "text",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "first_viewed_at" timestamp with time zone,
    "last_viewed_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "sent_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "signature_positions" "jsonb",
    "unsigned_pdf_hash" "text",
    "reminder_config" "jsonb",
    "last_reminder_sent_at" timestamp with time zone,
    "reminder_count" integer DEFAULT 0,
    "signature_fallback_mode" "text",
    CONSTRAINT "proposal_signing_tokens_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Viewed'::"text", 'Signed'::"text", 'Expired'::"text", 'Revoked'::"text"])))
);
ALTER TABLE "public"."proposal_signing_tokens" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposal_status_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposal_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "transitioned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transitioned_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."proposal_status_transitions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "created_by" "uuid",
    "proposal_number" "text" NOT NULL,
    "project_name" "text",
    "status" "text" DEFAULT 'Draft'::"text",
    "form_id" "uuid",
    "form_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone,
    "won_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "archived" boolean DEFAULT false,
    "paid_at" timestamp with time zone,
    "is_main_version" boolean DEFAULT true,
    "created_by_name" character varying,
    "comments" "jsonb",
    "client_name" "text",
    "client_company" "text",
    "job_location" "text",
    "total_value" numeric(12,2),
    "is_on_board" boolean DEFAULT false,
    "proposal_source" "text",
    "document_type" "text" DEFAULT 'Proposal'::"text",
    "organization_name" "text",
    "is_complete" boolean DEFAULT false NOT NULL,
    "documents_count" integer DEFAULT 0,
    "google_doc_id" character varying(255),
    "archived_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "ai_last_analyzed_at" timestamp with time zone,
    "ai_pending_suggestions_count" integer DEFAULT 0,
    CONSTRAINT "proposals_document_type_check" CHECK (("document_type" = ANY (ARRAY['Proposal'::"text", 'Invoice'::"text", 'Service_Request'::"text"]))),
    CONSTRAINT "proposals_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Submitted'::"text", 'Won'::"text", 'Rejected'::"text", 'Paid'::"text", 'Incomplete'::"text", 'Pending Approval'::"text"])))
);
ALTER TABLE "public"."proposals" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."scheduled_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "recurrence" "text" DEFAULT 'Once'::"text",
    "recurrence_end_date" "date",
    "notification_type" "text" DEFAULT '''Reminder''::text'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "link" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'Pending'::"text",
    "sent_at" timestamp with time zone,
    "last_sent_at" timestamp with time zone,
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "scheduled_notifications_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['Task'::"text", 'Proposal'::"text", 'Invoice'::"text", 'Project'::"text"]))),
    CONSTRAINT "scheduled_notifications_recurrence_check" CHECK (("recurrence" = ANY (ARRAY['Once'::"text", 'Daily'::"text", 'Weekly'::"text"]))),
    CONSTRAINT "scheduled_notifications_status_check" CHECK (("status" = ANY (ARRAY['Pending'::"text", 'Sent'::"text", 'Cancelled'::"text", 'Failed'::"text"])))
);
ALTER TABLE "public"."scheduled_notifications" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."signup_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "email" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_used" boolean DEFAULT false NOT NULL,
    "used_at" timestamp with time zone,
    "used_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_user_id" "uuid",
    "revoked_at" timestamp with time zone,
    "revoked_by_user_id" "uuid",
    "email_sent_at" timestamp with time zone,
    "email_error" "text"
);
ALTER TABLE "public"."signup_invites" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "price_per_month" numeric(10,2) DEFAULT 0 NOT NULL,
    "price_per_yearly" numeric(10,2) DEFAULT 0,
    "stripe_price_id_monthly" "text",
    "stripe_price_id_yearly" "text",
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "max_users" integer,
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_product_id" "text",
    "min_users" integer
);
ALTER TABLE ONLY "public"."subscription_plans" REPLICA IDENTITY FULL;
ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."subscription_seat_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "previous_seat_count" integer NOT NULL,
    "new_seat_count" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "triggered_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'America/New_York'::"text"),
    CONSTRAINT "subscription_seat_usage_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['seat_added'::"text", 'seat_removed'::"text", 'seat_count_updated'::"text"])))
);
ALTER TABLE "public"."subscription_seat_usage_events" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "stripe_subscription_status" "text",
    "current_period_end" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "access_blocked" boolean DEFAULT false,
    "access_blocked_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "number_of_active_users" integer DEFAULT 0,
    "cancel_at_period_end" boolean DEFAULT false,
    "current_period_start" timestamp with time zone,
    "pause_at_period_end" boolean DEFAULT false,
    "billing_interval" character varying(20) DEFAULT 'Monthly'::character varying,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "has_payment_method" boolean DEFAULT false,
    "stripe_quantity_pending_sync" boolean DEFAULT false,
    "grace_period_end" timestamp with time zone
);
ALTER TABLE ONLY "public"."subscriptions" REPLICA IDENTITY FULL;
ALTER TABLE "public"."subscriptions" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."task_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "activity_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."task_activities" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."task_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "file_type" "text" NOT NULL,
    "attachment_type" "text" DEFAULT 'file'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."task_attachments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."task_board_columns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "color" "text" DEFAULT 'bg-gray-100 border-gray-300'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
ALTER TABLE "public"."task_board_columns" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "mentions" "uuid"[] DEFAULT '{}'::"uuid"[],
    "parent_id" "uuid",
    "is_edited" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."task_comments" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user_onboarding_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "current_step" "text" NOT NULL,
    "completed_steps" "text"[] DEFAULT '{}'::"text"[],
    "session_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval)
);
ALTER TABLE "public"."user_onboarding_progress" OWNER TO "postgres";
ALTER TABLE ONLY "public"."products" ALTER COLUMN "product_number" SET DEFAULT "nextval"('"public"."products_product_number_seq"'::"regclass");
ALTER TABLE ONLY "public"."ai_agent_runs"
    ADD CONSTRAINT "ai_agent_runs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_capability_gaps"
    ADD CONSTRAINT "ai_capability_gaps_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."ai_user_feedback"
    ADD CONSTRAINT "ai_user_feedback_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."auth_rate_limits"
    ADD CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."available_integrations"
    ADD CONSTRAINT "available_integrations_integration_type_key" UNIQUE ("integration_type");
ALTER TABLE ONLY "public"."available_integrations"
    ADD CONSTRAINT "available_integrations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."config_option_group_metadata"
    ADD CONSTRAINT "config_option_group_metadata_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."config_option_group_metadata"
    ADD CONSTRAINT "config_option_group_metadata_slug_key" UNIQUE ("slug");
ALTER TABLE ONLY "public"."config_value_sets"
    ADD CONSTRAINT "config_value_sets_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."config_value_sets"
    ADD CONSTRAINT "config_value_sets_slug_key" UNIQUE ("slug");
ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notification_retry_queue"
    ADD CONSTRAINT "email_notification_queue_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."google_oauth_tokens"
    ADD CONSTRAINT "google_oauth_tokens_organization_id_key" UNIQUE ("organization_id");
ALTER TABLE ONLY "public"."google_oauth_tokens"
    ADD CONSTRAINT "google_oauth_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_organization_id_integration_type_key" UNIQUE ("organization_id", "integration_type");
ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."invite_token_attempts"
    ADD CONSTRAINT "invite_token_attempts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_token_key" UNIQUE ("token");
ALTER TABLE ONLY "public"."manufacturer_product_domains"
    ADD CONSTRAINT "manufacturer_product_domains_manufacturer_id_domain_id_key" UNIQUE ("manufacturer_id", "domain_id");
ALTER TABLE ONLY "public"."manufacturer_product_domains"
    ADD CONSTRAINT "manufacturer_product_domains_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");
ALTER TABLE ONLY "public"."product_models"
    ADD CONSTRAINT "models_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organization_creation_log"
    ADD CONSTRAINT "organization_creation_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_fax_number_key" UNIQUE ("fax_number");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_phone_number_key" UNIQUE ("phone_number");
ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."password_reset_audit"
    ADD CONSTRAINT "password_reset_audit_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."product_line"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."product_manufacturers"
    ADD CONSTRAINT "product_manufacturers_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."product_manufacturers"
    ADD CONSTRAINT "product_manufacturers_name_key" UNIQUE ("name");
ALTER TABLE ONLY "public"."product_manufacturers"
    ADD CONSTRAINT "product_manufacturers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."product_domain"
    ADD CONSTRAINT "product_types_code_key" UNIQUE ("code");
ALTER TABLE ONLY "public"."product_domain"
    ADD CONSTRAINT "product_types_name_key" UNIQUE ("name");
ALTER TABLE ONLY "public"."product_domain"
    ADD CONSTRAINT "product_types_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_unique_display_id_per_org" UNIQUE ("organization_id", "display_id");
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_reference_unique" UNIQUE ("organization_id", "reference");
ALTER TABLE ONLY "public"."project_workflow_columns"
    ADD CONSTRAINT "project_workflow_columns_organization_id_name_key" UNIQUE ("organization_id", "name");
ALTER TABLE ONLY "public"."project_workflow_columns"
    ADD CONSTRAINT "project_workflow_columns_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposal_approval_requests"
    ADD CONSTRAINT "proposal_approval_requests_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposal_documents"
    ADD CONSTRAINT "proposal_documents_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposal_signatures"
    ADD CONSTRAINT "proposal_signatures_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposal_signing_activity"
    ADD CONSTRAINT "proposal_signing_activity_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposal_signing_tokens"
    ADD CONSTRAINT "proposal_signing_tokens_access_token_key" UNIQUE ("access_token");
ALTER TABLE ONLY "public"."proposal_signing_tokens"
    ADD CONSTRAINT "proposal_signing_tokens_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_proposal_number_key" UNIQUE ("proposal_number");
ALTER TABLE ONLY "public"."proposal_status_transitions"
    ADD CONSTRAINT "proposal_status_transitions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."product_series"
    ADD CONSTRAINT "series_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."signup_invites"
    ADD CONSTRAINT "signup_invites_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."signup_invites"
    ADD CONSTRAINT "signup_invites_token_key" UNIQUE ("token");
ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");
ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_name_key" UNIQUE ("name");
ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_stripe_product_id_key" UNIQUE ("stripe_product_id");
ALTER TABLE ONLY "public"."subscription_seat_usage_events"
    ADD CONSTRAINT "subscription_seat_usage_events_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_key" UNIQUE ("organization_id");
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");
ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_board_columns"
    ADD CONSTRAINT "task_board_columns_organization_id_slug_key" UNIQUE ("organization_id", "slug");
ALTER TABLE ONLY "public"."task_board_columns"
    ADD CONSTRAINT "task_board_columns_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_onboarding_progress"
    ADD CONSTRAINT "user_onboarding_progress_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."user_onboarding_progress"
    ADD CONSTRAINT "user_onboarding_progress_user_id_key" UNIQUE ("user_id");
CREATE INDEX "idx_ai_agent_runs_org" ON "public"."ai_agent_runs" USING "btree" ("organization_id", "created_at" DESC);
CREATE INDEX "idx_ai_agent_runs_proposal" ON "public"."ai_agent_runs" USING "btree" ("proposal_id");
CREATE INDEX "idx_ai_agent_runs_status" ON "public"."ai_agent_runs" USING "btree" ("status");
CREATE INDEX "idx_ai_agent_runs_type" ON "public"."ai_agent_runs" USING "btree" ("agent_type");
CREATE INDEX "idx_ai_capability_gaps_category" ON "public"."ai_capability_gaps" USING "btree" ("category");
CREATE INDEX "idx_ai_capability_gaps_created_at" ON "public"."ai_capability_gaps" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_ai_capability_gaps_org_id" ON "public"."ai_capability_gaps" USING "btree" ("organization_id");
CREATE INDEX "idx_ai_feedback_has_content" ON "public"."ai_user_feedback" USING "btree" ("organization_id", "created_at" DESC) WHERE ("message_content" IS NOT NULL);
CREATE INDEX "idx_ai_feedback_message" ON "public"."ai_user_feedback" USING "btree" ("message_id");
CREATE INDEX "idx_ai_feedback_org" ON "public"."ai_user_feedback" USING "btree" ("organization_id");
CREATE INDEX "idx_ai_feedback_suggestion" ON "public"."ai_user_feedback" USING "btree" ("suggestion_id");
CREATE INDEX "idx_ai_feedback_user" ON "public"."ai_user_feedback" USING "btree" ("user_id");
CREATE INDEX "idx_ai_messages_organization" ON "public"."ai_messages" USING "btree" ("organization_id");
CREATE INDEX "idx_ai_messages_proposal" ON "public"."ai_messages" USING "btree" ("proposal_id", "created_at" DESC);
CREATE INDEX "idx_ai_messages_user" ON "public"."ai_messages" USING "btree" ("user_id");
CREATE INDEX "idx_ai_suggestions_created" ON "public"."ai_suggestions" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_ai_suggestions_org_status" ON "public"."ai_suggestions" USING "btree" ("organization_id", "status");
CREATE INDEX "idx_ai_suggestions_proposal_status" ON "public"."ai_suggestions" USING "btree" ("proposal_id", "status");
CREATE INDEX "idx_ai_suggestions_type_status" ON "public"."ai_suggestions" USING "btree" ("suggestion_type", "status");
CREATE INDEX "idx_ai_suggestions_user_status" ON "public"."ai_suggestions" USING "btree" ("user_id", "status");
CREATE INDEX "idx_approval_requests_org" ON "public"."proposal_approval_requests" USING "btree" ("organization_id");
CREATE INDEX "idx_approval_requests_proposal" ON "public"."proposal_approval_requests" USING "btree" ("proposal_id");
CREATE INDEX "idx_approval_requests_requested_by" ON "public"."proposal_approval_requests" USING "btree" ("requested_by");
CREATE INDEX "idx_approval_requests_responded_by" ON "public"."proposal_approval_requests" USING "btree" ("responded_by");
CREATE INDEX "idx_approval_requests_status" ON "public"."proposal_approval_requests" USING "btree" ("status");
CREATE INDEX "idx_auth_rate_limits_blocked" ON "public"."auth_rate_limits" USING "btree" ("blocked_until") WHERE ("blocked_until" IS NOT NULL);
CREATE INDEX "idx_auth_rate_limits_lookup" ON "public"."auth_rate_limits" USING "btree" ("identifier", "identifier_type", "attempt_type");
CREATE INDEX "idx_calendar_events_created_by" ON "public"."calendar_events" USING "btree" ("created_by");
CREATE INDEX "idx_calendar_events_date_range" ON "public"."calendar_events" USING "btree" ("organization_id", "start_date", "end_date");
CREATE INDEX "idx_calendar_events_event_type" ON "public"."calendar_events" USING "btree" ("event_type");
CREATE INDEX "idx_calendar_events_organization" ON "public"."calendar_events" USING "btree" ("organization_id");
CREATE INDEX "idx_calendar_events_start_date" ON "public"."calendar_events" USING "btree" ("start_date");
CREATE INDEX "idx_config_value_sets_category" ON "public"."config_value_sets" USING "btree" ("category");
CREATE INDEX "idx_config_value_sets_category_manufacturer" ON "public"."config_value_sets" USING "btree" ("category", "manufacturer_id");
CREATE INDEX "idx_config_value_sets_manufacturer" ON "public"."config_value_sets" USING "btree" ("manufacturer_id");
CREATE INDEX "idx_config_value_sets_slug" ON "public"."config_value_sets" USING "btree" ("slug");
CREATE INDEX "idx_config_value_sets_values" ON "public"."config_value_sets" USING "gin" ("values");
CREATE INDEX "idx_contacts_created_by" ON "public"."contacts" USING "btree" ("created_by");
CREATE INDEX "idx_contacts_emails_gin" ON "public"."contacts" USING "gin" ("emails");
CREATE INDEX "idx_contacts_full_name" ON "public"."contacts" USING "btree" ("full_name");
CREATE INDEX "idx_contacts_organization_id" ON "public"."contacts" USING "btree" ("organization_id");
CREATE INDEX "idx_contacts_type" ON "public"."contacts" USING "btree" ("contact_type");
CREATE INDEX "idx_contacts_user_id" ON "public"."contacts" USING "btree" ("user_id");
CREATE INDEX "idx_creation_log_user_timestamp" ON "public"."organization_creation_log" USING "btree" ("user_id", "timestamp");
CREATE INDEX "idx_email_notification_queue_org" ON "public"."notification_retry_queue" USING "btree" ("organization_id");
CREATE INDEX "idx_email_queue_status_scheduled" ON "public"."notification_retry_queue" USING "btree" ("status", "scheduled_for");
CREATE INDEX "idx_email_queue_user" ON "public"."notification_retry_queue" USING "btree" ("user_id");
CREATE INDEX "idx_forms_copied_from_form" ON "public"."forms" USING "btree" ("copied_from_form_id") WHERE ("copied_from_form_id" IS NOT NULL);
CREATE INDEX "idx_forms_created_by" ON "public"."forms" USING "btree" ("created_by");
CREATE INDEX "idx_forms_is_archived" ON "public"."forms" USING "btree" ("is_archived");
CREATE INDEX "idx_forms_is_default" ON "public"."forms" USING "btree" ("organization_id", "is_default") WHERE ("is_default" = true);
CREATE INDEX "idx_forms_is_template" ON "public"."forms" USING "btree" ("is_template") WHERE ("is_template" = true);
CREATE INDEX "idx_forms_organization_id" ON "public"."forms" USING "btree" ("organization_id");
CREATE INDEX "idx_google_oauth_tokens_connected_by" ON "public"."google_oauth_tokens" USING "btree" ("connected_by_user_id");
CREATE INDEX "idx_google_oauth_tokens_org" ON "public"."google_oauth_tokens" USING "btree" ("organization_id");
CREATE INDEX "idx_google_oauth_tokens_risc_event" ON "public"."google_oauth_tokens" USING "btree" ((("last_risc_event" ->> 'event_type'::"text"))) WHERE ("last_risc_event" IS NOT NULL);
CREATE INDEX "idx_google_oauth_tokens_valid" ON "public"."google_oauth_tokens" USING "btree" ("organization_id", "is_valid") WHERE ("is_valid" = true);
CREATE INDEX "idx_invite_attempts_ip_time" ON "public"."invite_token_attempts" USING "btree" ("ip_address", "attempted_at" DESC);
CREATE INDEX "idx_invite_attempts_token_time" ON "public"."invite_token_attempts" USING "btree" ("invite_token", "attempted_at" DESC);
CREATE INDEX "idx_invite_attempts_user_time" ON "public"."invite_token_attempts" USING "btree" ("user_id", "attempted_at" DESC) WHERE ("user_id" IS NOT NULL);
CREATE INDEX "idx_invite_tokens_created_by" ON "public"."invite_tokens" USING "btree" ("created_by");
CREATE INDEX "idx_invite_tokens_expires_at" ON "public"."invite_tokens" USING "btree" ("expires_at");
CREATE INDEX "idx_invite_tokens_is_used" ON "public"."invite_tokens" USING "btree" ("is_used");
CREATE INDEX "idx_invite_tokens_org_id" ON "public"."invite_tokens" USING "btree" ("organization_id");
CREATE INDEX "idx_invite_tokens_revoked" ON "public"."invite_tokens" USING "btree" ("organization_id", "revoked_at") WHERE ("revoked_at" IS NULL);
CREATE INDEX "idx_invite_tokens_token" ON "public"."invite_tokens" USING "btree" ("token");
CREATE INDEX "idx_manufacturer_product_domains_composite" ON "public"."manufacturer_product_domains" USING "btree" ("domain_id", "manufacturer_id");
CREATE INDEX "idx_manufacturer_product_domains_domain_id" ON "public"."manufacturer_product_domains" USING "btree" ("domain_id");
CREATE INDEX "idx_manufacturer_product_domains_manufacturer_id" ON "public"."manufacturer_product_domains" USING "btree" ("manufacturer_id");
CREATE INDEX "idx_memberships_department" ON "public"."memberships" USING "btree" ("department") WHERE ("department" IS NOT NULL);
CREATE INDEX "idx_memberships_invited_by" ON "public"."memberships" USING "btree" ("invited_by");
CREATE INDEX "idx_memberships_join_type" ON "public"."memberships" USING "btree" ("join_type") WHERE ("join_type" IS NOT NULL);
CREATE INDEX "idx_memberships_org_status" ON "public"."memberships" USING "btree" ("organization_id", "status");
CREATE INDEX "idx_memberships_user_org" ON "public"."memberships" USING "btree" ("user_id", "organization_id");
CREATE INDEX "idx_notification_preferences_org" ON "public"."notification_preferences" USING "btree" ("organization_id");
CREATE INDEX "idx_notification_preferences_user_org" ON "public"."notification_preferences" USING "btree" ("user_id", "organization_id");
CREATE INDEX "idx_notification_retry_queue_pending" ON "public"."notification_retry_queue" USING "btree" ("status", "next_retry_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'retrying'::"text"]));
CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");
CREATE INDEX "idx_notifications_organization_id" ON "public"."notifications" USING "btree" ("organization_id");
CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");
CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);
CREATE INDEX "idx_onboarding_expires_at" ON "public"."user_onboarding_progress" USING "btree" ("expires_at");
CREATE INDEX "idx_onboarding_user_id" ON "public"."user_onboarding_progress" USING "btree" ("user_id");
CREATE INDEX "idx_organizations_has_logo" ON "public"."organizations" USING "btree" ((("logo_data" IS NOT NULL))) WHERE ("logo_data" IS NOT NULL);
CREATE INDEX "idx_password_reset_audit_email" ON "public"."password_reset_audit" USING "btree" ("email", "requested_at" DESC);
CREATE INDEX "idx_product_domain_name" ON "public"."product_domain" USING "btree" ("name");
CREATE INDEX "idx_product_line_domain" ON "public"."product_line" USING "btree" ("domain_id");
CREATE INDEX "idx_product_line_manufacturer_id" ON "public"."product_line" USING "btree" ("manufacturer_id");
CREATE INDEX "idx_product_line_name" ON "public"."product_line" USING "btree" ("name");
CREATE INDEX "idx_product_models_config_schema" ON "public"."product_models" USING "gin" ("config_schema");
CREATE INDEX "idx_product_models_has_config" ON "public"."product_models" USING "btree" (((("config_schema" IS NOT NULL) AND ("config_schema" <> '{"groups": [], "options": {}, "version": "2.0"}'::"jsonb")))) WHERE (("config_schema" IS NOT NULL) AND ("config_schema" <> '{"groups": [], "options": {}, "version": "2.0"}'::"jsonb"));
CREATE INDEX "idx_product_models_name" ON "public"."product_models" USING "btree" ("name");
CREATE INDEX "idx_product_models_product_line_id" ON "public"."product_models" USING "btree" ("product_line_id");
CREATE INDEX "idx_product_models_product_manufacturer_id" ON "public"."product_models" USING "btree" ("product_manufacturer_id");
CREATE INDEX "idx_product_models_series" ON "public"."product_models" USING "btree" ("product_series_id");
CREATE INDEX "idx_product_series_name" ON "public"."product_series" USING "btree" ("name");
CREATE INDEX "idx_product_series_product_line_id" ON "public"."product_series" USING "btree" ("product_line_id");
CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category");
CREATE INDEX "idx_products_created_by" ON "public"."products" USING "btree" ("created_by");
CREATE INDEX "idx_products_name" ON "public"."products" USING "btree" ("name");
CREATE INDEX "idx_products_organization_id" ON "public"."products" USING "btree" ("organization_id");
CREATE INDEX "idx_products_product_number" ON "public"."products" USING "btree" ("organization_id", "product_number");
CREATE INDEX "idx_profiles_is_super_admin" ON "public"."profiles" USING "btree" ("is_super_admin") WHERE ("is_super_admin" = true);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");
CREATE INDEX "idx_project_tasks_assigned_to" ON "public"."project_tasks" USING "btree" ("assigned_to");
CREATE INDEX "idx_project_tasks_created_at" ON "public"."project_tasks" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_project_tasks_created_by" ON "public"."project_tasks" USING "btree" ("created_by");
CREATE INDEX "idx_project_tasks_due_date" ON "public"."project_tasks" USING "btree" ("due_date");
CREATE INDEX "idx_project_tasks_org_status_position" ON "public"."project_tasks" USING "btree" ("organization_id", "status", "position");
CREATE INDEX "idx_project_tasks_organization_id" ON "public"."project_tasks" USING "btree" ("organization_id");
CREATE INDEX "idx_project_tasks_priority" ON "public"."project_tasks" USING "btree" ("priority");
CREATE INDEX "idx_project_tasks_project_id" ON "public"."project_tasks" USING "btree" ("project_id");
CREATE INDEX "idx_project_tasks_proposal_id" ON "public"."project_tasks" USING "btree" ("proposal_id") WHERE ("proposal_id" IS NOT NULL);
CREATE INDEX "idx_project_tasks_reference" ON "public"."project_tasks" USING "btree" ("organization_id", "reference");
CREATE INDEX "idx_project_tasks_status" ON "public"."project_tasks" USING "btree" ("status");
CREATE INDEX "idx_project_workflow_columns_org" ON "public"."project_workflow_columns" USING "btree" ("organization_id");
CREATE INDEX "idx_projects_organization" ON "public"."projects" USING "btree" ("organization_id");
CREATE INDEX "idx_projects_proposal" ON "public"."projects" USING "btree" ("proposal_id");
CREATE INDEX "idx_projects_timeline_milestones" ON "public"."projects" USING "gin" ("timeline_milestones");
CREATE INDEX "idx_projects_workflow_status" ON "public"."projects" USING "btree" ("workflow_status");
CREATE INDEX "idx_proposal_documents_organization_id" ON "public"."proposal_documents" USING "btree" ("organization_id");
CREATE INDEX "idx_proposal_documents_proposal_id" ON "public"."proposal_documents" USING "btree" ("proposal_id");
CREATE INDEX "idx_proposal_documents_tab_key" ON "public"."proposal_documents" USING "btree" ("tab_key") WHERE ("tab_key" IS NOT NULL);
CREATE INDEX "idx_proposal_documents_uploaded_by" ON "public"."proposal_documents" USING "btree" ("uploaded_by");
CREATE INDEX "idx_proposal_signatures_token" ON "public"."proposal_signatures" USING "btree" ("signing_token_id");
CREATE INDEX "idx_proposal_signing_activity_org" ON "public"."proposal_signing_activity" USING "btree" ("organization_id");
CREATE INDEX "idx_proposal_signing_tokens_sent_by" ON "public"."proposal_signing_tokens" USING "btree" ("sent_by");
CREATE INDEX "idx_proposal_transitions_org_date" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC);
CREATE INDEX "idx_proposal_transitions_proposal" ON "public"."proposal_status_transitions" USING "btree" ("proposal_id");
CREATE INDEX "idx_proposal_transitions_rejected" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC) WHERE ("to_status" = 'Rejected'::"text");
CREATE INDEX "idx_proposal_transitions_status_date" ON "public"."proposal_status_transitions" USING "btree" ("to_status", "transitioned_at" DESC);
CREATE INDEX "idx_proposal_transitions_submitted" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC) WHERE ("to_status" = 'Submitted'::"text");
CREATE INDEX "idx_proposal_transitions_won" ON "public"."proposal_status_transitions" USING "btree" ("organization_id", "transitioned_at" DESC) WHERE ("to_status" = 'Won'::"text");
CREATE INDEX "idx_proposals_client_company" ON "public"."proposals" USING "btree" ("client_company");
CREATE INDEX "idx_proposals_completed_at" ON "public"."proposals" USING "btree" ("completed_at") WHERE ("completed_at" IS NOT NULL);
CREATE INDEX "idx_proposals_created_by" ON "public"."proposals" USING "btree" ("created_by");
CREATE INDEX "idx_proposals_created_by_name" ON "public"."proposals" USING "btree" ("created_by_name");
CREATE INDEX "idx_proposals_document_type" ON "public"."proposals" USING "btree" ("organization_id", "document_type");
CREATE INDEX "idx_proposals_documents_count" ON "public"."proposals" USING "btree" ("documents_count") WHERE ("documents_count" > 0);
CREATE INDEX "idx_proposals_form_id" ON "public"."proposals" USING "btree" ("form_id");
CREATE INDEX "idx_proposals_is_complete" ON "public"."proposals" USING "btree" ("is_complete");
CREATE INDEX "idx_proposals_is_on_board" ON "public"."proposals" USING "btree" ("organization_id", "is_on_board") WHERE ("is_on_board" = true);
CREATE INDEX "idx_proposals_job_location" ON "public"."proposals" USING "btree" ("job_location");
CREATE INDEX "idx_proposals_org_client" ON "public"."proposals" USING "btree" ("organization_id", "client_company");
CREATE INDEX "idx_proposals_organization_id" ON "public"."proposals" USING "btree" ("organization_id");
CREATE INDEX "idx_proposals_organization_name" ON "public"."proposals" USING "btree" ("organization_name");
CREATE INDEX "idx_proposals_proposal_number" ON "public"."proposals" USING "btree" ("proposal_number");
CREATE INDEX "idx_proposals_proposal_source" ON "public"."proposals" USING "btree" ("proposal_source") WHERE ("proposal_source" IS NOT NULL);
CREATE INDEX "idx_proposals_proposal_status" ON "public"."proposals" USING "btree" ("status");
CREATE INDEX "idx_proposals_total_value" ON "public"."proposals" USING "btree" ("total_value") WHERE ("total_value" IS NOT NULL);
CREATE INDEX "idx_proposal_status_transitions_transitioned_by" ON "public"."proposal_status_transitions" USING "btree" ("transitioned_by");
CREATE INDEX "idx_scheduled_notifications_entity" ON "public"."scheduled_notifications" USING "btree" ("entity_type", "entity_id");
CREATE INDEX "idx_scheduled_notifications_org" ON "public"."scheduled_notifications" USING "btree" ("organization_id", "status");
CREATE INDEX "idx_scheduled_notifications_pending" ON "public"."scheduled_notifications" USING "btree" ("scheduled_for") WHERE ("status" = 'pending'::"text");
CREATE INDEX "idx_scheduled_notifications_user" ON "public"."scheduled_notifications" USING "btree" ("user_id", "status");
CREATE INDEX "idx_seat_usage_created_at" ON "public"."subscription_seat_usage_events" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_seat_usage_subscription_id" ON "public"."subscription_seat_usage_events" USING "btree" ("subscription_id");
CREATE INDEX "idx_security_audit_event_type" ON "public"."security_audit_log" USING "btree" ("event_type", "created_at" DESC);
CREATE INDEX "idx_security_audit_user" ON "public"."security_audit_log" USING "btree" ("user_id", "created_at" DESC);
CREATE INDEX "idx_signatures_org" ON "public"."proposal_signatures" USING "btree" ("organization_id");
CREATE INDEX "idx_signatures_proposal" ON "public"."proposal_signatures" USING "btree" ("proposal_id");
CREATE INDEX "idx_signing_activity_proposal" ON "public"."proposal_signing_activity" USING "btree" ("proposal_id");
CREATE INDEX "idx_signing_activity_token" ON "public"."proposal_signing_activity" USING "btree" ("signing_token_id");
CREATE INDEX "idx_signing_tokens_access" ON "public"."proposal_signing_tokens" USING "btree" ("access_token");
CREATE INDEX "idx_signing_tokens_org" ON "public"."proposal_signing_tokens" USING "btree" ("organization_id");
CREATE INDEX "idx_signing_tokens_proposal" ON "public"."proposal_signing_tokens" USING "btree" ("proposal_id");
CREATE INDEX "idx_signing_tokens_status" ON "public"."proposal_signing_tokens" USING "btree" ("status");
CREATE INDEX "idx_signup_invites_email" ON "public"."signup_invites" USING "btree" ("email");
CREATE INDEX "idx_signup_invites_status" ON "public"."signup_invites" USING "btree" ("is_used", "expires_at");
CREATE INDEX "idx_signup_invites_token" ON "public"."signup_invites" USING "btree" ("token");
CREATE INDEX "idx_stripe_webhook_events_event_id" ON "public"."stripe_webhook_events" USING "btree" ("stripe_event_id");
CREATE INDEX "idx_subscription_seat_usage_events_triggered_by_user_id" ON "public"."subscription_seat_usage_events" USING "btree" ("triggered_by_user_id");
CREATE INDEX "idx_subscriptions_billing_interval" ON "public"."subscriptions" USING "btree" ("billing_interval");
CREATE INDEX "idx_subscriptions_cancel_at_period_end" ON "public"."subscriptions" USING "btree" ("cancel_at_period_end") WHERE ("cancel_at_period_end" = true);
CREATE INDEX "idx_subscriptions_organization_id" ON "public"."subscriptions" USING "btree" ("organization_id");
CREATE INDEX "idx_subscriptions_pause_at_period_end" ON "public"."subscriptions" USING "btree" ("pause_at_period_end") WHERE ("pause_at_period_end" = true);
CREATE INDEX "idx_subscriptions_plan_id" ON "public"."subscriptions" USING "btree" ("plan_id");
CREATE INDEX "idx_subscriptions_stripe_customer_id" ON "public"."subscriptions" USING "btree" ("stripe_customer_id");
CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");
CREATE INDEX "idx_subscriptions_trial_end" ON "public"."subscriptions" USING "btree" ("trial_end") WHERE ("trial_end" IS NOT NULL);
CREATE INDEX "idx_task_activities_activity_type" ON "public"."task_activities" USING "btree" ("activity_type");
CREATE INDEX "idx_task_activities_created_at" ON "public"."task_activities" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_task_activities_organization_id" ON "public"."task_activities" USING "btree" ("organization_id");
CREATE INDEX "idx_task_activities_task_id" ON "public"."task_activities" USING "btree" ("task_id");
CREATE INDEX "idx_task_attachments_created_at" ON "public"."task_attachments" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_task_attachments_organization_id" ON "public"."task_attachments" USING "btree" ("organization_id");
CREATE INDEX "idx_task_attachments_task_id" ON "public"."task_attachments" USING "btree" ("task_id");
CREATE INDEX "idx_task_board_columns_org" ON "public"."task_board_columns" USING "btree" ("organization_id");
CREATE INDEX "idx_task_board_columns_position" ON "public"."task_board_columns" USING "btree" ("organization_id", "position");
CREATE INDEX "idx_task_comments_created_at" ON "public"."task_comments" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_task_comments_organization_id" ON "public"."task_comments" USING "btree" ("organization_id");
CREATE INDEX "idx_task_comments_parent_id" ON "public"."task_comments" USING "btree" ("parent_id");
CREATE INDEX "idx_task_comments_task_id" ON "public"."task_comments" USING "btree" ("task_id");
CREATE INDEX "idx_task_comments_user_id" ON "public"."task_comments" USING "btree" ("user_id");
ALTER TABLE ONLY "public"."ai_agent_runs"
    ADD CONSTRAINT "ai_agent_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_agent_runs"
    ADD CONSTRAINT "ai_agent_runs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ai_agent_runs"
    ADD CONSTRAINT "ai_agent_runs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ai_capability_gaps"
    ADD CONSTRAINT "ai_capability_gaps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_capability_gaps"
    ADD CONSTRAINT "ai_capability_gaps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ai_messages"
    ADD CONSTRAINT "ai_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_suggestions"
    ADD CONSTRAINT "ai_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_user_feedback"
    ADD CONSTRAINT "ai_user_feedback_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."ai_messages"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_user_feedback"
    ADD CONSTRAINT "ai_user_feedback_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_user_feedback"
    ADD CONSTRAINT "ai_user_feedback_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "public"."ai_suggestions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."ai_user_feedback"
    ADD CONSTRAINT "ai_user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."config_value_sets"
    ADD CONSTRAINT "config_value_sets_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."product_manufacturers"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."notification_retry_queue"
    ADD CONSTRAINT "email_notification_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notification_retry_queue"
    ADD CONSTRAINT "email_notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_copied_from_form_id_fkey" FOREIGN KEY ("copied_from_form_id") REFERENCES "public"."forms"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE ONLY "public"."google_oauth_tokens"
    ADD CONSTRAINT "google_oauth_tokens_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."google_oauth_tokens"
    ADD CONSTRAINT "google_oauth_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."invite_tokens"
    ADD CONSTRAINT "invite_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."manufacturer_product_domains"
    ADD CONSTRAINT "manufacturer_product_domains_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."product_domain"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."manufacturer_product_domains"
    ADD CONSTRAINT "manufacturer_product_domains_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."product_manufacturers"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");
ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."product_models"
    ADD CONSTRAINT "models_product_category_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_line"("id");
ALTER TABLE ONLY "public"."product_models"
    ADD CONSTRAINT "models_product_series_id_fkey" FOREIGN KEY ("product_series_id") REFERENCES "public"."product_series"("id");
ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."organization_creation_log"
    ADD CONSTRAINT "organization_creation_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."product_line"
    ADD CONSTRAINT "product_category_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."product_domain"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."product_line"
    ADD CONSTRAINT "product_line_manufacturer_id_fkey" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."product_manufacturers"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."product_models"
    ADD CONSTRAINT "product_models_product_manufacturer_id_fkey" FOREIGN KEY ("product_manufacturer_id") REFERENCES "public"."product_manufacturers"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."product_series"
    ADD CONSTRAINT "product_series_product_line_id_fkey" FOREIGN KEY ("product_line_id") REFERENCES "public"."product_line"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."project_tasks"
    ADD CONSTRAINT "project_tasks_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."project_workflow_columns"
    ADD CONSTRAINT "project_workflow_columns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_approval_requests"
    ADD CONSTRAINT "proposal_approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_approval_requests"
    ADD CONSTRAINT "proposal_approval_requests_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_approval_requests"
    ADD CONSTRAINT "proposal_approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_approval_requests"
    ADD CONSTRAINT "proposal_approval_requests_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."proposal_documents"
    ADD CONSTRAINT "proposal_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_documents"
    ADD CONSTRAINT "proposal_documents_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_documents"
    ADD CONSTRAINT "proposal_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."proposal_signatures"
    ADD CONSTRAINT "proposal_signatures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_signatures"
    ADD CONSTRAINT "proposal_signatures_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_signatures"
    ADD CONSTRAINT "proposal_signatures_signing_token_id_fkey" FOREIGN KEY ("signing_token_id") REFERENCES "public"."proposal_signing_tokens"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."proposal_signing_activity"
    ADD CONSTRAINT "proposal_signing_activity_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_signing_activity"
    ADD CONSTRAINT "proposal_signing_activity_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_signing_activity"
    ADD CONSTRAINT "proposal_signing_activity_signing_token_id_fkey" FOREIGN KEY ("signing_token_id") REFERENCES "public"."proposal_signing_tokens"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."proposal_signing_tokens"
    ADD CONSTRAINT "proposal_signing_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_signing_tokens"
    ADD CONSTRAINT "proposal_signing_tokens_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_signing_tokens"
    ADD CONSTRAINT "proposal_signing_tokens_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."proposal_status_transitions"
    ADD CONSTRAINT "proposal_status_transitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");
ALTER TABLE ONLY "public"."proposal_status_transitions"
    ADD CONSTRAINT "proposal_status_transitions_transitioned_by_fkey" FOREIGN KEY ("transitioned_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."scheduled_notifications"
    ADD CONSTRAINT "scheduled_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."signup_invites"
    ADD CONSTRAINT "signup_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."signup_invites"
    ADD CONSTRAINT "signup_invites_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."signup_invites"
    ADD CONSTRAINT "signup_invites_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."subscription_seat_usage_events"
    ADD CONSTRAINT "subscription_seat_usage_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."subscription_seat_usage_events"
    ADD CONSTRAINT "subscription_seat_usage_events_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");
ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_activities"
    ADD CONSTRAINT "task_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_attachments"
    ADD CONSTRAINT "task_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."task_board_columns"
    ADD CONSTRAINT "task_board_columns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."task_comments"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."project_tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."user_onboarding_progress"
    ADD CONSTRAINT "user_onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS grace_period_end timestamptz;
ALTER TABLE "public"."google_oauth_tokens"
  ALTER COLUMN "refresh_token" DROP NOT NULL;
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS signature_positions JSONB;
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS unsigned_pdf_hash TEXT;
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS reminder_config JSONB;
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE public.proposal_signing_tokens
  ADD COLUMN IF NOT EXISTS signature_fallback_mode TEXT;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS signing_reminder_defaults JSONB
  DEFAULT '{"enabled": true, "intervalDays": 3, "maxReminders": 3}'::jsonb;
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
CREATE TABLE IF NOT EXISTS public.quickbooks_desktop_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_file_name text,
  -- Username is the Web Connector login and is matched globally during
  -- authenticate(), so it must be unique across organizations.
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  sync_frequency_minutes integer NOT NULL DEFAULT 30,
  web_connector_version text,
  qb_version text,
  qb_edition text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qbd_connections_org
  ON public.quickbooks_desktop_connections (organization_id);
CREATE TABLE IF NOT EXISTS public.quickbooks_request_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  qbxml_request text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  queue_status text NOT NULL DEFAULT 'Pending'
    CHECK (queue_status IN ('Pending', 'Sent', 'Completed', 'Failed')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  qbxml_response text,
  error_message text,
  source_record_type text,
  source_record_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_qb_queue_dispatch
  ON public.quickbooks_request_queue (organization_id, queue_status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_qb_queue_inflight
  ON public.quickbooks_request_queue (organization_id, queue_status, processed_at DESC);
CREATE TABLE IF NOT EXISTS public.quickbooks_desktop_invoice_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  qb_txn_id text,
  qb_edit_sequence text,
  qb_invoice_number text,
  sync_status text NOT NULL DEFAULT 'Pending'
    CHECK (sync_status IN ('Pending', 'Synced', 'Error')),
  last_sync_at timestamptz,
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qbd_invoice_sync_org
  ON public.quickbooks_desktop_invoice_sync (organization_id);
CREATE TABLE IF NOT EXISTS public.quickbooks_desktop_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_ticket text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'error')),
  session_ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qbd_session_ticket
  ON public.quickbooks_desktop_session_logs (session_ticket, status);
CREATE INDEX IF NOT EXISTS idx_qbd_session_org
  ON public.quickbooks_desktop_session_logs (organization_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.payment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NOT unique: a project can have multiple jobs (e.g. a change order).
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Main Contract',
  contract_total numeric NOT NULL DEFAULT 0,
  -- Billing contact for the job; resolved from the linked contact when null.
  billing_email text,
  status text NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'Complete', 'Cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_jobs_project
  ON public.payment_jobs (project_id);
CREATE INDEX IF NOT EXISTS idx_payment_jobs_org
  ON public.payment_jobs (organization_id);
CREATE TABLE IF NOT EXISTS public.billing_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_job_id uuid NOT NULL REFERENCES public.payment_jobs(id) ON DELETE CASCADE,
  sequence integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  -- percent: amount_value is 0-100 of contract_total; fixed: amount_value is dollars.
  amount_type text NOT NULL DEFAULT 'percent'
    CHECK (amount_type IN ('percent', 'fixed')),
  amount_value numeric NOT NULL DEFAULT 0 CHECK (amount_value >= 0),
  -- Dollar amount snapshotted when the phase is invoiced.
  resolved_amount numeric,
  trigger_type text NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual', 'milestone', 'date')),
  trigger_milestone_key text,
  due_date date,
  -- Per-phase billing email override; falls back to the job's billing_email.
  billing_email text,
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Invoiced', 'Sent', 'Paid', 'Overdue', 'Void')),
  invoiced_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_phases_job
  ON public.billing_phases (payment_job_id, sequence);
CREATE INDEX IF NOT EXISTS idx_billing_phases_org
  ON public.billing_phases (organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_phases_status
  ON public.billing_phases (organization_id, status, due_date);
ALTER TABLE public.quickbooks_desktop_invoice_sync
  ADD COLUMN IF NOT EXISTS billing_phase_id uuid
    REFERENCES public.billing_phases(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_sync_billing_phase
  ON public.quickbooks_desktop_invoice_sync (billing_phase_id)
  WHERE billing_phase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_sync_proposal
  ON public.quickbooks_desktop_invoice_sync (proposal_id);

-- ============================================================================
-- Back office: companies, vendors, vendor discounts, attachments
-- Source: supabase/migrations/20260819100000_companies_vendors.sql
--         supabase/migrations/20260819100001_attachments.sql
--         supabase/migrations/20260819100002_consolidate_attachments.sql
-- NOTE: project_attachments was folded into attachments and dropped; it is
--       deliberately absent from this script.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  company_type text NOT NULL DEFAULT 'Customer'
    CHECK (company_type IN ('Customer', 'Prospect', 'Partner', 'Other')),
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text DEFAULT 'US',
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_state text,
  shipping_postal_code text,
  shipping_country text DEFAULT 'US',
  phone text,
  website text,
  payment_terms text DEFAULT 'Net 30',
  tax_exempt boolean NOT NULL DEFAULT false,
  tax_exempt_certificate text,
  default_tax_rate numeric CHECK (default_tax_rate IS NULL OR default_tax_rate >= 0),
  primary_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  external_accounting_id text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_companies_org ON public.companies (organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_org_active_name
  ON public.companies (organization_id, is_active, name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_org_name_unique
  ON public.companies (organization_id, lower(name));
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_company
  ON public.contacts (company_id) WHERE company_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  vendor_type text NOT NULL DEFAULT 'Manufacturer'
    CHECK (vendor_type IN ('Manufacturer', 'Supplier', 'Subcontractor', 'Freight', 'Other')),
  manufacturer_id uuid REFERENCES public.product_manufacturers(id) ON DELETE SET NULL,
  account_number text,
  order_method text NOT NULL DEFAULT 'Email'
    CHECK (order_method IN ('Email', 'Portal', 'EDI', 'Fax', 'Phone')),
  order_email text,
  acknowledgment_email text,
  portal_url text,
  remit_to_name text,
  remit_to_address_line1 text,
  remit_to_address_line2 text,
  remit_to_city text,
  remit_to_state text,
  remit_to_postal_code text,
  remit_to_country text DEFAULT 'US',
  phone text,
  payment_terms text DEFAULT 'Net 30',
  freight_terms text
    CHECK (freight_terms IS NULL OR freight_terms IN (
      'FOB Origin', 'FOB Destination', 'Prepaid', 'Prepaid and Add', 'Collect')),
  standard_lead_time_days integer
    CHECK (standard_lead_time_days IS NULL OR standard_lead_time_days >= 0),
  rep_name text,
  rep_email text,
  rep_phone text,
  external_accounting_id text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors (organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_active_name
  ON public.vendors (organization_id, is_active, name);
CREATE INDEX IF NOT EXISTS idx_vendors_manufacturer
  ON public.vendors (manufacturer_id) WHERE manufacturer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_org_name_unique
  ON public.vendors (organization_id, lower(name));
CREATE TABLE IF NOT EXISTS public.vendor_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  series_id uuid REFERENCES public.product_series(id) ON DELETE CASCADE,
  contract_vehicle text,
  discount_percent numeric NOT NULL
    CHECK (discount_percent >= 0 AND discount_percent <= 100),
  effective_from date,
  effective_to date,
  CONSTRAINT vendor_discounts_effective_range
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_discounts_lookup
  ON public.vendor_discounts (vendor_id, series_id, contract_vehicle);
CREATE INDEX IF NOT EXISTS idx_vendor_discounts_org
  ON public.vendor_discounts (organization_id);
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL
    CHECK (entity_type IN (
      'project', 'proposal', 'company', 'vendor', 'sales_order', 'order_line',
      'vendor_po', 'acknowledgment', 'receipt', 'work_order', 'punch_item')),
  entity_id uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'other'
    CONSTRAINT attachments_document_type_check
    CHECK (document_type IN (
      'acknowledgment', 'packing_slip', 'bill_of_lading', 'damage_photo',
      'vendor_invoice', 'customer_invoice', 'quote', 'proposal', 'drawing',
      'specification', 'spec_file', 'photo', 'contract', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  description text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_org
  ON public.attachments (organization_id);
CREATE INDEX IF NOT EXISTS idx_attachments_org_doctype
  ON public.attachments (organization_id, document_type, created_at DESC);
