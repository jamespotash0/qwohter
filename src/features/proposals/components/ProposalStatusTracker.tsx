/**
 * Proposal Status Tracker
 *
 * Two-track display:
 * - Main track: Draft → Submitted → Won / Rejected
 * - Signing branch (optional): Pending → Viewed → Signed
 *   - Includes reminder status indicator with stop button
 *
 * Main track derives from proposal.status field.
 * Signing branch only shows when signing tokens exist.
 */

import { Fragment, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Signature, BellRinging, BellSlash } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/sonner';
import { stopSigningReminders } from '@/services/proposalSigningService';
import type { SigningToken } from '@/services/proposalSigningService';

interface ProposalStatusTrackerProps {
  proposalData: {
    status?: string | null;
    submitted_at?: string | null;
    won_at?: string | null;
    rejected_at?: string | null;
  };
  signingTokens: SigningToken[];
  onTokensChanged?: () => void;
}

interface Step {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  variant?: 'default' | 'success' | 'destructive';
}

// Status progression order for the main track
const STATUS_ORDER = ['draft', 'submitted', 'won'] as const;

export function ProposalStatusTracker({ proposalData, signingTokens, onTokensChanged }: ProposalStatusTrackerProps) {
  const status = (proposalData.status?.toLowerCase() || 'draft');
  const isRejected = status === 'rejected';
  const isWon = status === 'won';

  // Main track steps
  const mainSteps = useMemo<Step[]>(() => {
    const statusIdx = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
    const effectiveIdx = isRejected ? 1 : statusIdx; // Rejected means it got past Submitted

    const rawSteps: Omit<Step, 'current'>[] = [
      { id: 'draft', label: 'Draft', completed: effectiveIdx >= 0 },
      { id: 'submitted', label: 'Submitted', completed: effectiveIdx >= 1 || !!proposalData.submitted_at },
    ];

    // Final step is either Won or Rejected
    if (isRejected) {
      rawSteps.push({ id: 'rejected', label: 'Rejected', completed: true, variant: 'destructive' });
    } else {
      rawSteps.push({ id: 'won', label: 'Won', completed: isWon, variant: 'success' });
    }

    const firstIncompleteIdx = rawSteps.findIndex(s => !s.completed);

    return rawSteps.map((step, idx) => ({
      ...step,
      current: idx === firstIncompleteIdx,
    }));
  }, [status, isRejected, isWon, proposalData.submitted_at]);

  // Signing branch (only when tokens exist)
  const activeToken = useMemo(() =>
    signingTokens.find(t => t.status !== 'Revoked' && t.status !== 'Expired'),
    [signingTokens]
  );

  const signingSteps = useMemo<Step[] | null>(() => {
    if (!activeToken) return null;

    const hasBeenViewed = !!activeToken.first_viewed_at ||
      activeToken.status === 'Viewed' ||
      activeToken.status === 'Signed';

    const hasBeenSigned = activeToken.status === 'Signed' || !!activeToken.signed_at;

    const rawSteps: Omit<Step, 'current'>[] = [
      { id: 'sig-pending', label: 'Pending', completed: true },
      { id: 'sig-viewed', label: 'Viewed', completed: hasBeenViewed },
      { id: 'sig-signed', label: 'Signed', completed: hasBeenSigned },
    ];

    const firstIncompleteIdx = rawSteps.findIndex(s => !s.completed);

    return rawSteps.map((step, idx) => ({
      ...step,
      current: idx === firstIncompleteIdx,
    }));
  }, [activeToken]);

  // Reminder info for active token
  const reminderInfo = useMemo(() => {
    if (!activeToken || activeToken.status === 'Signed') return null;
    const config = activeToken.reminder_config;
    if (!config?.enabled) return null;

    return {
      enabled: true,
      intervalDays: config.intervalDays,
      maxReminders: config.maxReminders,
      sentCount: activeToken.reminder_count || 0,
      lastSentAt: activeToken.last_reminder_sent_at,
      tokenId: activeToken.id,
    };
  }, [activeToken]);

  return (
    <div className="flex items-center gap-3">
      {/* Main track */}
      <StepTrack steps={mainSteps} />

      {/* Signing branch */}
      {signingSteps && (
        <>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <Signature className="w-3 h-3 text-gray-400" />
            <StepTrack steps={signingSteps} />
            {reminderInfo && (
              <ReminderIndicator info={reminderInfo} onStopped={onTokensChanged} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Reminder indicator with popover
interface ReminderInfo {
  enabled: boolean;
  intervalDays: number;
  maxReminders: number;
  sentCount: number;
  lastSentAt: string | null;
  tokenId: string;
}

function ReminderIndicator({ info, onStopped }: { info: ReminderInfo; onStopped?: () => void }) {
  const [stopping, setStopping] = useState(false);
  const remaining = info.maxReminders - info.sentCount;

  const handleStop = async () => {
    setStopping(true);
    try {
      const result = await stopSigningReminders(info.tokenId);
      if (result.success) {
        toast.success('Reminders stopped');
        onStopped?.();
      } else {
        toast.error(result.error || 'Failed to stop reminders');
      }
    } catch {
      toast.error('Failed to stop reminders');
    } finally {
      setStopping(false);
    }
  };

  const lastSentLabel = info.lastSentAt
    ? `Last sent ${formatRelativeTime(info.lastSentAt)}`
    : 'No reminders sent yet';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="ml-1 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Reminder status"
        >
          <BellRinging className="w-3 h-3 text-amber-500" weight="fill" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <BellRinging className="w-3.5 h-3.5 text-amber-500" weight="fill" />
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              Auto-reminders
            </span>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
            <p>Every {info.intervalDays} day{info.intervalDays > 1 ? 's' : ''}</p>
            <p>{info.sentCount} of {info.maxReminders} sent</p>
            <p>{lastSentLabel}</p>
            {remaining > 0 && (
              <p>{remaining} remaining</p>
            )}
          </div>

          <button
            onClick={handleStop}
            disabled={stopping}
            className="flex items-center gap-1.5 w-full mt-1 px-2 py-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            <BellSlash className="w-3 h-3" />
            {stopping ? 'Stopping...' : 'Stop reminders'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
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

function StepTrack({ steps }: { steps: Step[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <Fragment key={step.id}>
          {i > 0 && (
            <div
              className={cn(
                'w-4 h-px',
                step.completed
                  ? step.variant === 'destructive' ? 'bg-red-300' : 'bg-green-400'
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          )}
          <div className="flex items-center gap-1">
            {step.completed ? (
              step.variant === 'destructive' ? (
                <XCircle className="w-3.5 h-3.5 text-red-500" weight="fill" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" weight="fill" />
              )
            ) : step.current ? (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-coral bg-coral/20" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600" />
            )}
            <span
              className={cn(
                'text-[10px] font-medium',
                step.completed
                  ? step.variant === 'destructive'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                  : step.current
                    ? 'text-coral'
                    : 'text-gray-400 dark:text-gray-500'
              )}
            >
              {step.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
