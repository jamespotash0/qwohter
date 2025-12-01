-- ============================================================================
-- RLS POLICIES - Extracted from Production
-- ============================================================================
-- Run this in STAGING after:
-- 1. Running 00_create_schema.sql
-- 2. Adding essential functions (03_essential_functions_only.sql)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_creation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_workflow_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_desktop_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_desktop_customer_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_desktop_invoice_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_desktop_item_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_desktop_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_request_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_seat_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FORMS POLICIES
-- ============================================================================

-- Table: forms
-- Policy: Users can create forms in their organization
CREATE POLICY "Users can create forms in their organization"
  ON public.forms
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: forms
-- Policy: Users can delete forms in their organization
CREATE POLICY "Users can delete forms in their organization"
  ON public.forms
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: forms
-- Policy: Users can update forms in their organization
CREATE POLICY "Users can update forms in their organization"
  ON public.forms
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: forms
-- Policy: Users can view forms in their organization
CREATE POLICY "Users can view forms in their organization"
  ON public.forms
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: forms
-- Policy: forms_delete_policy
CREATE POLICY forms_delete_policy
  ON public.forms
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((organization_id IS NOT NULL) AND is_active_member(auth.uid(), organization_id) AND (is_template = false)))
;

-- Table: forms
-- Policy: forms_insert_policy
CREATE POLICY forms_insert_policy
  ON public.forms
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((organization_id IS NOT NULL) AND is_active_member(auth.uid(), organization_id) AND (created_by = auth.uid()) AND (is_template = false)))
;

-- Table: forms
-- Policy: forms_select_policy
CREATE POLICY forms_select_policy
  ON public.forms
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((((organization_id IS NOT NULL) AND is_active_member(auth.uid(), organization_id)) OR ((organization_id IS NULL) AND (is_template = true) AND (auth.uid() IS NOT NULL))))
;

-- Table: forms
-- Policy: forms_update_policy
CREATE POLICY forms_update_policy
  ON public.forms
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((organization_id IS NOT NULL) AND is_active_member(auth.uid(), organization_id) AND (is_template = false)))
  WITH CHECK (((organization_id IS NOT NULL) AND is_active_member(auth.uid(), organization_id) AND (is_template = false)))
;

-- ============================================================================
-- INVITE_TOKENS POLICIES
-- ============================================================================

-- Table: invite_tokens
-- Policy: Admins can create invite tokens for their organization
CREATE POLICY "Admins can create invite tokens for their organization"
  ON public.invite_tokens
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Admin'::text, 'Owner'::text]))))))
;

-- Table: invite_tokens
-- Policy: Admins can delete invite tokens for their organization
CREATE POLICY "Admins can delete invite tokens for their organization"
  ON public.invite_tokens
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Admin'::text, 'Owner'::text]))))))
;

-- Table: invite_tokens
-- Policy: Admins can update invite tokens for their organization
CREATE POLICY "Admins can update invite tokens for their organization"
  ON public.invite_tokens
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Admin'::text, 'Owner'::text]))))))
;

-- Table: invite_tokens
-- Policy: Users can view invite tokens for their organization
CREATE POLICY "Users can view invite tokens for their organization"
  ON public.invite_tokens
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- MEMBERSHIPS POLICIES
-- ============================================================================

-- Table: memberships
-- Policy: memberships_delete_policy
CREATE POLICY memberships_delete_policy
  ON public.memberships
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
;

-- Table: memberships
-- Policy: memberships_insert_policy
CREATE POLICY memberships_insert_policy
  ON public.memberships
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]))))
;

-- Table: memberships
-- Policy: memberships_select_policy
CREATE POLICY memberships_select_policy
  ON public.memberships
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (can_view_membership(auth.uid(), user_id, organization_id))
;

-- Table: memberships
-- Policy: memberships_update_policy
CREATE POLICY memberships_update_policy
  ON public.memberships
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
;

-- ============================================================================
-- ORGANIZATION_CREATION_LOG POLICIES
-- ============================================================================

-- Table: organization_creation_log
-- Policy: creation_log_delete_policy
CREATE POLICY creation_log_delete_policy
  ON public.organization_creation_log
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (is_owner_or_admin())
;

-- Table: organization_creation_log
-- Policy: creation_log_insert_policy
CREATE POLICY creation_log_insert_policy
  ON public.organization_creation_log
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() IS NOT NULL))
;

-- Table: organization_creation_log
-- Policy: creation_log_select_policy
CREATE POLICY creation_log_select_policy
  ON public.organization_creation_log
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((user_id = auth.uid()) OR is_owner_or_admin()))
;

-- Table: organization_creation_log
-- Policy: creation_log_update_policy
CREATE POLICY creation_log_update_policy
  ON public.organization_creation_log
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (false)
;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Table: organizations
-- Policy: Allow users to search organizations by code
CREATE POLICY "Allow users to search organizations by code"
  ON public.organizations
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true)
;

-- Table: organizations
-- Policy: Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (true)
;

-- Table: organizations
-- Policy: Only members can update their organization
CREATE POLICY "Only members can update their organization"
  ON public.organizations
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), id, ARRAY['Owner'::text, 'Admin'::text]))
;

-- Table: organizations
-- Policy: organizations_delete_policy
CREATE POLICY organizations_delete_policy
  ON public.organizations
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.organization_id = organizations.id) AND (m.user_id = auth.uid()) AND (m.role = 'Owner'::text) AND (m.status = 'Active'::text)))))
;

-- Table: organizations
-- Policy: organizations_insert_policy
CREATE POLICY organizations_insert_policy
  ON public.organizations
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() IS NOT NULL))
;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Table: profiles
-- Policy: Users can view profiles in their organization
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (memberships m1
     JOIN memberships m2 ON ((m1.organization_id = m2.organization_id)))
  WHERE ((m1.user_id = auth.uid()) AND (m1.status = 'Active'::text) AND (m2.user_id = profiles.id))))))
;

-- Table: profiles
-- Policy: profiles_delete_policy
CREATE POLICY profiles_delete_policy
  ON public.profiles
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (false)
;

-- Table: profiles
-- Policy: profiles_insert_policy
CREATE POLICY profiles_insert_policy
  ON public.profiles
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = id))
;

-- Table: profiles
-- Policy: profiles_select_policy
CREATE POLICY profiles_select_policy
  ON public.profiles
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((auth.uid() = id) OR (id IN ( SELECT get_org_member_ids.user_id
   FROM get_org_member_ids(auth.uid()) get_org_member_ids(user_id)))))
;

-- Table: profiles
-- Policy: profiles_update_policy
CREATE POLICY profiles_update_policy
  ON public.profiles
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id))
;

-- ============================================================================
-- PROJECT_WORKFLOW_COLUMNS POLICIES
-- ============================================================================

-- Table: project_workflow_columns
-- Policy: Users can create workflow columns in their organization
CREATE POLICY "Users can create workflow columns in their organization"
  ON public.project_workflow_columns
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: project_workflow_columns
-- Policy: Users can delete workflow columns in their organization
CREATE POLICY "Users can delete workflow columns in their organization"
  ON public.project_workflow_columns
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))) AND (is_default = false)))
;

-- Table: project_workflow_columns
-- Policy: Users can update workflow columns in their organization
CREATE POLICY "Users can update workflow columns in their organization"
  ON public.project_workflow_columns
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: project_workflow_columns
-- Policy: Users can view workflow columns in their organization
CREATE POLICY "Users can view workflow columns in their organization"
  ON public.project_workflow_columns
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Table: projects
-- Policy: Users can create projects in their organization
CREATE POLICY "Users can create projects in their organization"
  ON public.projects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: projects
-- Policy: Users can delete projects in their organization
CREATE POLICY "Users can delete projects in their organization"
  ON public.projects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: projects
-- Policy: Users can update projects in their organization
CREATE POLICY "Users can update projects in their organization"
  ON public.projects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- Table: projects
-- Policy: Users can view projects in their organization
CREATE POLICY "Users can view projects in their organization"
  ON public.projects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE (memberships.user_id = auth.uid()))))
;

-- ============================================================================
-- PROPOSAL_ACTIVITIES POLICIES
-- ============================================================================

-- Table: proposal_activities
-- Policy: proposal_activities_insert_policy
CREATE POLICY proposal_activities_insert_policy
  ON public.proposal_activities
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((is_active_member(auth.uid(), organization_id) AND (user_id = auth.uid())))
;

-- Table: proposal_activities
-- Policy: proposal_activities_select_policy
CREATE POLICY proposal_activities_select_policy
  ON public.proposal_activities
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- ============================================================================
-- PROPOSAL_STATUS_TRANSITIONS POLICIES
-- ============================================================================

-- Table: proposal_status_transitions
-- Policy: proposal_status_transitions_insert_policy
CREATE POLICY proposal_status_transitions_insert_policy
  ON public.proposal_status_transitions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (is_active_member(auth.uid(), organization_id))
;

-- Table: proposal_status_transitions
-- Policy: proposal_status_transitions_select_policy
CREATE POLICY proposal_status_transitions_select_policy
  ON public.proposal_status_transitions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- ============================================================================
-- PROPOSALS POLICIES
-- ============================================================================

-- Table: proposals
-- Policy: proposals_delete_policy
CREATE POLICY proposals_delete_policy
  ON public.proposals
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((((organization_id IS NULL) AND (auth.uid() = created_by)) OR ((organization_id = get_current_user_organization()) AND (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.organization_id = proposals.organization_id) AND (m.status = 'Active'::text)))))))
;

-- Table: proposals
-- Policy: proposals_insert_policy
CREATE POLICY proposals_insert_policy
  ON public.proposals
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((is_active_member(auth.uid(), organization_id) AND (created_by = auth.uid())))
;

-- Table: proposals
-- Policy: proposals_select_policy
CREATE POLICY proposals_select_policy
  ON public.proposals
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- Table: proposals
-- Policy: proposals_update_policy
CREATE POLICY proposals_update_policy
  ON public.proposals
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- ============================================================================
-- QUICKBOOKS_DESKTOP_CONNECTIONS POLICIES
-- ============================================================================

-- Table: quickbooks_desktop_connections
-- Policy: Owner/Admin can delete QB Desktop connections
CREATE POLICY "Owner/Admin can delete QB Desktop connections"
  ON public.quickbooks_desktop_connections
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Owner'::text, 'Admin'::text]))))))
;

-- Table: quickbooks_desktop_connections
-- Policy: Owner/Admin can manage QB Desktop connections
CREATE POLICY "Owner/Admin can manage QB Desktop connections"
  ON public.quickbooks_desktop_connections
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Owner'::text, 'Admin'::text]))))))
;

-- Table: quickbooks_desktop_connections
-- Policy: Owner/Admin can update QB Desktop connections
CREATE POLICY "Owner/Admin can update QB Desktop connections"
  ON public.quickbooks_desktop_connections
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Owner'::text, 'Admin'::text]))))))
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text) AND (memberships.role = ANY (ARRAY['Owner'::text, 'Admin'::text]))))))
;

-- Table: quickbooks_desktop_connections
-- Policy: Service role can manage QB connections
CREATE POLICY "Service role can manage QB connections"
  ON public.quickbooks_desktop_connections
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
;

-- Table: quickbooks_desktop_connections
-- Policy: Users can view their org's QB Desktop connection
CREATE POLICY "Users can view their org's QB Desktop connection"
  ON public.quickbooks_desktop_connections
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- QUICKBOOKS_DESKTOP_CUSTOMER_SYNC POLICIES
-- ============================================================================

-- Table: quickbooks_desktop_customer_sync
-- Policy: Service role can manage customer syncs
CREATE POLICY "Service role can manage customer syncs"
  ON public.quickbooks_desktop_customer_sync
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
;

-- Table: quickbooks_desktop_customer_sync
-- Policy: Users can view their org's customer syncs
CREATE POLICY "Users can view their org's customer syncs"
  ON public.quickbooks_desktop_customer_sync
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- QUICKBOOKS_DESKTOP_INVOICE_SYNC POLICIES
-- ============================================================================

-- Table: quickbooks_desktop_invoice_sync
-- Policy: Service role can manage invoice syncs
CREATE POLICY "Service role can manage invoice syncs"
  ON public.quickbooks_desktop_invoice_sync
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
;

-- Table: quickbooks_desktop_invoice_sync
-- Policy: Users can create invoice syncs
CREATE POLICY "Users can create invoice syncs"
  ON public.quickbooks_desktop_invoice_sync
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- Table: quickbooks_desktop_invoice_sync
-- Policy: Users can update invoice syncs
CREATE POLICY "Users can update invoice syncs"
  ON public.quickbooks_desktop_invoice_sync
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- Table: quickbooks_desktop_invoice_sync
-- Policy: Users can view their org's invoice syncs
CREATE POLICY "Users can view their org's invoice syncs"
  ON public.quickbooks_desktop_invoice_sync
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- QUICKBOOKS_DESKTOP_ITEM_SYNC POLICIES
-- ============================================================================

-- Table: quickbooks_desktop_item_sync
-- Policy: Service role can manage item syncs
CREATE POLICY "Service role can manage item syncs"
  ON public.quickbooks_desktop_item_sync
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
;

-- Table: quickbooks_desktop_item_sync
-- Policy: Users can view their org's item syncs
CREATE POLICY "Users can view their org's item syncs"
  ON public.quickbooks_desktop_item_sync
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- QUICKBOOKS_DESKTOP_SESSION_LOGS POLICIES
-- ============================================================================

-- Table: quickbooks_desktop_session_logs
-- Policy: Service role can manage session logs
CREATE POLICY "Service role can manage session logs"
  ON public.quickbooks_desktop_session_logs
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
;

-- ============================================================================
-- QUICKBOOKS_REQUEST_QUEUE POLICIES
-- ============================================================================

-- Table: quickbooks_request_queue
-- Policy: Service role can manage QB queue
CREATE POLICY "Service role can manage QB queue"
  ON public.quickbooks_request_queue
  AS PERMISSIVE
  FOR ALL
  TO public
  USING ((auth.role() = 'service_role'::text))
;

-- Table: quickbooks_request_queue
-- Policy: Users can create invoice requests
CREATE POLICY "Users can create invoice requests"
  ON public.quickbooks_request_queue
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- Table: quickbooks_request_queue
-- Policy: Users can view their org's request queue
CREATE POLICY "Users can view their org's request queue"
  ON public.quickbooks_request_queue
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- QUOTE_ACTIVITIES POLICIES
-- ============================================================================

-- Table: quote_activities
-- Policy: Users can insert activities for their organization
CREATE POLICY "Users can insert activities for their organization"
  ON public.quote_activities
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- Table: quote_activities
-- Policy: Users can view activities from their organization
CREATE POLICY "Users can view activities from their organization"
  ON public.quote_activities
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- Table: quote_activities
-- Policy: quote_activities_insert_policy
CREATE POLICY quote_activities_insert_policy
  ON public.quote_activities
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((is_active_member(auth.uid(), organization_id) AND (user_id = auth.uid())))
;

-- Table: quote_activities
-- Policy: quote_activities_select_policy
CREATE POLICY quote_activities_select_policy
  ON public.quote_activities
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- ============================================================================
-- QUOTE_STATUS_TRANSITIONS POLICIES
-- ============================================================================

-- Table: quote_status_transitions
-- Policy: System can insert transitions
CREATE POLICY "System can insert transitions"
  ON public.quote_status_transitions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- Table: quote_status_transitions
-- Policy: Users can view transitions in their org
CREATE POLICY "Users can view transitions in their org"
  ON public.quote_status_transitions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id IN ( SELECT memberships.organization_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.status = 'Active'::text)))))
;

-- ============================================================================
-- QUOTES POLICIES
-- ============================================================================

-- Table: quotes
-- Policy: quotes_delete_policy
CREATE POLICY quotes_delete_policy
  ON public.quotes
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((((organization_id IS NULL) AND (auth.uid() = created_by)) OR ((organization_id = get_current_user_organization()) AND (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.organization_id = quotes.organization_id) AND (m.status = 'Active'::text)))))))
;

-- Table: quotes
-- Policy: quotes_insert_policy
CREATE POLICY quotes_insert_policy
  ON public.quotes
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((is_active_member(auth.uid(), organization_id) AND (created_by = auth.uid())))
;

-- Table: quotes
-- Policy: quotes_select_policy
CREATE POLICY quotes_select_policy
  ON public.quotes
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- Table: quotes
-- Policy: quotes_update_policy
CREATE POLICY quotes_update_policy
  ON public.quotes
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- ============================================================================
-- REMINDERS POLICIES
-- ============================================================================

-- Table: reminders
-- Policy: Active members can create organization reminders
CREATE POLICY "Active members can create organization reminders"
  ON public.reminders
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((is_active_member(auth.uid(), organization_id) AND (created_by = auth.uid())))
;

-- Table: reminders
-- Policy: Active members can delete organization reminders
CREATE POLICY "Active members can delete organization reminders"
  ON public.reminders
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((is_active_member(auth.uid(), organization_id) AND ((created_by = auth.uid()) OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]))))
;

-- Table: reminders
-- Policy: Active members can update organization reminders
CREATE POLICY "Active members can update organization reminders"
  ON public.reminders
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((is_active_member(auth.uid(), organization_id) AND ((created_by = auth.uid()) OR has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]))))
;

-- Table: reminders
-- Policy: Active members can view organization reminders
CREATE POLICY "Active members can view organization reminders"
  ON public.reminders
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- ============================================================================
-- SUBSCRIPTION_PLANS POLICIES
-- ============================================================================

-- Table: subscription_plans
-- Policy: subscription_plans_select_policy
CREATE POLICY subscription_plans_select_policy
  ON public.subscription_plans
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((is_active = true))
;

-- ============================================================================
-- SUBSCRIPTION_SEAT_USAGE_EVENTS POLICIES
-- ============================================================================

-- Table: subscription_seat_usage_events
-- Policy: seat_usage_delete_service_only
CREATE POLICY seat_usage_delete_service_only
  ON public.subscription_seat_usage_events
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (false)
;

-- Table: subscription_seat_usage_events
-- Policy: seat_usage_insert_service_only
CREATE POLICY seat_usage_insert_service_only
  ON public.subscription_seat_usage_events
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (false)
;

-- Table: subscription_seat_usage_events
-- Policy: seat_usage_select
CREATE POLICY seat_usage_select
  ON public.subscription_seat_usage_events
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((subscription_id IN ( SELECT s.id
   FROM (subscriptions s
     JOIN memberships m ON ((m.organization_id = s.organization_id)))
  WHERE ((m.user_id = auth.uid()) AND (m.status = 'Active'::text)))))
;

-- Table: subscription_seat_usage_events
-- Policy: seat_usage_update_service_only
CREATE POLICY seat_usage_update_service_only
  ON public.subscription_seat_usage_events
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (false)
;

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

-- Table: subscriptions
-- Policy: subscriptions_insert_policy
CREATE POLICY subscriptions_insert_policy
  ON public.subscriptions
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((auth.uid() IS NOT NULL) AND (organization_id IN ( SELECT m.organization_id
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.role = 'Owner'::text) AND (m.status = 'Active'::text))))))
;

-- Table: subscriptions
-- Policy: subscriptions_select_policy
CREATE POLICY subscriptions_select_policy
  ON public.subscriptions
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (is_active_member(auth.uid(), organization_id))
;

-- Table: subscriptions
-- Policy: subscriptions_update_policy
CREATE POLICY subscriptions_update_policy
  ON public.subscriptions
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (has_org_role(auth.uid(), organization_id, ARRAY['Owner'::text, 'Admin'::text]))
;

-- ============================================================================
-- USER_ONBOARDING_PROGRESS POLICIES
-- ============================================================================

-- Table: user_onboarding_progress
-- Policy: onboarding_delete_policy
CREATE POLICY onboarding_delete_policy
  ON public.user_onboarding_progress
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = auth.uid()))
;

-- Table: user_onboarding_progress
-- Policy: onboarding_insert_policy
CREATE POLICY onboarding_insert_policy
  ON public.user_onboarding_progress
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = auth.uid()))
;

-- Table: user_onboarding_progress
-- Policy: onboarding_select_policy
CREATE POLICY onboarding_select_policy
  ON public.user_onboarding_progress
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()))
;

-- Table: user_onboarding_progress
-- Policy: onboarding_update_policy
CREATE POLICY onboarding_update_policy
  ON public.user_onboarding_progress
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()))
;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- RLS Policies applied successfully.
--
-- IMPORTANT: These policies reference the following helper functions:
-- - is_active_member(user_id, org_id)
-- - has_org_role(user_id, org_id, roles[])
-- - can_view_membership(user_id, member_user_id, org_id)
-- - is_owner_or_admin()
-- - get_current_user_organization()
-- - get_org_member_ids(user_id)
--
-- Make sure these functions exist before running this file!
-- ============================================================================
