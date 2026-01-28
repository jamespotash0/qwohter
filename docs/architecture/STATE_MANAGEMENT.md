# State Management

## Three-Tier System

| Type | Technology | Purpose |
|------|------------|---------|
| Server State | React Query | Proposals, organizations, forms, profiles, etc. |
| UI State | Zustand (uiStore) | Modals, toasts, sidebar, theme |
| App State | Zustand (appStore) | Feature flags, online status |

## React Query Configuration

**Location:** `src/lib/queryClient.ts`

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds
      gcTime: 5 * 60 * 1000,       // 5 minutes (garbage collection)
      retry: 3,                     // With exponential backoff
      refetchOnWindowFocus: true,
    },
  },
});
```

### Persistence

- localStorage persistence with 5-minute TTL
- Automatic cache restoration on app load
- Selective persistence for critical queries

### Query Key Patterns

```typescript
// Standard patterns used throughout the app
['proposals', organizationId]
['proposal', proposalId]
['organizations', userId]
['profile', userId]
['forms', organizationId]
['notifications', organizationId]
```

## Zustand Stores

### appStore.ts

**Location:** `src/stores/appStore.ts`

```typescript
interface AppStore {
  isOnline: boolean;
  featureFlags: Record<string, boolean>;
  appVersion: string;
  setOnline: (online: boolean) => void;
  setFeatureFlag: (flag: string, value: boolean) => void;
}
```

### uiStore.ts

**Location:** `src/stores/uiStore.ts`

```typescript
interface UIStore {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  activeModal: string | null;
  toasts: Toast[];
  // Persisted to localStorage
}
```

### productStore.ts

**Location:** `src/stores/productStore.ts`

- Product selection state for form builder
- Wall system configuration state

## Real-time Updates

**Location:** `src/lib/realtimeSubscriptions.ts`

### Architecture Overview

```
Component mounts → useRealtimeSubscription() → Channel Registry check
                                                      ↓
                                          [Channel exists?]
                                          Yes → Increment ref count
                                          No  → Create channel + subscribe
                                                      ↓
                                          Supabase Realtime Connection
                                                      ↓
                                          Database change event
                                                      ↓
                                          Debounced cache invalidation
                                                      ↓
                                          React Query refetch
```

### Channel Registry Pattern

The registry prevents duplicate subscriptions when multiple components subscribe to the same table:

```typescript
// Internal registry structure
const channelRegistry: Map<string, {
  channel: RealtimeChannel;
  refCount: number;
  queryKeys: Set<string>;
}> = new Map();

// When component subscribes:
// 1. Check if channel exists for this table+filter combo
// 2. If exists → increment refCount
// 3. If not → create new channel, set refCount = 1

// When component unmounts:
// 1. Decrement refCount
// 2. If refCount === 0 → unsubscribe and remove channel
```

### Basic Usage

```typescript
useRealtimeSubscription(
  'tableName',
  queryKey,
  { filter: `organization_id=eq.${orgId}` }
);
```

### Tables with Realtime

| Table | Query Key Pattern | Filter |
|-------|-------------------|--------|
| `proposals` | `['proposals', orgId]` | `organization_id=eq.{orgId}` |
| `projects` | `['projects', orgId]` | `organization_id=eq.{orgId}` |
| `project_tasks` | `['project_tasks', projectId]` | `project_id=eq.{projectId}` |
| `notifications` | `['notifications', orgId]` | `organization_id=eq.{orgId}` |
| `contacts` | `['contacts', orgId]` | `organization_id=eq.{orgId}` |
| `forms` | `['forms', orgId]` | `organization_id=eq.{orgId}` |
| `memberships` | `['memberships', orgId]` | `organization_id=eq.{orgId}` |
| `form_submissions` | `['submissions', formId]` | `form_id=eq.{formId}` |
| `subscriptions` | `['subscription', orgId]` | `organization_id=eq.{orgId}` |

### Debounced Cache Invalidation

To prevent excessive refetches from rapid database changes, invalidations are debounced:

```typescript
// Default debounce: 100ms
const DEBOUNCE_MS = 100;

// Multiple rapid changes within 100ms → single invalidation
// Example: Bulk import of 50 contacts → 1 refetch (not 50)
```

### Event-Specific Handling

```typescript
// INSERT events
// → Debounced cache invalidation (waits for batch)

// UPDATE events
// → Debounced cache invalidation

// DELETE events
// → IMMEDIATE cache removal (no debounce)
// → Ensures deleted items disappear instantly from UI
```

### Usage Example: Proposals List

```typescript
// In useProposals hook
export const useProposals = (organizationId: string) => {
  const queryKey = ['proposals', organizationId];

  // Set up realtime subscription
  useRealtimeSubscription('proposals', queryKey, {
    filter: `organization_id=eq.${organizationId}`
  });

  // Query data
  return useQuery({
    queryKey,
    queryFn: () => proposalsService.list(organizationId),
    staleTime: 30 * 1000,
  });
};
```

### Usage Example: Project Tasks (Nested Filter)

```typescript
// In useProjectTasks hook
export const useProjectTasks = (projectId: string) => {
  const queryKey = ['project_tasks', projectId];

  useRealtimeSubscription('project_tasks', queryKey, {
    filter: `project_id=eq.${projectId}`
  });

  return useQuery({
    queryKey,
    queryFn: () => projectTasksService.list(projectId),
  });
};
```

### Manual Subscription (Advanced)

For custom scenarios not covered by the hook:

```typescript
import { subscribeToTable, unsubscribeFromTable } from '@/lib/realtimeSubscriptions';

// Subscribe
const cleanup = subscribeToTable(
  'custom_table',
  ['custom_table', customId],
  { filter: `some_field=eq.${value}` },
  (payload) => {
    // Custom handler
    console.log('Change:', payload);
  }
);

// Unsubscribe (in cleanup)
cleanup();
```

### Debugging Realtime Issues

```typescript
// Enable Supabase realtime debug logs
const supabase = createClient(url, key, {
  realtime: {
    params: {
      log_level: 'debug'
    }
  }
});

// Check channel status in console:
// - SUBSCRIBED: Working correctly
// - CHANNEL_ERROR: Connection issue
// - CLOSED: Intentionally closed
// - TIMED_OUT: Connection timeout
```

### Performance Considerations

1. **Ref Counting:** Same table subscribed in 10 components = 1 actual channel
2. **Debouncing:** Bulk operations don't cause N refetches
3. **Selective Filters:** Always filter by org/project to reduce events received
4. **Cleanup:** Automatic unsubscribe when components unmount

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No updates | Missing RLS policy for realtime | Add SELECT policy for authenticated users |
| Duplicate fetches | Missing debounce | Check debounce is enabled |
| Stale data | Cache not invalidating | Verify queryKey matches exactly |
| Memory leak | Missing cleanup | Ensure hook is used (not manual subscribe without cleanup) |

## Optimistic Updates Pattern

```typescript
const mutation = useMutation({
  mutationFn: updateProposal,
  onMutate: async (newData) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries({ queryKey: ['proposals', orgId] });

    // Snapshot current state
    const previous = queryClient.getQueryData(['proposals', orgId]);

    // Optimistically update
    queryClient.setQueryData(['proposals', orgId], (old) => ({
      ...old,
      ...newData,
    }));

    return { previous };
  },
  onError: (error, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['proposals', orgId], context.previous);
  },
  onSettled: () => {
    // Always refetch for source of truth
    queryClient.invalidateQueries({ queryKey: ['proposals', orgId] });
  },
});
```

## State Management Rules

1. **Server state:** Always use React Query
2. **UI state:** useState for local, Zustand for global
3. **Never mix:** Keep server and UI state separate
4. **Normalize sparingly:** Only denormalize for performance-critical paths

## Key Files

- `src/lib/queryClient.ts` - React Query configuration
- `src/lib/realtimeSubscriptions.ts` - Supabase realtime hooks
- `src/stores/appStore.ts` - App lifecycle state
- `src/stores/uiStore.ts` - UI preferences (persisted)
- `src/stores/productStore.ts` - Product selection state
