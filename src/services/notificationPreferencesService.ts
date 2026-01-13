/**
 * Notification Preferences Service
 *
 * Service for managing user notification preferences (email settings)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput,
} from '@/lib/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notifications';

/**
 * Fetch notification preferences for a user in an organization
 * Note: Uses type assertion because notification_preferences table types
 * are not yet in Supabase generated types until migration runs
 */
export async function fetchNotificationPreferences(
  userId: string,
  organizationId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await (supabase
    .from('notification_preferences') as any)
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    // No preferences found is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data as NotificationPreferences;
}

/**
 * Create notification preferences with defaults
 */
export async function createNotificationPreferences(
  userId: string,
  organizationId: string
): Promise<NotificationPreferences> {
  const { data, error } = await (supabase
    .from('notification_preferences') as any)
    .insert({
      user_id: userId,
      organization_id: organizationId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

/**
 * Get or create notification preferences
 * If preferences don't exist, create with defaults
 */
export async function getOrCreateNotificationPreferences(
  userId: string,
  organizationId: string
): Promise<NotificationPreferences> {
  const existing = await fetchNotificationPreferences(userId, organizationId);
  if (existing) return existing;
  return createNotificationPreferences(userId, organizationId);
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput
): Promise<NotificationPreferences> {
  const { user_id, organization_id, ...updates } = input;

  const { data, error } = await (supabase
    .from('notification_preferences') as any)
    .update(updates)
    .eq('user_id', user_id)
    .eq('organization_id', organization_id)
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

/**
 * Upsert notification preferences (create if not exists, update if exists)
 * Note: Uses type assertion because notification_preferences table types
 * are not yet in Supabase generated types until migration runs
 */
export async function upsertNotificationPreferences(
  input: UpdateNotificationPreferencesInput
): Promise<NotificationPreferences> {
  const { user_id, organization_id, ...updates } = input;

  // First, try to fetch existing preferences
  const existing = await fetchNotificationPreferences(user_id, organization_id);

  // Merge: existing (if any) -> defaults (for new records) -> updates
  const upsertData = {
    user_id,
    organization_id,
    ...(existing ? {} : DEFAULT_NOTIFICATION_PREFERENCES), // Only use defaults for new records
    ...existing, // Preserve existing values
    ...updates,  // Apply new updates on top
  };

  const { data, error } = await (supabase
    .from('notification_preferences') as any)
    .upsert(upsertData, { onConflict: 'user_id,organization_id' })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

/**
 * Check if a specific notification type is enabled for email
 */
export async function isNotificationEmailEnabled(
  userId: string,
  organizationId: string,
  notificationType: keyof Pick<
    NotificationPreferences,
    | 'email_on_signature_sent'
    | 'email_on_signature_viewed'
    | 'email_on_signature_signed'
    | 'email_on_proposal_submitted'
    | 'email_on_proposal_won'
    | 'email_on_proposal_rejected'
    | 'email_on_mention'
    | 'email_on_task_assigned'
  >
): Promise<boolean> {
  const prefs = await fetchNotificationPreferences(userId, organizationId);

  // If no preferences, use defaults
  if (!prefs) {
    return DEFAULT_NOTIFICATION_PREFERENCES[notificationType] ?? false;
  }

  // Check if email is globally enabled first
  if (!prefs.email_enabled) return false;

  // Then check the specific notification type
  return prefs[notificationType] ?? false;
}
