# Product Feedback — Zendesk Integration

> **Status:** Planned | **Priority:** TBD

---

## Overview

Add a product feedback system that allows users to submit feedback directly from the app, creates tickets in Zendesk, and surfaces submitted feedback in the super admin panel.

---

## Goals

- Give users a low-friction way to submit product feedback without leaving the app
- Route all feedback into Zendesk for centralized ticket management
- Allow super admins to view and track feedback status from the admin panel
- Optionally store feedback references locally for fast querying

---

## Architecture

```
User clicks feedback button
        │
        ▼
  Feedback Modal (category, description, screenshot)
        │
        ▼
  feedbackService.ts → supabase.functions.invoke('submit-feedback')
        │
        ▼
  Edge Function (submit-feedback)
        ├──▶ Zendesk Tickets API (create ticket)
        └──▶ product_feedback table (store reference)
        │
        ▼
  Admin Panel → FeedbackPage (query local table, link to Zendesk)
```

---

## Implementation Plan

### 1. Environment & Configuration

| Variable | Location | Description |
|----------|----------|-------------|
| `ZENDESK_SUBDOMAIN` | Edge function env | Zendesk subdomain (e.g. `qwohter`) |
| `ZENDESK_API_TOKEN` | Edge function env | Zendesk API token for authentication |
| `ZENDESK_EMAIL` | Edge function env | Zendesk agent email for API auth |

Update [ENVIRONMENT.md](../reference/ENVIRONMENT.md) and [LOCAL_DEV.md](../guides/LOCAL_DEV.md) when implemented.

### 2. Database Migration

New table: `product_feedback`

```sql
create table public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('bug', 'feature_request', 'improvement', 'other')),
  description text not null,
  screenshot_url text,
  zendesk_ticket_id text,
  zendesk_ticket_url text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.product_feedback enable row level security;

-- Users can insert their own feedback
create policy "Users can submit feedback"
  on public.product_feedback for insert
  with check (auth.uid() = user_id);

-- Users can view their own feedback
create policy "Users can view own feedback"
  on public.product_feedback for select
  using (auth.uid() = user_id);

-- Super admins can view all feedback (handled via admin panel password gate)
```

### 3. Edge Function — `submit-feedback`

**Path:** `supabase/functions/submit-feedback/index.ts`

**Follows the pattern of:** `supabase/functions/contact-us/index.ts`

**Responsibilities:**
- Validate input (category, description)
- Authenticate user via Supabase JWT
- Create Zendesk ticket via API
- Insert row into `product_feedback` table with Zendesk ticket reference
- Return success/error response

**Zendesk API call:**
```typescript
// POST https://{subdomain}.zendesk.com/api/v2/tickets.json
// Auth: Basic {email}/token:{api_token}
{
  "ticket": {
    "subject": "[Feedback] {category} — {user_email}",
    "description": description,
    "priority": "normal",
    "tags": ["product-feedback", category],
    "requester": {
      "name": user_name,
      "email": user_email
    }
  }
}
```

### 4. Frontend Service & Hook

**New files:**

| File | Purpose |
|------|---------|
| `src/services/feedbackService.ts` | `submitFeedback()` — invokes edge function |
| `src/hooks/useFeedback.ts` | `useSubmitFeedback()` mutation + `useFeedbackList()` query (admin) |

**Service pattern** (matches existing services):
```typescript
export async function submitFeedback(data: FeedbackInput): Promise<ServiceResult> {
  const { data: result, error } = await supabase.functions.invoke('submit-feedback', {
    body: data,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: result };
}
```

### 5. Feedback Button & Modal (User-Facing)

**Placement:** Sidebar footer in `src/components/common/layout/AppSidebar.tsx`
- Small icon button (MessageSquarePlus or similar from Lucide) next to the logout area
- Visible to all authenticated users regardless of role

**Modal component:** `src/components/features/feedback/FeedbackModal.tsx`

| Field | Type | Required |
|-------|------|----------|
| Category | Select dropdown (`bug`, `feature_request`, `improvement`, `other`) | Yes |
| Description | Textarea (min 10 chars) | Yes |
| Screenshot | File upload (optional, stored in Supabase Storage) | No |

**UX flow:**
1. User clicks feedback icon in sidebar
2. Modal opens with form
3. User fills out and submits
4. Loading state on button, toast on success/error
5. Modal closes on success

### 6. Admin Panel — Feedback Page

**New/modified files:**

| File | Change |
|------|--------|
| `src/features/admin/components/AdminSidebar.tsx` | Add "Feedback" link under new "Support" section |
| `src/features/admin/pages/FeedbackPage.tsx` | New page — table of all feedback |
| `src/features/admin/pages/index.ts` | Export new page |
| `src/router/AppRouter.tsx` | Add `/admin/feedback` route |

**FeedbackPage features:**
- Table with columns: Date, User, Org, Category, Status, Zendesk Link
- Filter by category and status
- Sort by date (newest first)
- Click row to expand description
- External link icon to open ticket in Zendesk
- Status badge (color-coded: open, in_progress, resolved, closed)

---

## File Inventory

| # | File | Action |
|---|------|--------|
| 1 | `supabase/functions/submit-feedback/index.ts` | Create |
| 2 | `src/services/feedbackService.ts` | Create |
| 3 | `src/hooks/useFeedback.ts` | Create |
| 4 | `src/components/features/feedback/FeedbackModal.tsx` | Create |
| 5 | `src/features/admin/pages/FeedbackPage.tsx` | Create |
| 6 | `src/features/admin/pages/index.ts` | Modify (add export) |
| 7 | `src/features/admin/components/AdminSidebar.tsx` | Modify (add link) |
| 8 | `src/components/common/layout/AppSidebar.tsx` | Modify (add button) |
| 9 | `src/router/AppRouter.tsx` | Modify (add route) |
| 10 | `supabase/migrations/XXXXXX_product_feedback.sql` | Create |
| 11 | `docs/reference/ENVIRONMENT.md` | Modify (add Zendesk vars) |
| 12 | `docs/guides/LOCAL_DEV.md` | Modify (add Zendesk vars) |
| 13 | `docs/guides/EDGE_FUNCTIONS.md` | Modify (add submit-feedback) |

---

## Simpler Alternative — Zendesk Web Widget

If a full integration is not needed yet, Zendesk offers an embeddable web widget that requires zero backend work:

```html
<!-- Add to index.html -->
<script id="ze-snippet"
  src="https://static.zdassets.com/ekr/snippet.js?key=YOUR_KEY">
</script>
```

This gives a floating feedback/support button out of the box. The tradeoff is no visibility in the admin panel — all management happens in Zendesk directly.

---

## Dependencies

- Zendesk account with API access enabled
- Zendesk API token (generated in Zendesk Admin > Apps & Integrations > APIs)
- Supabase Storage bucket (if screenshot uploads are included)

---

## Open Questions

- [ ] Should feedback be per-user or per-organization?
- [ ] Should there be a feedback limit (e.g. max 5 open tickets per user)?
- [ ] Include sentiment/rating (1-5 stars) alongside category?
- [ ] Send confirmation email to user via Resend when feedback is submitted?
- [ ] Should non-admin users be able to view their past feedback submissions?
