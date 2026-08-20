# App Shell (Sidebar, Top Bar, Content)

> **Location:** `src/components/common/layout/`

The authenticated app is framed by `MainLayout`, which composes three pieces:

```
┌──────────┬────────────────────────────────────┐
│          │  AppTopBar        [🔔] [avatar ▾]  │
│ AppSide  ├────────────────────────────────────┤
│   bar    │ ╭─ content panel (rounded top-left)│
│          │ │  <page>                          │
└──────────┴─┴──────────────────────────────────┘
```

| Component | File | Responsibility |
|-----------|------|----------------|
| `MainLayout` | `MainLayout.tsx` | Auth/membership gating, version polling, paywall, frame |
| `AppSidebar` | `AppSidebar.tsx` | Primary navigation |
| `AppTopBar` | `AppTopBar.tsx` | Notification bell + profile menu |
| `SidebarModeToggle` | `SidebarModeToggle.tsx` | Cycles the sidebar display mode |

The content panel is rounded on the **top-left corner only** so it meets the
sidebar with a soft edge and runs flush against the window elsewhere.

## Sidebar display modes

The sidebar has three persisted modes, cycled by `SidebarModeToggle` in the
sidebar header. State lives in `SidebarProvider`
(`src/components/ui/sidebar/SidebarProvider.tsx`).

| Mode | Behaviour | Icon |
|------|-----------|------|
| `expanded` | Pinned open | `PushPinSimple` (filled) |
| `hover` | Collapsed, expands while the pointer is over it | `SidebarSimple` |
| `collapsed` | Pinned collapsed | `ArrowLineLeft` |

- Persisted in the `sidebar:mode` cookie (7 days). The legacy `sidebar:state`
  boolean cookie is still written for back-compat and is read as a fallback on
  first load.
- `open` is derived: `mode === 'expanded' || (mode === 'hover' && isHovered)`.
  `AppSidebar` feeds `isHovered` from its own mouse enter/leave handlers.
- `setOpen`/`toggleSidebar` (including <kbd>Cmd/Ctrl</kbd>+<kbd>B</kbd>) still
  work — they resolve to `expanded` or `collapsed`.

## Navigation

`AppSidebar` renders one flat list — no groups, no accordions: Dashboard,
Proposals, Projects, Tasks, Calendar, Contacts, Forms, Analytics. Items are
filtered by the user's role. Projects (`/project-board`) and Tasks
(`/task-board`) are top-level entries rather than sub-items of a "Board" parent.

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
- The layout spacer was `calc(var(--sidebar-width) - 1rem)` when expanded but
  exactly `--sidebar-width-icon` when collapsed, so the content edge and the
  sidebar edge slid at different offsets. Both now use the full width.

Panel width, labels and header share one easing curve
(`cubic-bezier(0.32, 0.72, 0, 1)`, 300ms) so the whole thing reads as a single
motion. The header is fixed-height with fixed padding and the logo sits in a
40px slot that never unmounts — it previously remounted into a different
subtree on each toggle, which made it appear to drop.

**Settings is not a sidebar item** — it is reached from the profile menu, and
has its own inner sidebar (see [SETTINGS.md](../features/SETTINGS.md)).

## Top bar

- **Notification bell** — unread count badge, dropdown of recent notifications,
  "View all" → `/notifications`. See [NOTIFICATIONS.md](../features/NOTIFICATIONS.md).
- **Profile menu** — avatar (no caret). The header row shows the display name
  with a role/department tag beside it and the email below. Owners and Admins
  also see trial or grace-period status here, sourced from
  `useTrialStatus` (`src/hooks/useTrialStatus.ts`). Menu items: Profile,
  Settings, Sign out.

## Single-tenant

Organization switching has been removed from the shell — there is no org
switcher or org label in the sidebar or top bar. `switchOrganization` still
exists in `src/services/organizationService.ts` if multi-tenant UI returns.
