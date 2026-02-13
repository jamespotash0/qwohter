# Proposals System

> **Location:** `src/services/proposalsService.ts`, `src/components/features/proposals/`

## Data Model

```typescript
interface Proposal {
  id: string;
  proposal_number: string;           // Auto-generated (e.g., "SR-1005.2")
  organization_id: string;
  form_id: string;                   // Form template used
  form_data: Record<string, any>;    // JSONB - all form fields

  status: 'Draft' | 'Submitted' | 'Won' | 'Rejected' | 'Pending Approval';

  // Direct columns for querying
  project_name?: string;
  client_name?: string;
  client_company?: string;
  job_location?: string;
  total_value?: number;

  // Completion tracking
  is_complete?: boolean;             // Auto-calculated
  completed_at?: string;             // First completion timestamp

  // Versioning
  parent_proposal_id?: string;       // Links to parent version
  is_main_version: boolean;          // True for the "current" version

  // Project board
  is_on_board: boolean;              // True if sent to project board

  // Timestamps
  submitted_at?: string;
  won_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;

  // Documents
  google_doc_id?: string;            // Generated document
  documents_count?: number;          // Attached files count
}
```

## Status Workflow

### Available Statuses

| Status | Description | Access |
|--------|-------------|--------|
| `Draft` | Work in progress, not sent to client | Edit allowed |
| `Pending Approval` | Awaiting admin/owner approval | View only |
| `Submitted` | Sent to client, awaiting response | View only |
| `Won` | Client accepted | View only, can send to board |
| `Rejected` | Client declined | View only, can reopen |

### Status Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Draft ──────────────────────────────────────► Submitted   │
│     │         (Admin/Owner direct)                  │       │
│     │                                               │       │
│     └──────────► Pending Approval ──────────────────┘       │
│                 (Member with approval required)  (Approved) │
│                                                             │
│   Submitted ──────────────► Won ◄────────────────┐         │
│       │                      │                   │         │
│       │                      ▼                   │         │
│       └─────────────────► Rejected ──────────────┘         │
│                           (Can reopen to Draft/Submitted)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Status Change Side Effects

| Transition | Side Effects |
|------------|--------------|
| Any → Won | Sets `won_at`, auto-promotes to main version, enables "Send to Board" |
| Won → Any | Removes from project board if `is_on_board`, clears `won_at` |
| Any → Rejected | Sets `rejected_at` |
| Any → Submitted | Sets `submitted_at` |
| Status change | Triggers email & in-app notifications (async, non-blocking) |

### Approval Workflow

When `require_proposal_approval` is enabled in organization settings:

```
1. Member clicks "Submit" on proposal
2. Status changes to "Pending Approval"
3. Notification sent to Admin/Owner users
4. Admin/Owner reviews proposal
5a. Approve → Status becomes "Submitted", notification to creator
5b. Reject → Status returns to "Draft", notification to creator
```

## Proposal Numbering

**Configuration:** `src/services/numberingConfigService.ts`

### Format

`{prefix}-{number}.{version}`

| Part | Source | Example |
|------|--------|---------|
| Prefix | Document type setting | "P", "Q", "SR", "BID" |
| Number | Auto-incrementing per org | 1001, 1002, 1003 |
| Version | Revision count (optional) | .2, .3 |

### Examples

- `P-1001` - First proposal
- `Q-2050.2` - Second version of proposal 2050
- `SR-1005` - Service request

### Number Generation

```typescript
// Auto-generated on proposal creation
const proposalNumber = await generateProposalNumber(organizationId, documentType);
// Returns: "P-1001"

// Version number on revision
const versionNumber = await generateProposalVersion(parentProposalNumber);
// P-1001 → P-1001.2
```

## Versioning System

### How It Works

- Each revision creates a new proposal record
- `parent_proposal_id` links to the original
- `is_main_version` marks which version shows in table
- Table collapses version groups by default

### Version Operations

| Operation | Behavior |
|-----------|----------|
| Create version | Copies parent data, generates new number (P-1001 → P-1001.2) |
| Set main version | Updates `is_main_version` flag, old main becomes non-main |
| Delete version | If main version deleted, auto-promotes most recent |
| Delete group | Deletes all versions in the group |

### Grouping Logic

**Location:** `src/utils/proposalVersionGrouping.ts`

```typescript
// Groups proposals by base number (without version suffix)
groupProposals(proposals) → Map<baseNumber, Proposal[]>

// Determines display:
// - Main version shown in table
// - "N more" button shows count of other versions
// - Click expands to show all versions
```

## EnhancedProposalsTable

**Location:** `src/components/features/proposals/table/EnhancedProposalsTable.tsx` (~1,286 lines)

### Features

| Feature | Description |
|---------|-------------|
| **Multi-column table** | Proposal #, Project, Client, Total, Status, Created, Actions |
| **Column resizing** | Drag column borders to adjust width |
| **Data density** | Compact / Comfortable / Spacious toggle |
| **Pagination** | 10 / 20 / 30 / 50 / 100 rows per page |
| **Advanced search** | Fuse.js powered with suggestions |
| **Bulk operations** | Select multiple, bulk delete, bulk status change |
| **Export** | CSV and PDF export with formatting |
| **Version groups** | Collapsed by default, expandable |
| **Column visibility** | Toggle which columns show |

### Search

- Fuse.js fuzzy search across all fields
- Search suggestions dropdown
- Searches: proposal_number, project_name, client_name, client_company, job_location

### Row Actions

| Action | Condition |
|--------|-----------|
| Edit | Draft status only |
| View | Any status |
| Create version | Any status |
| Set main version | Non-main versions |
| Delete | Any (confirmation required) |
| Archive | Any |
| Send to board | Won status + is_main_version |
| Remove from board | is_on_board = true |

### Status Dropdown

In-table status selector with:
- Confirmation dialogs for risky transitions
- "Pending Approval" shows approve button for Admin/Owner
- Visual status badges with colors

### Persistence

Saved to localStorage:
- Column visibility preferences
- Page size preference
- Expanded/collapsed version groups

## Proposal Completion

**Location:** `src/utils/proposalCompletion.ts`

### Requirements

| Section | Required Fields |
|---------|-----------------|
| Info | All fields except jobNotes (need jobLocation OR jobLocationName) |
| Products | At least 1 item |
| Pricing | Subtotal > $0 |
| Lead Times | At least 1 phase |
| Presentation | google_doc_id set (document generated/linked) |
| Miscellaneous | Optional |
| Documents | Optional |

### Completion Functions

```typescript
// Simple boolean check
isProposalComplete(proposal) → boolean

// Detailed breakdown with percentages
calculateProposalCompletion(proposal) → {
  isComplete: boolean;
  percentage: number;
  sections: { info: boolean, pricing: boolean, ... };
  missing: string[];
}

// Human-readable missing items
getMissingForCompletion(proposal) → string[]
// ["Project name", "Client information", "At least one product"]
```

## E-Signature Flow

**Location:** `src/services/proposalSigningService.ts`

```
1. sendForSignature(proposalId, clientEmail)
   └─ Creates signing token in proposal_signing_tokens
   └─ Exports Google Doc as PDF
   └─ Uploads unsigned PDF to storage
   └─ Emails client with signing link (/sign/:token)

2. Client clicks link → viewSigningPage(token)
   └─ Token validated
   └─ Logs signature_viewed event

3. Client signs → submitSignature(token, signatureData)
   └─ Embeds signature in PDF
   └─ Uploads signed PDF
   └─ Updates proposal status to "Won"
   └─ Sends notification to creator

4. Token expires after 30 days
```

### Signing Token Table

```sql
proposal_signing_tokens
├── id (uuid, PK)
├── proposal_id (FK → proposals)
├── token (unique signing URL token)
├── client_email
├── expires_at (typically 30 days)
├── signed_at
├── signature_data (JSONB - signature image, metadata)
└── created_at
```

## React Query Hooks

**Location:** `src/hooks/queries/useProposals.ts`

### Query Hooks

| Hook | Purpose |
|------|---------|
| `useProposals(orgId)` | Fetch all proposals with realtime |
| `useProposal(id)` | Single proposal by ID |
| `useArchivedProposals(orgId)` | Archived proposals |

### Mutation Hooks

| Hook | Purpose |
|------|---------|
| `useCreateProposal()` | Create new proposal |
| `useUpdateProposal()` | Update proposal data |
| `useDeleteProposal()` | Delete proposal |
| `useUpdateProposalStatus()` | Status changes with notifications |
| `useArchiveProposal()` | Archive (soft delete) |
| `useUnarchiveProposal()` | Restore from archive |
| `useCreateProposalVersion()` | Create revision |
| `useDeleteVersionGroup()` | Delete all versions |
| `useDeleteVersionWithPromotion()` | Delete with auto-promotion |
| `useSetMainVersion()` | Designate main version |

### Query Keys

```typescript
proposalQueryKeys = {
  all: ['proposals'],
  lists: () => ['proposals', 'list'],
  list: (orgId, filters) => ['proposals', 'list', orgId, filters],
  details: () => ['proposals', 'detail'],
  detail: (id) => ['proposals', 'detail', id],
  archived: (orgId) => ['proposals', 'archived', orgId],
}
```

## Project Board Integration

When proposal status changes to "Won":

1. "Send to Project Board" button becomes available
2. Click creates project linked via `proposal_id`
3. Sets `is_on_board = true` on proposal
4. Project appears in first workflow column
5. Proposal shows "On Board" indicator

When proposal leaves "Won" status:
1. Automatically removed from project board
2. `is_on_board` set to false
3. Associated project record deleted (or unlinked)

## Statistics Dashboard

**Location:** `src/pages/Proposals.tsx`

| Stat | Calculation |
|------|-------------|
| Total proposals | Count of main versions only |
| Submitted | Count with status = 'Submitted' |
| Won this month | Count won in current month |
| Active value | Sum of total_value where status = 'Draft' OR 'Submitted' |

## Key Files

### Services
- `src/services/proposalsService.ts` - Core CRUD, versioning, status (~1,200 lines)
- `src/services/proposalSigningService.ts` - E-signature logic
- `src/services/numberingConfigService.ts` - Proposal numbering

### Components
- `src/components/features/proposals/table/EnhancedProposalsTable.tsx` - Main table (~1,286 lines)
- `src/features/proposals/components/ProposalEditor.tsx` - Form editor (~751 lines)

### Hooks
- `src/hooks/queries/useProposals.ts` - React Query hooks (~390 lines)

### Utilities
- `src/utils/proposalVersionGrouping.ts` - Version grouping logic (~248 lines)
- `src/utils/proposalCompletion.ts` - Completion calculation (~248 lines)

### Pages
- `src/pages/Proposals.tsx` - Main page with stats and handlers (~570 lines)

## Database Schema

```sql
-- proposals table
id                   uuid PRIMARY KEY
proposal_number      text UNIQUE
organization_id      uuid REFERENCES organizations(id)
form_id              uuid REFERENCES forms(id)
form_data            jsonb
status               text CHECK (status IN ('Draft', 'Submitted', 'Won', 'Rejected', 'Pending Approval'))
project_name         text
client_name          text
client_company       text
job_location         text
total_value          numeric
is_complete          boolean DEFAULT false
completed_at         timestamptz
parent_proposal_id   uuid REFERENCES proposals(id)
is_main_version      boolean DEFAULT true
is_on_board          boolean DEFAULT false
google_doc_id        text
submitted_at         timestamptz
won_at               timestamptz
rejected_at          timestamptz
created_by           uuid REFERENCES profiles(id)
created_by_name      text  -- Denormalized for deleted user display
created_at           timestamptz
updated_at           timestamptz
is_archived          boolean DEFAULT false
```
