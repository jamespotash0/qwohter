# Coordinator Agent Plan

> **Status:** Not implemented. Design only.

## Overview

A companion product — the **Coordinator** — that lives in an inbox rather than a UI. A person CCs it on ordinary email with installers, vendors, tenants and reps. It reads the thread, works out which job it belongs to, pulls context from Qwohter to understand what is being discussed, and writes back what it learns.

Two properties define it:

- **Counterparties never see a UI.** They get an email from a person, and reply to it. Zero adoption cost, which is why this can work at all — installers will not log into a portal.
- **The owner gets a board he never updates.** Rows are written from conversations. He reads it, corrects it in plain language, and asks it questions. It is a read-mostly view of the agent's memory.

### The split

| | Coordinator | Qwohter |
|---|---|---|
| Owns | Inbox, threads, messages, extraction, drafting | System of record |
| Stores | Conversations | Extracted facts + a pointer back |
| Is | The interface | The truth |

Conversations never enter Qwohter. A fact written from a thread carries `source_ref`, and following it resolves back into the Coordinator where the evidence lives. This keeps Qwohter's schema small and puts each thing where it belongs.

### What makes this tractable

Qwohter already derives job state from an event log rather than from UI clicks, so an agent appending events produces the same board as a person clicking dialogs. Nothing downstream changes. The work is in the mail side and the seam, not in the back office.

---

## Part 1 — The mail side

### 1.1 Ingest

A dedicated address per organization, e.g. `acme@coordinator.qwohter.com`, that people CC.

**Open decision:** the stack uses Resend, which is outbound-only. Inbound parsing needs a provider that supports it (Postmark, Mailgun, SendGrid). SMS via Twilio is a later phase.

Stores `threads`, `messages`, `participants`, `attachments`.

### 1.2 Resolve — the core problem

A CC'd thread arrives with nothing attached to it. Deciding which job it belongs to is the hardest part of the product and everything else depends on it.

Signals, strongest first:

| Signal | Precision |
|---|---|
| `order_number`, vendor `po_number`, `proposal_number` in subject or body | Near-certain |
| Participant email → contact → company → that company's open jobs | Narrows to a few |
| Ship-to address or job name in the subject | Fuzzy |
| Thread continuity — once resolved, it stays resolved | Free thereafter |

Qwohter allocates all three number formats and they appear in real email naturally, so exact-token matching carries most of the load.

Returns **candidates with confidence**, never a single guess. Below threshold the thread goes to an unresolved queue rather than being attached to the wrong job.

### 1.3 Extract

What did this message assert? Typed intents:

- ship date moved
- delivered / arrived
- damage reported
- scheduling — crew, date, access
- cost or price change
- a question that needs answering
- **nothing** — the common case

### 1.4 Act, tiered by consequence

Not everything needs confirmation. Tiering is what keeps this safe without making it useless:

| Tier | Action | Why |
|---|---|---|
| **Silence** | Nothing written | Most threads. The default. |
| **Note** | Write directly to `project_notes` | A feed entry. Does not move stage or money, trivially reversible. |
| **Proposal** | Anything writing `order_line_events` | Moves derived stage and margin. Must be confirmed. |
| **Draft** | Compose a reply for a person to send | Never sends unattended. |

### 1.5 Observe

An agent-side log of *"read this, nothing to do"*, so the owner can ask "did you see the email from Steelcase?" and get an answer.

**This never reaches Qwohter.** Writing non-events into the activity feed is the fastest way to make a read-mostly board not worth reading.

---

## Part 2 — The connection

A connector configured inside Qwohter, alongside Google Docs, QuickBooks Online and QuickBooks Desktop.

### 2.1 Pattern to follow

**QuickBooks Desktop, not Google.** Google runs OAuth because Google is a third party. The Coordinator is first-party — `qb-desktop-setup` already mints credentials for an external program to call back with, bcrypt-hashes them, and returns the connection without the hash. Same situation.

### 2.2 Setup flow

1. Owner opens Settings → Integrations, sees the Coordinator card
2. Clicks Connect
3. `agent-setup` mints a token, hashes it, writes the `integrations` row
4. Owner is shown the inbox address to start CCing

### 2.3 Auth

Every edge function is `verify_jwt = false`, so **each function authenticates its own caller**. A per-org bearer token, hashed at rest in `integrations.settings`, checked at the top of every endpoint. Not service-role passthrough.

### 2.4 Change feed

When the owner corrects the board in the UI, the Coordinator needs to know — so it stops re-proposing, and can tell the counterparty. Supabase Realtime already broadcasts these tables and the app already subscribes; the Coordinator subscribes to the same channels. No webhook infrastructure.

---

## Part 3 — What Qwohter needs

### 3.1 Provenance (new)

The board must show where a row came from, or the owner cannot tell fact from inference.

```sql
source        text    -- 'ui' | 'agent' | 'import'
source_ref    text    -- thread id in the Coordinator
confidence    numeric -- agent-written rows only
confirmed_by  uuid    -- set when a person accepts or corrects it
confirmed_at  timestamptz
```

Applies to `project_notes` first, then anything the agent can write.

`project_notes.created_by` references `auth.users`, and an agent has no such row — so provenance is required, not optional.

### 3.2 Proposals table (new)

`agent_proposals` — consequential changes awaiting confirmation, holding the intended mutation, its provenance, and its state.

### 3.3 Edge functions (new)

| Function | Purpose |
|---|---|
| `agent-setup` | Connect, mint and hash the token |
| `agent-resolve` | Thread tokens + participants → job candidates with confidence |
| `agent-context` | One job briefing (see below) |
| `agent-propose` | Tiered write: note direct, consequential as proposal |

### 3.4 The job briefing

The highest-value endpoint, and mostly assembly of views that already exist:

- `project_progress` — derived stage, quantities ordered/received/installed, sell and cost, lines awaiting acknowledgment, damaged count, open change orders
- `project_activity` — notes unioned with derived events, so history needs no separate log
- Orders and lines, vendor POs with acknowledged ship dates, open shipments with ETAs, scheduled work orders

This is what lets the agent answer *"where is this job"* without anyone having updated anything.

### 3.5 Reused as-is

- `integrations` / `available_integrations` — including `get_integrations_for_plan` for tier gating
- `lib/ack/match.ts` — the matching approach transfers directly to thread resolution
- Supabase Realtime
- Existing services as the mutation surface

### 3.6 UI

- Connector card and connect dialog
- Provenance markers on agent-written rows — who said it, which channel, when, how sure
- Confirm / correct affordance on proposals

---

## Phases

| Phase | Deliverable | Risk |
|---|---|---|
| **1** | Connector card, `agent-setup`, token auth | None — nothing behind it yet |
| **2** | `agent-resolve` + `agent-context`, read-only | None — cannot write |
| **3** | Notes with provenance, visible on the board | Low — reversible |
| **4** | Proposals for consequential changes | Real — gate on phase 2 accuracy |
| **5** | Outbound drafting | Reputational, never unattended |

Phase 2 is the proving ground: run resolution against real email and measure how often it picks the right job before anything is allowed to write.

---

## Open decisions

- **Inbound email provider** — Resend is outbound-only in this stack
- **Confidence thresholds** for auto-apply vs propose vs unresolved queue
- **One address per organization, or per job** — per-job trades setup cost for free resolution
- **Dependency:** `project_notes`, `project_activity` and `project_progress` live on `feature/dealer-order-spine` and are not in production yet
