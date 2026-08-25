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

### Products

```
products                           (the dealer's own item list)
├── id (uuid, PK)
├── organization_id (FK)
├── product_number, display_id
├── name, amount, amount_unit
├── category, product_type
├── manufacturer, series, model    (plain TEXT - no catalog hierarchy)
├── specifications (JSONB), options (JSONB)
├── sort_order
└── created_by, created_at, updated_at
```

**There is no product catalog.** The domain → manufacturer → line → series →
model hierarchy, its per-model configuration schemas, option value sets, and
business rules were removed. CET, Giza, 2020, and ProjectMatrix already resolve
the part number, validate the option combination, and apply list price before a
specification reaches this app; reproducing that would mean licensing catalog
data and tracking quarterly price books across dozens of manufacturers.

`products` is what remains: a flat, org-scoped list a dealer curates for what no
spec tool provides — labor, freight, delivery, install, and ancillary items.

### Back Office (Companies, Attachments)

Foundation tables for dealer back-office operations. `contacts` model people;
`companies` is the account a dealer sells to, because an invoice cannot be
addressed to a person's name alone.

There is deliberately **no matching table for who you buy from**. Dealers place
orders in each manufacturer's own portal, so this system never composes a
document that needs an address — an address book would be pure setup cost.
Manufacturers travel as text on the order line.

```
companies                          (who you sell to)
├── id (uuid, PK)
├── organization_id (FK)
├── name, legal_name
├── company_type ('Customer' | 'Prospect' | 'Partner' | 'Other')
├── billing_address_* (line1, line2, city, state, postal_code, country)
├── shipping_address_* (falls back to billing when unset)
├── payment_terms, tax_exempt, tax_exempt_certificate, default_tax_rate
├── primary_contact_id (FK → contacts)
├── external_accounting_id (customer id in QuickBooks)
├── is_active (boolean - deactivate rather than delete)
└── created_by, created_at, updated_at

attachments                        (polymorphic file attachments)
├── id (uuid, PK)
├── organization_id (FK)
├── entity_type ('vendor_po' | 'receipt' | 'work_order' | 'order_line' | ...)
├── entity_id (uuid, NO foreign key - polymorphic)
├── document_type ('acknowledgment' | 'packing_slip' | 'damage_photo' | ...)
├── file_name, file_path, file_size, file_type
├── description
└── uploaded_by, created_at, updated_at
```

**No catalog references.** Manufacturer and series are text throughout. Spec
tools resolve part numbers and list price upstream, so the name on the line *is* the
manufacturer identity.

**Discount rates are observed from acknowledgments, not entered.** A dealer's
discount is not one number and is not reference data anyone should type in — it
is negotiated per job, and a standing schedule is stale within a quarter. The
`observed_vendor_discounts` view infers it from `po_lines.acked_unit_cost`
against `list_price`, grouped by manufacturer / series / contract.

Deliberately **not** from `order_lines.unit_cost`: that value is materialized
from the proposal, which was priced by the specification tool applying the
dealer's own multiplier — inferring from it would read the assumption back as an
observation. The view exposes both, so drift between what the quote assumes and
what factories actually charge is one subtraction (`drift_percent`, positive =
optimistic). Interpretation lives in `src/lib/pricing/observed.ts`. A line with
no list price yields `null`, distinct from a genuine 0% discount and never
coerced to it.

**Cost visibility.** Buy-side numbers on `order_lines` are readable by any
active member, deliberately — everyone in a dealer's office needs cost. The
`can_view_cost()` predicate that once gated this was removed because nothing
called it. See [SECURITY.md](SECURITY.md#cost--margin-visibility).

**Attachment caveat.** `entity_id` carries no foreign key — that is the cost of
a polymorphic table. Deleting a parent row must clean up here explicitly via
`deleteAttachmentsForEntity()`; nothing cascades on its own.

**`project_attachments` no longer exists.** It was folded into `attachments`
(`entity_type = 'project'`) and dropped. Legacy rows keep their original storage
paths; no files moved.

### Shipments & Carrier Tracking

Between "the factory acknowledged it" and "it is on our dock". Recorded from a
vendor's ship notice, then watched by a tracking provider.

```
shipments                          (freight in motion)
├── id (uuid, PK)
├── organization_id (FK), sales_order_id (FK), vendor_po_id (FK, nullable)
│
│   -- entered by a human
├── carrier_code (normalized slug), carrier_name (as the paperwork names them)
├── tracking_number (parcel), pro_number (LTL), bill_of_lading, service_level
├── ship_date, piece_count, weight_lbs, notes
│
│   -- observed; written ONLY by apply_tracking_update (service_role)
├── tracking_status ('pending' | 'info_received' | 'in_transit' |
│                    'out_for_delivery' | 'available_for_pickup' |
│                    'attempt_failed' | 'delivered' | 'exception' |
│                    'expired' | 'unknown')
├── tracking_status_detail (the carrier's own words, kept verbatim)
├── tracking_location, estimated_delivery_date, delivered_at
├── tracking_provider ('aftership' | 'easypost' | 'manual')
├── provider_tracking_id, last_checked_at, tracking_error, tracking_active
├── delivery_recorded_by (FK auth.users)  -- set only by mark_manual_delivery
└── created_by, created_at, updated_at

shipment_lines                     (what the vendor SAYS is on the truck)
├── shipment_id (FK), order_line_id (FK, RESTRICT)
├── quantity_shipped (> 0)
└── UNIQUE (shipment_id, order_line_id)

shipment_tracking_events           (carrier scans, append-only)
├── shipment_id (FK), occurred_at, status, message, location
├── checkpoint_key (dedup identity)   UNIQUE (shipment_id, checkpoint_key)
└── raw (jsonb — the provider's full payload, unread until needed)

receipts.shipment_id (FK, nullable)   -- closes the loop
```

**Carrier status is never typeable.** `apply_tracking_update` is
`SECURITY DEFINER`, granted to `service_role`, and explicitly **revoked from
`authenticated`**. `shipment_tracking_events` has a SELECT policy and no INSERT,
UPDATE, or DELETE policy. A scan history a dealer can edit is worth nothing in a
freight claim.

The UPDATE policy on `shipments` is column-blind, so that rule is enforced by
the `guard_observed_tracking` trigger: an UPDATE arriving as `authenticated`
that changes `tracking_status`, `tracking_status_detail`, `tracking_location`,
`delivered_at`, `delivery_recorded_by`, `last_checked_at`, `tracking_error`,
`provider_tracking_id`, or `tracking_provider` is rejected outright. Identifiers
(PRO, tracking number, BOL, dates, piece count, notes, `tracking_active`) stay
freely editable. `SECURITY DEFINER` functions run as the owner and are exempt by
construction, which is exactly the intended set of doors.

**One door through it: `mark_manual_delivery(p_shipment_id, p_delivered_at)`.**
A carrier with no API — own truck, white-glove agent — has nobody to ask, so its
shipment would otherwise sit at `pending` for life: `uncounted` keys off
`delivered`, meaning the deliveries a dealer controls most directly were the
only ones that could never raise it, and one given an ETA went `late` the day
after and stayed there. The function is `authenticated`-callable, checks
membership, and **refuses on any shipment whose `tracking_provider` is not
`manual`**. Who asserted it lands in `delivery_recorded_by`, so a status that
came from a human stays distinguishable from one that came from a scan. Pass
`NULL` to undo.

It is deliberately not a general status setter. `in_transit` on an own truck is
a field somebody has to remember to keep current, and the attention rules read a
stale status as fact — delivery is one terminal assertion, made once, by the
person who already knows.

**`delivered` writes no `received` events.** The carrier saying "Delivered"
means the truck stopped; it does not mean anyone counted what came off it. The
`shipment_progress` view exposes `awaiting_receipt` instead and waits for a
human. Same rule, same reason, as damaged product not counting as received.

**Idempotency.** Providers replay their entire checkpoint history on every poll
and retry webhooks, so `apply_tracking_update` is safe to run twice with the
same payload: `checkpoint_key` deduplicates the scans and the row update is a
straight overwrite. An `{"error": ...}` payload moves `last_checked_at` and
records the message *without* touching the observed status — a failed lookup
means we do not know where the freight is, not that it stopped moving.

**Two identifiers, not one.** Parcel answers to a tracking number; LTL answers
to a PRO. Both are stored, both are uniquely indexed per org and carrier, and
lookups prefer the PRO. The `shipments_identifiable` CHECK requires one of them
except when `tracking_provider = 'manual'` — an own truck has no number to give.

**Polling** is `shipments_due_for_tracking(p_limit)` (service role only), with a
per-status cadence from 1 hour for out-for-delivery to 24 hours for delivered.
It stops once nothing is uncounted, 14 days after delivery, or on `expired`.
Driven hourly by `invoke_refresh_shipment_tracking()` via pg_cron.

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
