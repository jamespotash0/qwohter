/**
 * Manage Reminders Dialog
 *
 * Per-proposal reminder management from the proposals table 3-dot menu.
 * Shows active signing tokens and lets users toggle/configure reminders.
 */

import React, { useState } from 'react';
import { BellRinging, BellSlash, CaretDown, Envelope } from '@phosphor-icons/react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { useProposalSigningTokens } from '@/hooks/queries/useSigningTokens';
import { updateSigningReminders, type SigningToken } from '@/services/proposalSigningService';

interface ManageRemindersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  proposalNumber?: string;
}

const INTERVAL_OPTIONS = [1, 2, 3, 5, 7];
const MAX_REMINDER_OPTIONS = [1, 2, 3, 5];

export const ManageRemindersDialog: React.FC<ManageRemindersDialogProps> = ({
  isOpen,
  onClose,
  proposalId,
  proposalNumber,
}) => {
  const { data: tokens = [], isLoading, refetch } = useProposalSigningTokens(proposalId, isOpen);

  // Filter to active tokens only (Pending or Viewed)
  const activeTokens = tokens.filter(t => t.status === 'Pending' || t.status === 'Viewed');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRinging className="w-5 h-5 text-amber-500" weight="fill" />
            Manage Reminders
            {proposalNumber && (
              <span className="text-sm font-normal text-gray-500">- {proposalNumber}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : activeTokens.length === 0 ? (
          <div className="text-center py-8">
            <Envelope className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No active signing requests</p>
            <p className="text-xs text-gray-500 mt-1">
              Send a proposal for signature first to manage reminders.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {activeTokens.map((token) => (
              <TokenReminderCard key={token.id} token={token} onUpdated={() => refetch()} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Individual token reminder card
function TokenReminderCard({ token, onUpdated }: { token: SigningToken; onUpdated: () => void }) {
  const [updating, setUpdating] = useState(false);

  const config = token.reminder_config || { enabled: false, intervalDays: 3, maxReminders: 3 };
  const sentCount = token.reminder_count || 0;
  const remaining = config.enabled ? Math.max(0, config.maxReminders - sentCount) : 0;

  const handleUpdate = async (newConfig: { enabled: boolean; intervalDays: number; maxReminders: number }) => {
    setUpdating(true);
    try {
      const result = await updateSigningReminders(token.id, newConfig);
      if (result.success) {
        toast.success(newConfig.enabled ? 'Reminders updated' : 'Reminders disabled');
        onUpdated();
      } else {
        toast.error(result.error || 'Failed to update reminders');
      }
    } catch {
      toast.error('Failed to update reminders');
    } finally {
      setUpdating(false);
    }
  };

  const lastSentLabel = token.last_reminder_sent_at
    ? `Last sent ${formatRelativeTime(token.last_reminder_sent_at)}`
    : 'No reminders sent yet';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
      {/* Header: email + toggle */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {token.client_email}
          </p>
          <p className="text-xs text-gray-500">
            {token.status} · Sent {formatRelativeTime(token.sent_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className="text-xs text-gray-500">
            {config.enabled ? 'On' : 'Off'}
          </span>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) =>
              handleUpdate({ ...config, enabled })
            }
            disabled={updating}
          />
        </div>
      </div>

      {/* Config details (only when enabled) */}
      {config.enabled && (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Every</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                  disabled={updating}
                >
                  {config.intervalDays} day{config.intervalDays > 1 ? 's' : ''}
                  <CaretDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {INTERVAL_OPTIONS.map((days) => (
                  <DropdownMenuItem
                    key={days}
                    onClick={() => handleUpdate({ ...config, intervalDays: days })}
                    className={config.intervalDays === days ? 'bg-gray-100 dark:bg-gray-800' : ''}
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
                  disabled={updating}
                >
                  {config.maxReminders} time{config.maxReminders > 1 ? 's' : ''}
                  <CaretDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {MAX_REMINDER_OPTIONS.map((count) => (
                  <DropdownMenuItem
                    key={count}
                    onClick={() => handleUpdate({ ...config, maxReminders: count })}
                    className={config.maxReminders === count ? 'bg-gray-100 dark:bg-gray-800' : ''}
                  >
                    {count} time{count > 1 ? 's' : ''}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Status info */}
      <div className="flex items-center gap-3 text-[11px] text-gray-400">
        {config.enabled ? (
          <>
            <span>{sentCount} of {config.maxReminders} sent</span>
            <span>·</span>
            <span>{lastSentLabel}</span>
            {remaining > 0 && (
              <>
                <span>·</span>
                <span>{remaining} remaining</span>
              </>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1">
            <BellSlash className="w-3 h-3" />
            Reminders disabled
          </span>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}
