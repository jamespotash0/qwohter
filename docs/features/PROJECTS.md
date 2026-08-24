# Projects & Board System

> **Location:** `src/services/boardService.ts`, `src/services/projectTasksService.ts`, `src/components/features/board/`

## System Overview

The codebase has **two distinct but related systems**:

1. **Project Board** - Kanban-style workflow for managing "Won" proposals
2. **Task Board** - Granular task management with custom columns

```
Proposal (status: Won, is_main_version: true)
        ↓ "Send to Board"
    Project (board item)
        ├── workflow_status (kanban column)
        ├── priority (Highest/High/Medium/Low/Lowest)
        ├── project_tasks[] (linked tasks)
        └── project_attachments[] (files)
```

## Data Models

### Project (Board Item)

```typescript
interface Project {
  id: string;
  organization_id: string;
  proposal_id: string;               // Link to source proposal
  workflow_status: string;           // Current kanban column
  priority: ProjectPriority;         // Highest | High | Medium | Low | Lowest
  completion_date?: string;
  board_order: number;               // Position within column
  created_at: string;
  updated_at: string;
}

type ProjectPriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
```

### Project Task

```typescript
interface ProjectTask {
  id: string;
  project_id: string | null;         // Optional - can be standalone
  proposal_id: string | null;        // Optional link to proposal
  organization_id: string;
  title: string;
  description: string | null;
  status: string;                    // Dynamic from task_board_columns
  priority: TaskPriority;            // Low | Medium | High
  due_date: string | null;
  reference: string;                 // Auto-generated (e.g., "CW-1", "TES-2")
  position: number;                  // For drag/drop ordering
  created_by: string;
  assigned_to: string | null;        // User ID
  created_at: string;
  updated_at: string;
}

type TaskPriority = 'Low' | 'Medium' | 'High';
```

### Task Board Column

```typescript
interface TaskBoardColumn {
  id: string;
  organization_id: string;
  name: string;
  slug: string;                      // Unique within org
  color: string;                     // Hex value
  position: number;                  // Order in board
  is_default: boolean;               // Default columns can't be deleted
}
```

Default columns: `To-Do` → `In Progress` → `Done`

### Workflow Column (Project Board)

```typescript
interface WorkflowColumn {
  id: string;
  organization_id: string;
  name: string;
  position: number;
  color?: string;
}
```

Default columns: `New` → `In Progress` → `Review` → `Complete`

### Task Comments & Activity

```typescript
interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];                // Array of user IDs
  parent_id: string | null;          // For threaded replies
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  file_type: string;
  attachment_type: 'image' | 'document' | 'video' | 'other';
  uploaded_by: string;
  created_at: string;
}

interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  activity_type: ActivityType;
  metadata: Record<string, any>;     // Flexible change tracking
  created_at: string;
}

type ActivityType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'priority_changed'
  | 'due_date_changed'
  | 'title_changed'
  | 'description_changed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed';
```

## Services

### Board Service

**Location:** `src/services/boardService.ts`

Manages projects (board items) and workflow columns:

| Function | Purpose |
|----------|---------|
| `fetchBoardItems(orgId)` | Get projects (filters to Won proposals) |
| `createBoardItem(data)` | Create project from proposal |
| `updateBoardItem(id, data)` | Update project |
| `deleteBoardItem(id)` | Remove from board |
| `moveBoardItem(id, columnId, position)` | Move between columns |
| `fetchWorkflowColumns(orgId)` | Get workflow columns |
| `createWorkflowColumn(data)` | Add column |
| `updateWorkflowColumn(id, data)` | Rename/recolor |
| `deleteWorkflowColumn(id)` | Remove column |
| `reorderWorkflowColumns(columns)` | Reorder all |

### Project Tasks Service

**Location:** `src/services/projectTasksService.ts`

| Function | Purpose |
|----------|---------|
| `fetchProjectTasks(projectId)` | Tasks for specific project |
| `fetchOrganizationTasks(orgId)` | All org tasks (includes project info) |
| `createProjectTask(data)` | Create with auto-generated reference |
| `updateProjectTask(id, data)` | Update (tracks changes for activity) |
| `deleteProjectTask(id)` | Delete task |
| `reorderTask(id, newStatus, newPosition)` | Drag/drop with position shifting |
| `assignTask(id, userId)` | Assign to user |
| `updateTaskStatus(id, status)` | Change column |
| `updateTaskPriority(id, priority)` | Change priority |

### Reference Generation

```typescript
// Auto-generated task reference format: {OrgInitials}-{Number}
// Examples: "CW-1", "TES-2", "WAL-5"

const reference = generateTaskReference(organizationName, existingCount);
// "Custom Walls" + 0 → "CW-1"
// "Test Org" + 4 → "TES-5"
```

### Task Board Columns Service

**Location:** `src/services/taskBoardColumnsService.ts`

| Function | Purpose |
|----------|---------|
| `fetchTaskBoardColumns(orgId)` | Get all columns |
| `createTaskBoardColumn(data)` | Create column |
| `updateTaskBoardColumn(id, data)` | Update name/color |
| `deleteTaskBoardColumn(id)` | Delete (if not default) |
| `reorderTaskBoardColumns(columns)` | Reorder all |

### Task Comments Service

**Location:** `src/services/taskCommentsService.ts`

| Function | Purpose |
|----------|---------|
| `fetchTaskComments(taskId)` | Get comments with threading |
| `createTaskComment(data)` | Create (logs activity) |
| `updateTaskComment(id, content)` | Edit (sets is_edited) |
| `deleteTaskComment(id)` | Delete |
| `fetchTaskAttachments(taskId)` | Get attachments |
| `uploadTaskAttachment(data)` | Upload file |
| `deleteTaskAttachment(id)` | Delete file |
| `fetchTaskActivity(taskId)` | Get activity log |
| `logTaskActivity(data)` | Manual activity logging |

## React Query Hooks

### Board Hooks

**Location:** `src/hooks/queries/useBoard.ts`

| Hook | Purpose |
|------|---------|
| `useProjects(orgId)` | Fetch board items with realtime |
| `useWorkflowColumns(orgId)` | Fetch workflow columns |
| `useCreateProject()` | Create with optimistic updates |
| `useUpdateProject()` | Update with optimistic updates |
| `useDeleteProject()` | Delete with rollback on error |
| `useMoveBoardItem()` | Move between columns |
| `useCreateWorkflowColumn()` | Create with duplicate validation |
| `useUpdateWorkflowColumn()` | Rename with validation |
| `useDeleteWorkflowColumn()` | Delete column |

### Task Hooks

**Location:** `src/hooks/useProjectTasks.ts`

| Hook | Purpose |
|------|---------|
| `useProjectTasks(projectId)` | Fetch project-specific tasks |
| `useOrganizationTasks(orgId)` | Fetch all org tasks |
| `useCreateProjectTask()` | Create with auto-reference |
| `useUpdateProjectTask()` | Generic update |
| `useDeleteProjectTask()` | Delete |
| `useAssignTask()` | Assign to user |
| `useUpdateTaskStatus()` | Change column |
| `useUpdateTaskPriority()` | Change priority |
| `useReorderTask()` | Drag/drop with position shifting |

### Task Board Columns Hooks

**Location:** `src/hooks/useTaskBoardColumns.ts`

| Hook | Purpose |
|------|---------|
| `useTaskBoardColumns(orgId)` | Fetch columns |
| `useCreateTaskBoardColumn()` | Create with toast |
| `useUpdateTaskBoardColumn()` | Update |
| `useDeleteTaskBoardColumn()` | Delete |
| `useReorderTaskBoardColumns()` | Reorder all |

### Task Collaboration Hooks

**Location:** `src/hooks/useTaskComments.ts`

| Hook | Purpose |
|------|---------|
| `useTaskComments(taskId)` | Fetch with threading |
| `useCreateTaskComment()` | Create with optimistic updates |
| `useUpdateTaskComment()` | Edit |
| `useDeleteTaskComment()` | Delete |
| `useTaskAttachments(taskId)` | Fetch attachments |
| `useUploadTaskAttachment()` | Upload file |
| `useDeleteTaskAttachment()` | Delete file |
| `useTaskActivity(taskId)` | Fetch activity log |

## UI Components

### Main Board Components

**Location:** `src/components/features/board/`

| Component | Purpose |
|-----------|---------|
| `ProjectTasks.tsx` | Display/manage tasks for a project |
| `ProjectBoardOverlay.tsx` | Sidebar panel for project details |
| `TimelineVisualizer.tsx` | Visual timeline/milestone view |
| `ProjectAttachments.tsx` | File management |
| `ProjectDeleteDialog.tsx` | Confirmation dialog |

### Task Detail Components

**Location:** `src/components/features/board/task-detail/`

| Component | Purpose |
|-----------|---------|
| `TaskDetailOverlay.tsx` | Full task editor with comments, attachments |
| `TaskCommentItem.tsx` | Single comment with threading |
| `MentionInput.tsx` | Comment input with @mentions |
| `TaskAttachments.tsx` | File attachments UI |
| `ReminderPicker.tsx` | Set task reminders |
| `TaskDeleteDialog.tsx` | Delete confirmation |

## Data Flow

```
User Action (UI)
    ↓
React Query Hook (useProjectTasks, useTaskComments, etc.)
    ↓
Service Function (projectTasksService, taskCommentsService)
    ↓
Supabase API Call
    ↓
RLS Policies (verify org membership)
    ↓
Database Operation
    ↓
Realtime Update → Hook invalidates cache
    ↓
Component Re-render with new data
```

## Realtime Subscriptions

```typescript
// Projects subscription
useRealtimeSubscription('projects', ['projects', orgId], {
  filter: `organization_id=eq.${orgId}`
});

// Tasks subscription
useRealtimeSubscription('project_tasks', ['project_tasks', projectId], {
  filter: `project_id=eq.${projectId}`
});

// Organization-wide tasks
useRealtimeSubscription('project_tasks', ['project_tasks', 'org', orgId], {
  filter: `organization_id=eq.${orgId}`
});
```

## Drag & Drop Reordering

### Task Reorder Logic

```typescript
// When task moves to new position in same or different column:
reorderTask(taskId, newStatus, newPosition)

// 1. If moving to different column:
//    - Update task status to new column
//    - Shift tasks in old column down
//    - Shift tasks in new column at/after position up

// 2. If moving within same column:
//    - Shift tasks between old and new positions
//    - Update task position

// All position updates are atomic (single transaction)
```

### Column Reorder Logic

```typescript
// Reorder all columns at once
reorderWorkflowColumns([
  { id: 'col1', position: 0 },
  { id: 'col2', position: 1 },
  { id: 'col3', position: 2 },
])
```

## Activity Logging

All task changes are automatically logged:

```typescript
// Activity types logged:
'created'           // Task created
'status_changed'    // Moved to different column
'assigned'          // User assigned
'unassigned'        // User removed
'priority_changed'  // Priority updated
'due_date_changed'  // Due date changed
'title_changed'     // Title edited
'description_changed' // Description edited
'comment_added'     // New comment
'attachment_added'  // File uploaded
'attachment_removed' // File deleted
```

Metadata captures before/after values:

```typescript
{
  activity_type: 'status_changed',
  metadata: {
    from: 'To-Do',
    to: 'In Progress'
  }
}
```

## Threaded Comments

Comments support unlimited nesting via `parent_id`:

```typescript
// Top-level comment
{ id: 'c1', parent_id: null, content: 'Main comment' }

// Reply to c1
{ id: 'c2', parent_id: 'c1', content: 'Reply to main' }

// Reply to c2 (nested reply)
{ id: 'c3', parent_id: 'c2', content: 'Reply to reply' }
```

Fetch returns flat array; UI builds tree structure client-side.

## @Mentions

**Location:** `src/components/features/board/task-detail/MentionInput.tsx`

```typescript
// Mention format in content
"Hey @[John Doe](user_id_123), can you check this?"

// Stored in mentions array
mentions: ['user_id_123', 'user_id_456']

// On save: Triggers notification to mentioned users
```

## File Attachments

### Project Attachments

- Max file size: 50MB
- Storage path: `projects/{project_id}/{filename}`
- Signed URLs for secure access
- Supported: images, PDFs, documents

### Task Attachments

- Max file size: 25MB
- Storage path: `tasks/{task_id}/{filename}`
- Automatic attachment_type detection (image, document, video, other)

## Key Files

### Types
- `src/lib/types/projectTasks.ts` - Task types
- `src/lib/types/taskBoardColumns.ts` - Column types
- `src/lib/types/projectAttachments.ts` - Attachment types
- `src/lib/types/taskComments.ts` - Comment/activity types

### Services
- `src/services/boardService.ts` - Board CRUD
- `src/services/projectTasksService.ts` - Task CRUD + reorder
- `src/services/taskBoardColumnsService.ts` - Column management
- `src/services/taskCommentsService.ts` - Comments + activity
- `src/services/projectAttachmentsService.ts` - File uploads

### Hooks
- `src/hooks/queries/useBoard.ts` - Board-level hooks
- `src/hooks/useProjectTasks.ts` - Task hooks
- `src/hooks/useTaskBoardColumns.ts` - Column hooks
- `src/hooks/useTaskComments.ts` - Comment/activity hooks

### Components
- `src/components/features/board/` - Board UI
- `src/components/features/board/task-detail/` - Task detail UI

## Database Schema

```sql
-- projects table
id                uuid PRIMARY KEY
organization_id   uuid REFERENCES organizations(id)
proposal_id       uuid REFERENCES proposals(id)
workflow_status   text NOT NULL
priority          text DEFAULT 'Medium'
completion_date   timestamptz
board_order       integer DEFAULT 0
created_at        timestamptz
updated_at        timestamptz

-- project_tasks table
id                uuid PRIMARY KEY
project_id        uuid REFERENCES projects(id) ON DELETE CASCADE
proposal_id       uuid REFERENCES proposals(id)
organization_id   uuid REFERENCES organizations(id)
title             text NOT NULL
description       text
status            text NOT NULL
priority          text DEFAULT 'Medium'
due_date          timestamptz
reference         text NOT NULL  -- Unique per org
position          integer DEFAULT 0
created_by        uuid REFERENCES profiles(id)
assigned_to       uuid REFERENCES profiles(id)
created_at        timestamptz
updated_at        timestamptz

-- task_board_columns table
id                uuid PRIMARY KEY
organization_id   uuid REFERENCES organizations(id)
name              text NOT NULL
slug              text NOT NULL  -- Unique per org
color             text NOT NULL
position          integer DEFAULT 0
is_default        boolean DEFAULT false
created_at        timestamptz

-- task_comments table
id                uuid PRIMARY KEY
task_id           uuid REFERENCES project_tasks(id) ON DELETE CASCADE
user_id           uuid REFERENCES profiles(id)
content           text NOT NULL
mentions          text[]
parent_id         uuid REFERENCES task_comments(id)
is_edited         boolean DEFAULT false
created_at        timestamptz
updated_at        timestamptz

-- task_attachments table
id                uuid PRIMARY KEY
task_id           uuid REFERENCES project_tasks(id) ON DELETE CASCADE
file_name         text NOT NULL
file_path         text NOT NULL
file_url          text
file_size         bigint
file_type         text
attachment_type   text
uploaded_by       uuid REFERENCES profiles(id)
created_at        timestamptz

-- task_activities table
id                uuid PRIMARY KEY
task_id           uuid REFERENCES project_tasks(id) ON DELETE CASCADE
user_id           uuid REFERENCES profiles(id)
activity_type     text NOT NULL
metadata          jsonb
created_at        timestamptz

-- Unique constraints
UNIQUE (organization_id, reference) ON project_tasks
UNIQUE (organization_id, slug) ON task_board_columns
```

---

## The project as the hub

Once a quote is won the project stops being a card on a board. Everything a
dealer does afterwards already carries its id — sales orders, manufacturer
orders, receipts, work orders, tasks, attachments, payment jobs — and
`/projects/:projectId` is where that graph is read back as one thing.

The board overlay stays for quick edits and links through to it.

### Two statuses, on purpose

| | What it is |
|---|---|
| `projects.workflow_status` | The Kanban column somebody dragged the card into. An **intention** |
| `project_progress.stage` | Derived from what has actually happened. A **fact** |

They disagree constantly, and the disagreement is the useful part: a job sitting
in "Installing" with nothing received is a job somebody has stopped looking at.
`workflow_status` is the name of an org-configurable column
(`project_workflow_columns`), so it cannot carry a fixed lifecycle — which is
exactly why the derived stage sits beside it rather than replacing it.

Stages run Quoted → Released → Ordering → Awaiting delivery → Receiving →
Installing → Ready to bill, and are chosen by what has happened **latest**, not
by what is still incomplete. A job with product arriving and a crew on site
reads `Installing`, because that is what a PM needs to know.

### Activity is derived, not logged

`project_activity` UNIONs `project_notes` with events read from the tables that
already hold those facts — sales orders, manufacturer orders, acknowledgments,
receipts, change orders, work orders.

A written activity log would be a second copy of those facts, and the copy is
what goes stale, drifts, or silently stops being written when a code path
changes. Deriving costs a little on read and cannot lie.

It pays off immediately: an acknowledgment appears in the feed as *"Costs
15,336.00 more than quoted"* without anything having to remember to write it
there.

**Pinned notes lead regardless of age.** Dock hours, elevator bookings, and
COI requirements stay true for months; burying them under a week of status
updates is how an install day gets lost.

### Change orders

The customer wants something different after signing. The reason it belongs in
the system is the gap between *requested* and *priced* — that is where a dealer
does work nobody has agreed to pay for, so the panel warns on unpriced ones and
`sell_delta` stays `NULL` rather than showing a confident zero.

An approved change order becomes **its own sales order** rather than editing the
original, which is what `sales_orders` was built for. Rewriting the signed order
in place would destroy the record of what the customer actually agreed to.

`Approved` and `Rejected` require a `responded_at`, enforced by a CHECK.

### Margin, twice

The header shows quoted margin and margin after acknowledgments. The second is
the honest one — it is quoted margin less the acknowledged cost variance rolled
up across every order on the job, and it is usually smaller.

### Key files

| Thing | Where |
|-------|-------|
| Page | `src/pages/ProjectDetail.tsx` |
| Activity feed | `src/components/features/projects/ProjectActivityFeed.tsx` |
| Change orders | `src/components/features/projects/ChangeOrdersPanel.tsx` |
| Service / hooks | `src/services/projectHubService.ts`, `src/hooks/queries/useProjectHub.ts` |
| Migration | `supabase/migrations/20260824110000_project_hub.sql` |
