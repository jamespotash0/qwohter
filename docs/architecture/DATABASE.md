# Database Architecture

## Overview

- **Database:** PostgreSQL via Supabase
- **Multi-tenancy:** Organization-based isolation via RLS
- **Flexible Data:** JSONB for form data and configurations
- **Primary keys:** `uuid` defaulting to `gen_random_uuid()` (core PostgreSQL, no extension needed)

### Extensions

| Extension | Purpose |
|-----------|---------|
| `plpgsql` | Core procedural language |
| `pgcrypto` | Required by Supabase Auth for password hashing |
| `pg_cron` | Scheduled jobs (profile cleanup, signing reminders) |
| `pg_net` | Async HTTP, backs Database Webhooks |
| `pg_graphql` | Supabase-managed GraphQL endpoint (unused by the app) |
| `pg_stat_statements` | Query performance statistics |
| `supabase_vault` | Secret storage |

Do **not** reintroduce `uuid-ossp`. It was retired in
`20260819000000_consolidate_uuid_generation.sql` — `gen_random_uuid()` has been
in core PostgreSQL since 13 and is what every table uses.

## Core Tables

### Organizations & Users

```
organizations
├── id (uuid, PK)
├── name
├── prefix (for proposal numbering, e.g., "SR")
├── organization_info (JSONB - address, phone, logo_url)
├── settings (JSONB - workflow settings)
└── created_at, updated_at

profiles
├── id (uuid, PK, references auth.users)
├── email
├── full_name
├── avatar_url
├── is_super_admin (boolean)
└── created_at, updated_at

memberships
├── id (uuid, PK)
├── user_id (FK → profiles)
├── organization_id (FK → organizations)
├── role ('Owner' | 'Admin' | 'Member')
├── status ('Active' | 'Pending' | 'Inactive')
├── join_type ('Created' | 'Invited' | 'Joined')
└── created_at, updated_at
```

### Proposals & Projects

```
proposals
├── id (uuid, PK)
├── organization_id (FK)
├── proposal_number (e.g., "SR-1005.2")
├── form_id (FK → forms)
├── form_data (JSONB - all form fields)
├── status ('Draft' | 'Submitted' | 'Won' | 'Rejected' | 'Pending Approval')
├── project_name, client_name, client_company, job_location
├── total_value (numeric)
├── parent_proposal_id (FK → proposals, for versioning)
├── is_main_version (boolean)
├── submitted_at, won_at, rejected_at
└── created_at, updated_at

projects
├── id (uuid, PK)
├── organization_id (FK)
├── proposal_id (FK → proposals)
├── workflow_status (text - kanban column)
├── position (integer - order in column)
└── created_at, updated_at

project_tasks
├── id (uuid, PK)
├── project_id (FK → projects)
├── reference (e.g., "CW-1")
├── title, description
├── priority ('Low' | 'Medium' | 'High' | 'Urgent')
├── due_date
├── assigned_to (FK → profiles)
└── created_at, updated_at
```

### Signing & Activity

```
proposal_signing_tokens
├── id (uuid, PK)
├── proposal_id (FK → proposals)
├── token (text, unique - signing URL token)
├── client_email (text)
├── expires_at (timestamptz - typically 30 days)
├── signed_at (timestamptz)
├── signature_data (JSONB - signature image, metadata)
├── signature_positions (JSONB - detected marker coordinates from PDF scan)
├── unsigned_pdf_hash (text - SHA-256 hash for tamper detection)
├── reminder_config (JSONB - {enabled, interval_days, max_reminders})
├── last_reminder_sent_at (timestamptz)
├── reminder_count (integer, default 0)
└── created_at (timestamptz)

proposal_signing_activity
├── id (uuid, PK)
├── signing_token_id (FK → proposal_signing_tokens)
├── event (text - 'Sent' | 'Viewed' | 'Signed' | 'Reminder' | 'TamperDetected' | etc.)
├── metadata (JSONB - event-specific data)
└── created_at (timestamptz)
```

### Auth Rate Limits

```
auth_rate_limits
├── id (uuid, PK)
├── action (text - rate limit action type)
├── identifier (text - IP or token identifier)
├── attempts (integer)
├── last_attempt_at (timestamptz)
└── created_at (timestamptz)

-- CHECK constraint on action includes:
-- 'signing-get', 'signing-submit', 'signing-view'
-- (in addition to existing auth-related actions)
--
-- Rate limits:
--   signing-get:    10 requests/minute
--   signing-submit:  5 requests/minute
--   signing-view:   20 requests/minute
```

### Forms & Contacts

```
forms
├── id (uuid, PK)
├── organization_id (FK)
├── name
├── form_metadata (JSONB - field definitions)
├── is_archived (boolean)
└── created_at, updated_at

contacts
├── id (uuid, PK)
├── organization_id (FK)
├── full_name
├── emails (text[] - array of emails)
├── phones (JSONB - array of {number, type})
├── company_name
├── contact_type ('Customer' | 'Vendor' | 'Lead' | etc.)
├── is_in_organization (boolean)
└── created_at, updated_at
```

### Subscriptions & Billing

```
subscriptions
├── id (uuid, PK)
├── organization_id (FK)
├── stripe_customer_id
├── stripe_subscription_id
├── stripe_subscription_status
├── current_period_start, current_period_end
├── has_payment_method (boolean)
├── is_active (boolean)
├── access_blocked (boolean)
├── trial_ends_at
└── created_at, updated_at
```

### Notifications

```
notifications
├── id (uuid, PK)
├── organization_id (FK)
├── user_id (FK → profiles)
├── type (text - notification type)
├── title, message
├── data (JSONB - additional context)
├── read_at
└── created_at

notification_preferences
├── id (uuid, PK)
├── user_id (FK)
├── organization_id (FK)
├── email_enabled (boolean)
├── email_on_signature_sent (boolean)
├── ... (per-type toggles)
└── created_at, updated_at

notification_retry_queue
├── id (uuid, PK)
├── notification_type
├── payload (JSONB)
├── retry_count
├── next_retry_at
├── last_error
└── created_at
```

## Key Database Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `handle_user_deletion` | profiles | Cleanup on user delete |
| `update_proposal_creator_name_on_profile_change` | profiles | Sync name changes to proposals |
| `handle_updated_at` | multiple | Auto-update `updated_at` timestamp |
| `create_project_on_won` | proposals | Auto-create project when proposal wins |

## Indexes

Standard indexes on all tables:
- `organization_id` - Multi-tenant queries
- `created_at` - Sorting and pagination
- Foreign key columns

Notable indexes:
- `idx_profiles_email` - Unique btree on `profiles.email` for fast signup email lookups

## RLS Patterns

See [SECURITY.md](./SECURITY.md) for comprehensive RLS documentation.

## Key Files

- `supabase/migrations/` - All database migrations
- `supabase/migrations/05_essential_functions.sql` - RLS helper functions
- `src/integrations/supabase/types.ts` - Generated TypeScript types
