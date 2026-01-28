# Notification System

> **Location:** `src/services/notificationService.ts`, `supabase/functions/send-notification-email/`

## Architecture

```
User Action → notificationService.ts
        ├── createNotification() → notifications table (in-app)
        └── invoke send-notification-email → Resend API
                                                ↓ (on failure)
                                    notification_retry_queue
                                                ↓ (pg_cron every 5 min)
                                    process-notification-retry
```

## In-App Notifications

### Data Model

```typescript
interface Notification {
  id: string;
  organization_id: string;
  user_id: string;                    // Recipient
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;         // Additional context (proposal_id, etc.)
  read_at?: string;
  created_at: string;
}
```

### Notification Types

| Category | Types |
|----------|-------|
| Signature | `signature_sent`, `signature_viewed`, `signature_signed` |
| Proposal | `proposal_submitted`, `proposal_won`, `proposal_rejected` |
| Approval | `approval_requested`, `approval_approved`, `approval_rejected` |
| Task | `task_assigned`, `task_due_soon`, `update_mention` |
| Payment | `payment_success`, `payment_failed`, `trial_ending` |
| Team | `member_joined`, `member_removed`, `invitation_sent` |

## Email Notifications

### Resend Integration

**Edge Function:** `supabase/functions/send-notification-email/`

```typescript
// Invoke email notification
await supabase.functions.invoke('send-notification-email', {
  body: {
    type: 'signature_sent',
    recipientEmail: 'client@example.com',
    recipientName: 'John Doe',
    data: {
      proposalNumber: 'SR-1005',
      signingUrl: 'https://app.qwohter.com/sign/abc123',
      senderName: 'Jane Smith',
      companyName: 'Acme Corp'
    }
  }
});
```

### Email Templates

- Inline HTML with embedded CSS
- Brand color: `#EE6C4D`
- Max-width: 560px container
- XSS protection via `escapeHtml()`
- Plain text fallback for all emails

## Retry Logic

**Table:** `notification_retry_queue`

```typescript
interface NotificationRetry {
  id: string;
  notification_type: string;
  payload: Record<string, any>;
  retry_count: number;
  max_retries: number;               // Default: 5
  next_retry_at: string;
  last_error?: string;
  created_at: string;
}
```

### Retry Schedule

```
Attempt 1: Immediate
Attempt 2: +5 minutes
Attempt 3: +15 minutes (20 min total)
Attempt 4: +45 minutes (1h 5m total)
Attempt 5: +2.25 hours (3h 20m total)
Attempt 6: +6.75 hours (10h total) - Final
```

### Processing

- pg_cron job runs every 5 minutes
- Processes batch of 50 pending retries
- Removes successful sends from queue
- Logs final failures for monitoring

## Scheduled Notifications

**Table:** `scheduled_notifications`

```typescript
interface ScheduledNotification {
  id: string;
  organization_id: string;
  notification_type: string;
  payload: Record<string, any>;
  scheduled_for: string;
  recurrence?: 'once' | 'daily' | 'weekly';
  last_sent_at?: string;
  is_active: boolean;
}
```

Processed by pg_cron every 5 minutes.

## User Preferences

**Table:** `notification_preferences`

```typescript
interface NotificationPreferences {
  id: string;
  user_id: string;
  organization_id: string;

  // Global toggles
  email_enabled: boolean;
  in_app_enabled: boolean;

  // Per-type toggles
  email_on_signature_sent: boolean;
  email_on_signature_signed: boolean;
  email_on_proposal_submitted: boolean;
  email_on_task_assigned: boolean;
  email_on_payment_failed: boolean;
  // ... more toggles

  // Custom email (optional override)
  custom_email?: string;
}
```

### Default Preferences

New users get all notifications enabled by default. Preferences created on first organization join.

## React Query Hooks

**Location:** `src/hooks/queries/useNotifications.ts`

| Hook | Purpose |
|------|---------|
| `useNotifications(orgId)` | Fetch all notifications with realtime |
| `useUnreadCount(orgId)` | Count of unread notifications |
| `useMarkAsRead()` | Mark notification as read |
| `useMarkAllAsRead()` | Mark all as read |
| `useNotificationPreferences()` | Get user preferences |
| `useUpdatePreferences()` | Update preferences |

## Real-time Updates

Notifications have real-time subscription:

```typescript
useRealtimeSubscription('notifications', ['notifications', orgId], {
  filter: `organization_id=eq.${orgId}`
});
```

New notifications appear instantly in the UI notification bell.

## Key Files

- `src/services/notificationService.ts` - Notification creation
- `src/hooks/queries/useNotifications.ts` - React Query hooks
- `supabase/functions/send-notification-email/` - Email sending
- `supabase/functions/process-notification-retry/` - Retry processing
- `src/components/features/notifications/` - UI components
