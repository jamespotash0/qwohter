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

`AppSidebar` renders a single flat group: Dashboard, Proposals, Board (Task /
Project sub-items), Calendar, Contacts, Forms, Analytics. Items are filtered by
the user's role.

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
