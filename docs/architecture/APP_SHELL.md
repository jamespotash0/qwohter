# App Shell (Sidebar, Top Bar, Content)

> **Location:** `src/components/common/layout/`

The authenticated app is framed by `MainLayout`, which composes three pieces:

```
┌────────────────────────────────────────────────┐
│ [logo]  [⇤] │           AppTopBar  [🔔][avatar] │
├─────────────┼──────────────────────────────────┤
│  AppSidebar │ ╭─ content panel (rounded top-left)
│   (nav)     │ │  <page>                        │
└─────────────┴─┴────────────────────────────────┘
```

The top bar spans the **full width**, above both the sidebar and the content.
Its left cluster tracks the sidebar's width on the same easing, so the logo and
mode toggle sit over the sidebar column without being part of the sidebar.

| Component | File | Responsibility |
|-----------|------|----------------|
| `MainLayout` | `MainLayout.tsx` | Auth/membership gating, version polling, paywall, frame |
| `AppSidebar` | `AppSidebar.tsx` | Primary navigation |
| `AppTopBar` | `AppTopBar.tsx` | Logo + mode toggle (left), bell + profile menu (right) |
| `SidebarModeToggle` | `SidebarModeToggle.tsx` | Cycles the sidebar display mode |

The content panel is rounded on the **top-left corner only** so it meets the
sidebar with a soft edge and runs flush against the window elsewhere.

## Sidebar display modes

The sidebar has two persisted modes, toggled by `SidebarModeToggle` in the top
bar. State lives in `SidebarProvider`
(`src/components/ui/sidebar/SidebarProvider.tsx`).

| Mode | Behaviour | Icon |
|------|-----------|------|
| `expanded` | Stays open | `PushPinSimple` (filled) |
| `hover` | Collapsed, expands while the pointer is over it | `SidebarSimple` |

### Push vs float

The two modes lay out differently, which is the point:

| Mode | Layout | Content |
|------|--------|---------|
| `expanded` | Panel sits in normal flow | Shrinks to make room |
| `hover` | Layout reserves only the rail width; the panel floats above the content on `z-30` when it expands | Never moves |

So in hover mode nothing reflows as the pointer passes in and out — the content
keeps a fixed origin and width while the panel slides over it. Pinned open, the
sidebar behaves like a normal column and the content resizes around it.

Verified against the compiled CSS: in hover mode the content stays at x=64 /
w=1136 whether the panel is at 64px or 220px; pinned, it moves to x=220 / w=980.

**Only the sidebar itself opens the sidebar.** The top bar's left cluster is
width-tracked to the sidebar so the logo sits over that column, but it belongs
to the top bar — hovering it does nothing to the sidebar. Hovering the logo
swaps it for the mode toggle in place, which is how the toggle stays reachable
while the sidebar is collapsed, without the two surfaces driving each other.

`setIsHovered(false)` is deferred by 80ms (cancelled by any enter) because the
panel animates its own width: its edge moves under a stationary pointer, and
without the delay a cursor resting near the rail can flicker it open and shut.

- Persisted in the `sidebar:mode` cookie (7 days). The legacy `sidebar:state`
  boolean cookie is still written for back-compat and is read as a fallback on
  first load. A stored `"collapsed"` (a third mode that has since been removed)
  resolves to `"hover"`.
- `open` is derived: `mode === 'expanded' || (mode === 'hover' && isHovered)`.
  `AppSidebar` feeds `isHovered` from its own mouse enter/leave handlers.
- `setOpen`/`toggleSidebar` (including <kbd>Cmd/Ctrl</kbd>+<kbd>B</kbd>) still
  work — they resolve to `expanded` or `hover`.

## Navigation

`AppSidebar` renders four labelled groups. Items are filtered by the user's
role, and a group whose items are all filtered away is not rendered at all.

| Group | Items | Why together |
|-------|-------|--------------|
| *(none)* | Today, Dashboard | Where you start |
| Pipeline | Proposals, Jobs | The money moving through |
| Work | Tasks, Schedule, Calendar | Time and people |
| Reference | Contacts, Companies, Forms, Analytics | What you look things up in |

Jobs is `/project-board`; Tasks is `/task-board`. Both are top-level entries
rather than sub-items of a "Board" parent.

### What is deliberately absent

Two former entries — **Orders** and **Acknowledgments** — were stages of a job
rather than places. An order belongs to the job that sold it, and an
unanswered acknowledgment belongs in the cross-job queue with everything else
waiting on a person. Neither is unreachable:

| Old route | Now |
|-----------|-----|
| `/orders` | Redirects to `/project-board` |
| `/orders/:id` | Resolves to the job that owns the order (`OrderRedirect`) |
| `/acknowledgments` | Redirects to `/today?q=acks` |

Creating an order happens on the job page, where the proposal and project it
needs are already in hand. Importing a specification happens earlier still — on
the proposal's Pricing tab, because the file is what the job is quoted from.

### Group headings and the collapsed rail

A heading occupies a fixed 24px slot in both sidebar states so the rail's
vertical rhythm does not change when the panel opens. Expanded, the slot holds
the label; collapsed, it cross-fades to a short rule — the separator the label
was implying anyway.

### Keeping the slide smooth

The open/close animation is easy to break. Three rules hold it together:

1. **The nav icon never moves.** Every row uses the same `pl-[15px]` in both
   states, which puts the icon centre at 32px — the centre of the 64px collapsed
   rail. Only the label reveals.
2. **Labels stay mounted** and fade via opacity/transform. Conditionally
   rendering them makes the text pop instead of slide.
3. **No entrance animations on the rows.** Staggered `animate-in` with a
   per-index `animationDelay` replays on *every* toggle, which reads as jank.

Two upstream gotchas the sidebar overrides:

- `sidebarMenuButtonVariants` applies `!size-8 !p-2` when collapsed, snapping
  rows to a different shape mid-slide. `AppSidebar` overrides both.
- The desktop sidebar used to be a `fixed` panel paired with an invisible
  spacer, whose widths disagreed by 1rem when expanded. It is now a plain flex
  child in normal flow — one element, one width — which is also what lets a
  full-width top bar sit above it.

Panel width, labels and header share one easing curve
(`cubic-bezier(0.32, 0.72, 0, 1)`, 180ms) so the whole thing reads as a single
motion. The logo sits in a fixed 40px slot in the top bar — it previously lived
in the sidebar header and remounted into a different subtree on each toggle,
which made it appear to drop.

**Settings is not a sidebar item** — it is reached from the profile menu, and
has its own inner sidebar (see [SETTINGS.md](../features/SETTINGS.md)).

## Top bar

- **Notification bell** — unread count badge, dropdown of recent notifications,
  "View all" → `/notifications`. See [NOTIFICATIONS.md](../features/NOTIFICATIONS.md).
- **Logo + mode toggle** — left cluster, width-tracked to the sidebar.
- **Profile menu** — avatar (no caret). The header row shows the display name
  with a role/department tag beside it and the email below. Owners and Admins
  also see trial or grace-period status here, sourced from
  `useTrialStatus` (`src/hooks/useTrialStatus.ts`). Menu items: Profile,
  Settings, Sign out.

## Single-tenant

Organization switching has been removed from the shell — there is no org
switcher or org label in the sidebar or top bar. `switchOrganization` still
exists in `src/services/organizationService.ts` if multi-tenant UI returns.
