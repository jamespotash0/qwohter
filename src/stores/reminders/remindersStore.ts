/**
 * @deprecated This store has been migrated to React Query
 * Use hooks from @/hooks/queries instead
 *
 * Migration:
 * - import { useReminders } from '@/hooks/queries'
 * - const { data: reminders } = useReminders(organizationId)
 *
 * Types are still exported for backward compatibility
 */

// Re-export types from service layer
export type { Reminder, CreateReminderParams, UpdateReminderParams } from '@/services/reminderService';
