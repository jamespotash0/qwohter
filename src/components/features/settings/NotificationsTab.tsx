/**
 * Notifications Tab
 *
 * Settings tab for configuring email notification preferences
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, PaperPlaneTilt, Eye, PenNib, CheckCircle, XCircle, At, UserPlus, Users, Phone } from '@phosphor-icons/react';
import { BellRing, Mail, MessageSquare } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  useNotificationPreferencesWithDefaults,
  useUpdateNotificationPreferences,
} from '@/hooks/queries/useNotificationPreferences';
import type { NotificationPreferences } from '@/lib/types/notifications';

interface NotificationsTabProps {
  userId?: string;
  organizationId?: string;
  userEmail?: string;
  userRole?: 'Owner' | 'Admin' | 'Member';
}

interface NotificationToggleProps {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  id,
  label,
  description,
  icon,
  checked,
  onCheckedChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-500 dark:text-gray-400">
          {icon}
        </div>
        <div>
          <Label htmlFor={id} className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
            {label}
          </Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function NotificationsTab({ userId, organizationId, userEmail, userRole = 'Member' }: NotificationsTabProps) {
  const { data: preferences, isLoading } = useNotificationPreferencesWithDefaults(userId, organizationId);
  const { mutate: updatePreferences, isPending } = useUpdateNotificationPreferences();

  // Local state for optimistic updates
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({});
  const [emailInput, setEmailInput] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const hasInitialized = useRef(false);

  // Sync local state with server data - only on initial load
  useEffect(() => {
    if (preferences && !hasInitialized.current) {
      hasInitialized.current = true;
      setLocalPrefs(preferences);
      setEmailInput(preferences.notification_email || userEmail || '');
      setPhoneInput(preferences.sms_phone || '');
    }
  }, [preferences, userEmail]);

  // Get current notification email (custom or default)
  const currentEmail = localPrefs.notification_email || userEmail || '';

  // Debounced save function
  const savePreference = useCallback(
    (key: keyof NotificationPreferences, value: boolean | string | null) => {
      if (!userId || !organizationId) return;

      // Update local state immediately for smooth UX
      setLocalPrefs((prev) => ({ ...prev, [key]: value }));

      // Save to server
      updatePreferences(
        {
          user_id: userId,
          organization_id: organizationId,
          [key]: value,
        },
        {
          onError: () => {
            toast.error('Failed to save preferences');
            // Revert on error
            if (preferences) {
              setLocalPrefs(preferences);
            }
          },
        }
      );
    },
    [userId, organizationId, updatePreferences, preferences]
  );

  // Handle email save
  const handleEmailSave = useCallback(() => {
    const trimmedEmail = emailInput.trim();
    if (!trimmedEmail || trimmedEmail === userEmail) {
      // Reset to default (null) - will use profile email
      savePreference('notification_email', null);
      setEmailInput(userEmail || '');
    } else {
      savePreference('notification_email', trimmedEmail);
    }
    setIsEditingEmail(false);
  }, [emailInput, userEmail, savePreference]);

  // Handle phone save
  const handlePhoneSave = useCallback(() => {
    const trimmedPhone = phoneInput.trim();
    if (!trimmedPhone) {
      savePreference('sms_phone', null);
      // Disable SMS if no phone number
      if (localPrefs.sms_enabled) {
        savePreference('sms_enabled', false);
      }
    } else {
      savePreference('sms_phone', trimmedPhone);
    }
    setIsEditingPhone(false);
  }, [phoneInput, savePreference, localPrefs.sms_enabled]);

  // Toggle all events on or off - must be before early returns to maintain hooks order
  const handleToggleAllEvents = useCallback((enabled: boolean) => {
    if (!userId || !organizationId) return;

    const isAdminOrOwner = userRole === 'Owner' || userRole === 'Admin';

    // Base updates for all users (Members see these)
    const updates: Record<string, boolean> = {
      email_on_signature_sent: enabled,
      email_on_signature_viewed: enabled,
      email_on_signature_signed: enabled,
      email_on_proposal_submitted: enabled,
      email_on_proposal_won: enabled,
      email_on_proposal_rejected: enabled,
      email_on_mention: enabled,
      email_on_task_assigned: enabled,
      email_on_reminder_due: enabled,
      email_on_task_due: enabled,
    };

    // Admin/Owner only notifications
    if (isAdminOrOwner) {
      updates.email_on_member_joined = enabled;
    }

    // Update local state immediately
    setLocalPrefs((prev) => ({ ...prev, ...updates }));

    // Save to server
    updatePreferences(
      {
        user_id: userId,
        organization_id: organizationId,
        ...updates,
      },
      {
        onError: () => {
          toast.error('Failed to save preferences');
          if (preferences) {
            setLocalPrefs(preferences);
          }
        },
      }
    );
  }, [userId, organizationId, updatePreferences, preferences]);

  if (!userId || !organizationId) {
    return (
      <div className="w-full max-w-5xl min-w-[640px]">
        <div className="text-center py-12 text-gray-500">
          Please sign in to manage notification preferences.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl min-w-[640px]">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-8"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Check if all events are enabled (role-aware)
  const isAdminOrOwner = userRole === 'Owner' || userRole === 'Admin';

  // Base events all users can toggle
  const baseEventsEnabled =
    (localPrefs.email_on_signature_sent ?? true) &&
    (localPrefs.email_on_signature_viewed ?? true) &&
    (localPrefs.email_on_signature_signed ?? true) &&
    (localPrefs.email_on_proposal_submitted ?? true) &&
    (localPrefs.email_on_proposal_won ?? true) &&
    (localPrefs.email_on_proposal_rejected ?? false) &&
    (localPrefs.email_on_mention ?? true) &&
    (localPrefs.email_on_task_assigned ?? true) &&
    (localPrefs.email_on_reminder_due ?? true) &&
    (localPrefs.email_on_task_due ?? true);

  // Admin/Owner events
  const adminEventsEnabled = isAdminOrOwner
    ? (localPrefs.email_on_member_joined ?? true)
    : true; // For members, admin events don't affect "all" status

  const allEventsEnabled = baseEventsEnabled && adminEventsEnabled;

  return (
    <div className="w-full max-w-5xl min-w-[640px]">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          Notifications
        </h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>
      </div>

      {/* Delivery Channels */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
          <div>
            <Label className="text-base font-semibold text-gray-900 dark:text-white">
              Delivery Channels
            </Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose how you want to receive notifications
            </p>
          </div>
        </div>

        {/* Email Delivery */}
        <div className="ml-8 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Email</span>
            </div>
            <Switch
              checked={localPrefs.email_enabled ?? true}
              onCheckedChange={(checked) => savePreference('email_enabled', checked)}
              disabled={isPending}
            />
          </div>
          {(localPrefs.email_enabled ?? true) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-sm text-gray-500">Send to</span>
              {isEditingEmail ? (
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onBlur={handleEmailSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSave()}
                  className="w-64 h-9"
                  placeholder="Enter email address"
                  autoFocus
                  disabled={isPending}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEmailInput(currentEmail);
                    setIsEditingEmail(true);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  disabled={isPending}
                >
                  {currentEmail || 'Add email'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* SMS Delivery */}
        <div className="ml-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">SMS</span>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Coming Soon</span>
            </div>
            <Switch
              checked={localPrefs.sms_enabled ?? false}
              onCheckedChange={(checked) => {
                if (checked && !localPrefs.sms_phone) {
                  toast.error('Please add a phone number first');
                  setIsEditingPhone(true);
                  return;
                }
                savePreference('sms_enabled', checked);
              }}
              disabled={isPending || true} // Disabled until SMS is implemented
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Phone className="w-4 h-4 text-gray-400" />
            {isEditingPhone ? (
              <Input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={handlePhoneSave}
                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSave()}
                className="w-48 h-9"
                placeholder="+1 (555) 123-4567"
                autoFocus
                disabled={isPending || true} // Disabled until SMS is implemented
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPhoneInput(localPrefs.sms_phone || '');
                  setIsEditingPhone(true);
                }}
                className="text-sm text-gray-400 cursor-not-allowed"
                disabled={true} // Disabled until SMS is implemented
              >
                {localPrefs.sms_phone || 'Add phone number'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 ml-6">
            SMS notifications will be available in a future update
          </p>
        </div>
      </div>

      {/* Notification Events */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Email Notifications
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Toggle which events send you an email notification
        </p>
        {/* All Toggle */}
        <div className="flex items-center justify-between py-3 border-b-2 border-gray-200 dark:border-gray-700 mb-2">
          <div className="flex items-center gap-3">
            <div className="text-gray-500 dark:text-gray-400">
              <BellRing className="w-4 h-4" />
            </div>
            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
              All
            </Label>
          </div>
          <Switch
            checked={allEventsEnabled}
            onCheckedChange={handleToggleAllEvents}
            disabled={isPending}
          />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <NotificationToggle
            id="email_on_signature_sent"
            label="Signature Requested"
            description="When you send a document for signature"
            icon={<PaperPlaneTilt className="w-4 h-4" />}
            checked={localPrefs.email_on_signature_sent ?? true}
            onCheckedChange={(checked) => savePreference('email_on_signature_sent', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_signature_viewed"
            label="Document Viewed"
            description="When a client opens your document"
            icon={<Eye className="w-4 h-4" />}
            checked={localPrefs.email_on_signature_viewed ?? true}
            onCheckedChange={(checked) => savePreference('email_on_signature_viewed', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_signature_signed"
            label="Document Signed"
            description="When a client signs your document"
            icon={<PenNib className="w-4 h-4" />}
            checked={localPrefs.email_on_signature_signed ?? true}
            onCheckedChange={(checked) => savePreference('email_on_signature_signed', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_proposal_submitted"
            label="Proposal Submitted"
            description="When a proposal is submitted for review"
            icon={<PaperPlaneTilt className="w-4 h-4" />}
            checked={localPrefs.email_on_proposal_submitted ?? true}
            onCheckedChange={(checked) => savePreference('email_on_proposal_submitted', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_proposal_won"
            label="Proposal Won"
            description="When a proposal is marked as won"
            icon={<CheckCircle className="w-4 h-4" />}
            checked={localPrefs.email_on_proposal_won ?? true}
            onCheckedChange={(checked) => savePreference('email_on_proposal_won', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_proposal_rejected"
            label="Proposal Rejected"
            description="When a proposal is marked as rejected"
            icon={<XCircle className="w-4 h-4" />}
            checked={localPrefs.email_on_proposal_rejected ?? false}
            onCheckedChange={(checked) => savePreference('email_on_proposal_rejected', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_mention"
            label="Mentions"
            description="When someone mentions you in a comment"
            icon={<At className="w-4 h-4" />}
            checked={localPrefs.email_on_mention ?? true}
            onCheckedChange={(checked) => savePreference('email_on_mention', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_task_assigned"
            label="Task Assigned"
            description="When a task is assigned to you"
            icon={<UserPlus className="w-4 h-4" />}
            checked={localPrefs.email_on_task_assigned ?? true}
            onCheckedChange={(checked) => savePreference('email_on_task_assigned', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_reminder_due"
            label="Reminder Due"
            description="When a reminder you created becomes due"
            icon={<BellRing className="w-4 h-4" />}
            checked={localPrefs.email_on_reminder_due ?? true}
            onCheckedChange={(checked) => savePreference('email_on_reminder_due', checked)}
            disabled={isPending}
          />
          <NotificationToggle
            id="email_on_task_due"
            label="Task Due Date"
            description="When a task assigned to you is due soon or overdue"
            icon={<CalendarClock className="w-4 h-4" />}
            checked={localPrefs.email_on_task_due ?? true}
            onCheckedChange={(checked) => savePreference('email_on_task_due', checked)}
            disabled={isPending}
          />
        </div>

        {/* Admin & Organization Section - Only show to Owners and Admins */}
        {(userRole === 'Owner' || userRole === 'Admin') && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Organization
            </h4>
            <NotificationToggle
              id="email_on_member_joined"
              label="Member Joined"
              description="When a new member joins your organization"
              icon={<Users className="w-4 h-4" />}
              checked={localPrefs.email_on_member_joined ?? true}
              onCheckedChange={(checked) => savePreference('email_on_member_joined', checked)}
              disabled={isPending}
            />
          </div>
        )}

      </div>
    </div>
  );
}
