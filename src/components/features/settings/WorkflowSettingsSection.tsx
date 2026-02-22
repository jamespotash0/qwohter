import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CaretDown } from '@phosphor-icons/react';
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SigningReminderDefaults {
  enabled: boolean;
  intervalDays: number;
  maxReminders: number;
}

interface WorkflowSettingsSectionProps {
  organizationId: string;
  requireProposalApproval: boolean;
  signingReminderDefaults?: SigningReminderDefaults | null;
  hasEditPermission: boolean;
  onUpdate?: () => void;
}

const INTERVAL_OPTIONS = [1, 2, 3, 5, 7];
const MAX_REMINDER_OPTIONS = [1, 2, 3, 5];

export const WorkflowSettingsSection: React.FC<WorkflowSettingsSectionProps> = ({
  organizationId,
  requireProposalApproval,
  signingReminderDefaults,
  hasEditPermission,
  onUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [approvalEnabled, setApprovalEnabled] = useState(requireProposalApproval);

  const defaultReminders: SigningReminderDefaults = signingReminderDefaults || {
    enabled: true,
    intervalDays: 3,
    maxReminders: 3,
  };
  const [reminderConfig, setReminderConfig] = useState<SigningReminderDefaults>(defaultReminders);

  // Sync with prop changes
  useEffect(() => {
    setApprovalEnabled(requireProposalApproval);
  }, [requireProposalApproval]);

  useEffect(() => {
    if (signingReminderDefaults) {
      setReminderConfig(signingReminderDefaults);
    }
  }, [signingReminderDefaults]);

  const handleToggleApproval = async (enabled: boolean) => {
    if (!hasEditPermission) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to change workflow settings.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    setApprovalEnabled(enabled); // Optimistic update

    try {
      // Type assertion needed until Supabase types are regenerated after migration
      const { error } = await supabase
        .from('organizations')
        .update({ require_proposal_approval: enabled } as never)
        .eq('id', organizationId);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Error updating approval setting:', error);
      setApprovalEnabled(!enabled); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update workflow settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateReminderDefaults = async (newConfig: SigningReminderDefaults) => {
    if (!hasEditPermission) return;

    setIsUpdating(true);
    const prevConfig = { ...reminderConfig };
    setReminderConfig(newConfig); // Optimistic

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from('organizations') as any)
        .update({ signing_reminder_defaults: newConfig })
        .eq('id', organizationId);

      if (error) throw error;

      onUpdate?.();
    } catch (error) {
      console.error('Error updating reminder defaults:', error);
      setReminderConfig(prevConfig); // Revert
      toast({
        title: "Error",
        description: "Failed to update reminder defaults.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Workflow Settings</h2>
      <div className="h-px bg-gray-200 dark:bg-gray-700 mb-4"></div>

      <div className="space-y-1">
        {/* Proposal Approval Toggle */}
        <div className="flex items-start justify-between py-6 px-6 rounded-lg">
          <div className="flex-1 pr-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Proposal Approval
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Members will require approval from an Admin or Owner to change a proposal status from Draft to another status.
              Admins and Owners can change status directly without approval.
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-[120px] justify-end">
            <span className="text-sm text-gray-500">
              {approvalEnabled ? 'Required' : 'Not Required'}
            </span>
            <Switch
              checked={approvalEnabled}
              onCheckedChange={handleToggleApproval}
              disabled={!hasEditPermission || isUpdating}
            />
          </div>
        </div>

        {/* Signing Reminders Defaults */}
        <div className="flex items-start justify-between py-6 px-6 rounded-lg">
          <div className="flex-1 pr-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Signing Reminders
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Automatically send reminder emails to clients who haven't signed their proposal.
              These defaults apply to all new signing requests. You can override per-proposal from the proposals table.
            </p>
            {reminderConfig.enabled && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Every</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                        disabled={!hasEditPermission || isUpdating}
                      >
                        {reminderConfig.intervalDays} day{reminderConfig.intervalDays > 1 ? 's' : ''}
                        <CaretDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {INTERVAL_OPTIONS.map((days) => (
                        <DropdownMenuItem
                          key={days}
                          onClick={() => updateReminderDefaults({ ...reminderConfig, intervalDays: days })}
                          className={reminderConfig.intervalDays === days ? 'bg-gray-100 dark:bg-gray-800' : ''}
                        >
                          {days} day{days > 1 ? 's' : ''}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">up to</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                        disabled={!hasEditPermission || isUpdating}
                      >
                        {reminderConfig.maxReminders} time{reminderConfig.maxReminders > 1 ? 's' : ''}
                        <CaretDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {MAX_REMINDER_OPTIONS.map((count) => (
                        <DropdownMenuItem
                          key={count}
                          onClick={() => updateReminderDefaults({ ...reminderConfig, maxReminders: count })}
                          className={reminderConfig.maxReminders === count ? 'bg-gray-100 dark:bg-gray-800' : ''}
                        >
                          {count} time{count > 1 ? 's' : ''}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 min-w-[120px] justify-end">
            <span className="text-sm text-gray-500">
              {reminderConfig.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              checked={reminderConfig.enabled}
              onCheckedChange={(enabled) => updateReminderDefaults({ ...reminderConfig, enabled })}
              disabled={!hasEditPermission || isUpdating}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
