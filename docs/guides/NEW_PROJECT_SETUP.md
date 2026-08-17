# Standing up the new Supabase project

Ordered runbook for building the Qwohter (new version) database from scratch, in a
Supabase organisation separate from the CWS/legacy project. Every step uses
`--project-ref` rather than `supabase link`, so cross-org membership is never an issue.


---

## 0. Create the project

Dashboard → new project, in the target org. Note the **project ref** and save the
**database password** — `psql` needs it and it cannot be recovered later, only reset.

Set the tier deliberately: a Free-tier project **pauses after ~7 days of inactivity**,
which is fine while building but not once a domain points at it.

```bash
export NEW_REF="iukfjhzmjgvtxefhhshd"
export DB_URL="postgresql://postgres.$NEW_REF:<PASSWORD>@...pooler.supabase.com:5432/postgres"
```

Use the **session-mode connection on port 5432**, not the transaction pooler on 6543 —
DDL, functions and extensions all need session mode.

---

## 1. Schema — three files, in order

```bash
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/new-app-tables.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/new-app-layer.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/new-app-storage.sql
```

| File | Contents |
|---|---|
| [new-app-tables.sql](../../supabase/scripts/new-app-tables.sql) | 60 tables, 542 statements — constraints, indexes, defaults |
| [new-app-layer.sql](../../supabase/scripts/new-app-layer.sql) | 1,269 statements — 118 functions, 122 policies, 65 triggers, 501 grants, 8 views, cron, realtime, seed |
| [new-app-storage.sql](../../supabase/scripts/new-app-storage.sql) | All 4 buckets + 16 policies — the single source of truth for storage |

**60 tables, not 62** — the scripts are purged of the entire quote era. `quotes` and
`document_templates` are gone, along with `projects.quote_id`,
`organizations.quote_start_number`, the unused `quote_status` enum, and every
quote-side function, trigger, policy and grant. Four functions that fired from live
tables were retargeted at `proposals` rather than deleted, because deleting them would
break signup and project updates:

| Function | Trigger fires on | Now writes to |
|---|---|---|
| `handle_user_deletion` | `profiles` | `proposals` |
| `update_proposal_creator_name_on_profile_change` | `profiles` | `proposals` |
| `update_proposal_creator_name_on_membership_change` | `memberships` | `proposals` |
| `sync_proposal_on_board_status` | `projects` | `proposals` |

Every other quote-side trigger was dropped outright, since each already had a
proposals twin (`ensure_single_main_version_for_proposals`, `normalize_proposal_status`,
`handle_proposal_status_change`, `sync_projects_from_proposal_is_on_board`,
`sync_project_on_proposal_status_change`).

⚠️ The layer file has three cron jobs that call edge functions by **absolute URL**, and
those URLs are baked in as `https://iukfjhzmjgvtxefhhshd.supabase.co/...`. Applying this file
to any other project would make that database's scheduled jobs fire at this project's
functions — notification and signature reminder emails sent from the wrong app, with no
error anywhere. Check before applying:

```bash
grep -c 'iukfjhzmjgvtxefhhshd' supabase/scripts/new-app-layer.sql   # expect 4
```

RLS is off and every table is unprotected until file 2 completes. Do not point the app
at a database that has only had file 1 applied.

---

## 2. Vault secret

The cron functions read the service-role key from the vault; it cannot live in SQL:

```sql
SELECT vault.create_secret('<service-role-key>', 'service_role_key');
```

Without it the cron jobs fail silently.

---

## 3. Auth settings

Dashboard-only settings, now captured as code in the `[auth]` block of
[supabase/config.toml](../../supabase/config.toml):

```bash
export SITE_URL='https://qwohter.com'          # cws-qwohter.com for the legacy app
export RESEND_SMTP_PASSWORD='re_...'
supabase config push --project-ref "$NEW_REF"
```

Covers Site URL, the redirect allow-list, JWT expiry, refresh-token rotation, email
confirmation behaviour and Resend SMTP. None of this is in any migration — a database
restored from SQL alone has the wrong Site URL, an empty redirect allow-list and no SMTP,
which silently breaks signup confirmation, invites and password reset.

`site_url` reads from `env(SITE_URL)` — it is the one value that differs per app.

The `[functions]` block in the same file sets `verify_jwt = false` for all **38**
functions; each validates its own caller. Two were missing that entry
(`google-get-token`, `signature-reminders`) and have been added — `signature-reminders`
especially, since pg_cron invokes it over pg_net with no user JWT and the gateway
would otherwise reject the call.

---

## 4. Edge functions

```bash
cp supabase/scripts/functions-secrets.example .env.functions
# fill in values (gitignored)
./supabase/scripts/deploy-edge-functions.sh "$NEW_REF"
```

Deploys all **38** functions (`_deprecated` holds four retired subscription functions) and
sets their secrets. `--secrets-only` / `--deploy-only` re-run just one half.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` are
injected by the platform — the CLI rejects attempts to set them.

---

## 5. External wiring

| Service | Action |
|---|---|
| Stripe | **New** webhook endpoint → `https://$NEW_REF.supabase.co/functions/v1/stripe-webhook`. Safe alongside the legacy endpoint: every `.single()` lookup in `stripe-webhook` null-checks, so each project no-ops on the other's customers. Put the signing secret in `.env.functions` and re-run `--secrets-only`. |
| Google OAuth | Add `https://$NEW_REF.supabase.co/functions/v1/google-oauth-callback` to the existing client. Additive — does not affect the old app. |
| Sentry / PostHog | New projects, new DSN/key. |

---

## 6. Verify

```sql
-- table_type filter matters: there are also 8 views in public
SELECT count(*) FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE';                        -- 60

SELECT count(*) FROM pg_policies WHERE schemaname = 'storage';                       -- 16
SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;                 -- 4 rows
SELECT jobname, schedule FROM cron.job ORDER BY jobname;                             -- 4 rows
SELECT jobname, command FROM cron.job WHERE command LIKE '%supabase.co%';            -- no old ref

-- Nothing quote-era should survive anywhere:
SELECT tablename FROM pg_tables
 WHERE schemaname = 'public' AND (tablename LIKE '%quote%'
                              OR tablename = 'document_templates');                  -- 0 rows
SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND proname LIKE '%quote%';                              -- 0 rows
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND column_name LIKE '%quote%';                       -- 0 rows

-- RLS must be on for every table
SELECT count(*) FROM pg_tables t
 WHERE t.schemaname = 'public'
   AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relname = t.tablename
                      AND c.relrowsecurity);                                         -- 0
```

> The public policy count is deliberately not asserted: the layer file has 122 top-level
> `CREATE POLICY` statements, but some migrations also create policies inside `DO $$`
> blocks, so the runtime total is higher than any figure countable from the file.
>
> The policy set was de-duplicated: 20 per-command policies across 5 tables collapsed
> into 5 `FOR ALL` policies, 9 `TO service_role` policies dropped (that role has
> BYPASSRLS, so they were never evaluated), and an `anon`-readable full-table SELECT on
> `profiles` removed. 147 -> 122.

---

## Known blocker

`quickbooks_online_connections` and `quickbooks_online_invoice_sync` are queried by
[quickbooksOnlineService.ts](../../src/services/quickbooksOnlineService.ts) from five live
modules, but no migration creates them — so they are absent from these scripts too.
Either the feature is dead code to be deleted, or the squashed baseline lost schema.
`supabase db diff --linked` against the current production project settles it, and is
worth running regardless to confirm the baseline still matches reality.
