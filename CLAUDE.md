# CLAUDE.md

Essential guidance for Claude Code when working with **Qwohter** - A proposal and quote management platform.

> **Note:** Directory names use legacy "WallQu/wall-quote-wizard" naming. Do NOT rename.

---

## Quick Commands

```bash
# Development
npm run dev                    # Dev server → remote Supabase (production DB)
npm run dev:local              # Dev server → local Supabase (127.0.0.1:54321)
npm run build                  # Production build (auto-increments version)
npm run lint && npm run build  # Validate before commits

# Testing
npm run test                   # Unit tests (watch mode)
npm run test:coverage          # Coverage report

# Supabase
supabase start                 # Start local Supabase
supabase db reset              # Reset with migrations
supabase functions serve       # Run edge functions locally

# Documentation (VitePress)
npm run docs:dev               # Dev docs site (localhost:5174)
npm run docs:build             # Build static docs site
npm run docs:preview           # Preview built docs
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| State | React Query (server) + Zustand (UI) |
| Payments | Stripe (subscriptions, per-seat pricing) |
| Email | Resend (transactional emails with retry) |
| Integrations | Google Docs/Drive |
| Monitoring | Sentry, Vercel Analytics, PostHog |

---

## Documentation Index

### Architecture (How it works)

| Doc | Description |
|-----|-------------|
| [APP_SHELL.md](docs/architecture/APP_SHELL.md) | Sidebar modes, top bar, profile menu, content frame |
| [AUTH.md](docs/architecture/AUTH.md) | Auth flows, sign-in/out edge cases, rate limiting, onboarding |
| [DATABASE.md](docs/architecture/DATABASE.md) | Schema overview, tables, triggers, indexes |
| [SECURITY.md](docs/architecture/SECURITY.md) | RLS policies, helper functions, security checklist |
| [STATE_MANAGEMENT.md](docs/architecture/STATE_MANAGEMENT.md) | React Query, Zustand, real-time subscriptions |
| [OBSERVABILITY.md](docs/architecture/OBSERVABILITY.md) | Sentry integration, error tracking, stale client detection |

### Features (What it does)

| Doc | Description |
|-----|-------------|
| [PROPOSALS.md](docs/features/PROPOSALS.md) | Versioning, e-signature, approval workflow, PDF export |
| [PROJECTS.md](docs/features/PROJECTS.md) | Kanban board, tasks, attachments |
| [CONTACTS.md](docs/features/CONTACTS.md) | Contact management, phone validation |
| [FORMS.md](docs/features/FORMS.md) | Form builder, templates, JSONB structure |
| [BACK_OFFICE.md](docs/features/BACK_OFFICE.md) | Dealer back office: companies, vendors, discount resolution, list-down pricing, attachments |
| [NOTIFICATIONS.md](docs/features/NOTIFICATIONS.md) | Email/in-app notifications, retry logic, preferences |
| [SETTINGS.md](docs/features/SETTINGS.md) | All settings tabs, workflow settings |
| [BILLING.md](docs/features/BILLING.md) | Stripe subscriptions, webhooks, seat management |
| [ADMIN.md](docs/features/ADMIN.md) | Super admin panel, product catalog |
| [GOOGLE_INTEGRATION.md](docs/features/GOOGLE_INTEGRATION.md) | OAuth, Docs/Drive, template variables |

### Guides (How to do things)

| Doc | Description |
|-----|-------------|
| [NEW_FEATURE_GUIDE.md](docs/guides/NEW_FEATURE_GUIDE.md) | Step-by-step checklist for adding features |
| [TESTING.md](docs/guides/TESTING.md) | Vitest setup, patterns, mocking |
| [EDGE_FUNCTIONS.md](docs/guides/EDGE_FUNCTIONS.md) | Edge function templates, all functions reference |
| [GOOGLE_RISC_SETUP.md](docs/guides/GOOGLE_RISC_SETUP.md) | Google security events configuration |
| [RESEND_SMTP_SETUP.md](docs/guides/RESEND_SMTP_SETUP.md) | Email SMTP configuration |
| [LOCAL_DEV.md](docs/guides/LOCAL_DEV.md) | Local development setup, env files, running services |
| [NEW_PROJECT_SETUP.md](docs/guides/NEW_PROJECT_SETUP.md) | Standing up a new Supabase project: schema scripts, auth config, edge function deploy |
| [VARIABLES.md](docs/guides/VARIABLES.md) | Template variable syntax, BLOCK system, product fields |

### Reference

| Doc | Description |
|-----|-------------|
| [ENVIRONMENT.md](docs/reference/ENVIRONMENT.md) | All environment variables |
| [LANDING_PAGE.md](docs/reference/LANDING_PAGE.md) | Landing page components, animations |

### Plans (Future work - NOT implemented)

| Doc | Description |
|-----|-------------|
| [CLIENT_PORTAL_PLAN.md](docs/plans/CLIENT_PORTAL_PLAN.md) | Client portal feature plan |
| [PERMISSIONS_BITMASK_PLAN.md](docs/plans/PERMISSIONS_BITMASK_PLAN.md) | JWT + bitmask permissions (replace per-request DB role checks) |

---

## Quick Security Reference

**Always use RLS helper functions:**

```sql
-- Check membership
is_active_member(auth.uid(), organization_id)

-- Check role
has_org_role(auth.uid(), organization_id, ARRAY['Admin', 'Owner'])

-- Current user helpers
is_owner_or_admin()
get_current_user_organization()
get_current_user_role()
```

See [SECURITY.md](docs/architecture/SECURITY.md) for full reference.

---

## Coding Standards

### File Limits
- **Max 500 lines per file** - Break up at 400 lines
- **Single responsibility** - One concern per file

### State Management
- **Server state:** Always React Query
- **UI state:** useState (local) or Zustand (global)
- **Never mix:** Keep server and UI state separate

### Naming
- Services: `{feature}Service.ts`
- Hooks: `use{Feature}.ts`
- Components: PascalCase

### Error Handling

```typescript
try {
  const result = await service.operation(data);
  toast({ title: 'Success', description: 'Done' });
} catch (error) {
  toast({
    title: 'Error',
    description: error instanceof Error ? error.message : 'Unknown error',
    variant: 'destructive',
  });
}
```

---

## Key Files

| System | Files |
|--------|-------|
| Auth | `src/auth/AuthProvider.tsx`, `src/auth/services/authService.ts` |
| Proposals | `src/services/proposalsService.ts`, `src/hooks/queries/useProposals.ts` |
| Query Client | `src/lib/queryClient.ts` |
| Realtime | `src/lib/realtimeSubscriptions.ts` |
| Types | `src/integrations/supabase/types.ts` |

---

## Branching Strategy

- **Development:** `feature/form-builder-system` (active development)
- **Production:** `main` (deployed to Vercel)
- **New features:** Branch off `feature/form-builder-system` as `feature/{name}`
- **Hotfixes:** Branch off `main` as `hotfix/{name}`

---

## Version Management

**Auto-managed** - Do NOT edit `public/version.json`

- Format: `v1.0.{buildNumber}`
- Increments on every build
- Stale client detection every 5 minutes

---

## Documentation Maintenance

**Always update documentation when making changes.** When any code change affects behavior documented in the `docs/` directory, update the relevant `.md` file(s) as part of the same change. This includes:

- New features → Add to the relevant feature doc or create a new one
- New environment variables → Update [ENVIRONMENT.md](docs/reference/ENVIRONMENT.md) and [LOCAL_DEV.md](docs/guides/LOCAL_DEV.md)
- New edge functions → Update [EDGE_FUNCTIONS.md](docs/guides/EDGE_FUNCTIONS.md) and the edge functions table in [LOCAL_DEV.md](docs/guides/LOCAL_DEV.md)
- Schema changes → Update [DATABASE.md](docs/architecture/DATABASE.md)
- Auth changes → Update [AUTH.md](docs/architecture/AUTH.md)
- New guides or setup steps → Update this file's Documentation Index

