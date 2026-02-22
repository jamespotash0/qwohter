/**
 * PostHog Analytics Integration
 *
 * Product analytics for tracking user behavior, funnels, and engagement.
 * Mirrors the sentry.ts pattern for consistency.
 *
 * What we track:
 * - User actions (proposal creation, form building, task management)
 * - Funnel progression (signup, onboarding, proposal-to-signature)
 * - Feature engagement (tab usage, navigation, integrations)
 * - Page views and clicks (via autocapture)
 *
 * What we DON'T track:
 * - Passwords, payment info, API keys
 * - Personal customer data from proposals
 * - Sensitive business information
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const ENVIRONMENT = import.meta.env.MODE;

// ============================================================================
// Event Types
// ============================================================================

export type AnalyticsEvent =
  // Auth & Onboarding
  | 'user_signed_up'
  | 'user_signed_in'
  | 'otp_verified'
  | 'organization_created'
  | 'onboarding_completed'
  | 'trial_started'
  | 'invite_accepted'
  // Proposal Lifecycle
  | 'proposal_created'
  | 'proposal_status_changed'
  | 'proposal_sent_for_signature'
  | 'proposal_version_created'
  | 'proposal_archived'
  | 'proposal_deleted'
  | 'signature_page_viewed'
  | 'signature_submitted'
  // Proposal Editor
  | 'proposal_editor_opened'
  | 'proposal_tab_switched'
  | 'proposal_saved'
  | 'line_item_added'
  | 'catalog_browsed'
  | 'ai_extraction_used'
  | 'pricing_section_added'
  | 'pricing_calculator_used'
  | 'lead_time_phase_added'
  | 'document_uploaded'
  | 'google_doc_generated'
  | 'google_doc_unlinked'
  | 'variables_panel_toggled'
  // Project Board
  | 'project_board_viewed'
  | 'project_card_opened'
  | 'project_moved'
  | 'project_reordered'
  | 'project_created'
  | 'project_deleted'
  | 'project_priority_changed'
  | 'board_column_created'
  | 'board_column_deleted'
  | 'board_column_reordered'
  | 'project_proposal_viewed'
  // Task Board
  | 'task_board_viewed'
  | 'task_created'
  | 'task_card_opened'
  | 'task_moved'
  | 'task_completed'
  | 'task_assigned'
  | 'task_priority_changed'
  | 'task_due_date_set'
  | 'task_reminder_scheduled'
  | 'task_description_edited'
  | 'task_comment_added'
  | 'task_attachment_uploaded'
  | 'task_linked_to_project'
  | 'task_column_created'
  | 'task_column_collapsed'
  // Forms & Contacts
  | 'form_created'
  | 'form_copied'
  | 'form_set_as_default'
  | 'form_archived'
  | 'contact_created'
  | 'contact_updated'
  | 'contacts_bulk_deleted'
  // Navigation & Engagement
  | 'navigation_clicked'
  | 'settings_tab_viewed'
  | 'search_performed'
  | 'export_initiated'
  // Analytics Dashboard
  | 'analytics_tab_viewed'
  | 'analytics_chart_enlarged'
  | 'analytics_time_period_changed'
  // Proposal Actions Menu
  | 'proposal_menu_action'
  // Project Detail
  | 'project_field_edited'
  // Task Detail (field-level)
  | 'task_reminder_cancelled'
  // Billing & Integrations
  | 'billing_page_viewed'
  | 'subscription_upgraded'
  | 'google_connected'
  | 'google_disconnected'
  | 'team_member_invited';

// ============================================================================
// Initialization
// ============================================================================

export const initializeAnalytics = () => {
  if (!POSTHOG_KEY) {
    console.log('[Analytics] Not initialized: no VITE_POSTHOG_KEY');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    // Autocapture clicks, page views, form interactions
    autocapture: true,
    // Track page views on route changes
    capture_pageview: true,
    capture_pageleave: true,
    // Session recording
    disable_session_recording: ENVIRONMENT === 'development',
    // Heatmaps
    enable_heatmaps: true,
    // Privacy: mask sensitive inputs
    mask_all_text: false,
    mask_all_element_attributes: false,
    // Respect Do Not Track
    respect_dnt: true,
    // Persistence
    persistence: 'localStorage+cookie',
    // Don't send data in development unless explicitly enabled
    loaded: (ph) => {
      if (ENVIRONMENT === 'development' && import.meta.env.VITE_POSTHOG_ENABLED !== 'true') {
        ph.opt_out_capturing();
        console.log('[Analytics] Opted out in development (set VITE_POSTHOG_ENABLED=true to enable)');
      }
    },
  });

  console.log('[Analytics] Initialized successfully', {
    environment: ENVIRONMENT,
    host: POSTHOG_HOST,
  });
};

// ============================================================================
// User Identification
// ============================================================================

/**
 * Identify the current user for analytics tracking.
 * Call after sign-in/sign-up and again once org data is available.
 */
export const identifyUser = (user: {
  id: string;
  email?: string;
  fullName?: string;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  plan?: string;
}) => {
  if (!POSTHOG_KEY) return;

  posthog.identify(user.id, {
    email: user.email,
    name: user.fullName,
    organization_id: user.organizationId,
    organization_name: user.organizationName,
    role: user.role,
    plan: user.plan,
  });
};

/**
 * Set organization as a PostHog group for org-level analytics.
 */
export const setOrganizationGroup = (org: {
  id: string;
  name: string;
  plan?: string;
  memberCount?: number;
  createdAt?: string;
}) => {
  if (!POSTHOG_KEY) return;

  posthog.group('organization', org.id, {
    name: org.name,
    plan: org.plan,
    member_count: org.memberCount,
    created_at: org.createdAt,
  });
};

/**
 * Reset user identity on logout.
 */
export const resetAnalyticsUser = () => {
  if (!POSTHOG_KEY) return;
  posthog.reset();
};

// ============================================================================
// Event Tracking
// ============================================================================

/**
 * Track a product analytics event with optional properties.
 */
export const trackEvent = (
  eventName: AnalyticsEvent,
  properties?: Record<string, any>
) => {
  if (!POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
};
