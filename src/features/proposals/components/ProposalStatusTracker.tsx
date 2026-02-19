/**
 * Proposal Status Tracker
 *
 * Two-track display:
 * - Main track: Draft → Submitted → Won / Rejected
 * - Signing branch (optional): Pending → Viewed → Signed
 *
 * Main track derives from proposal.status field.
 * Signing branch only shows when signing tokens exist.
 */

import { Fragment, useMemo } from 'react';
import { CheckCircle, XCircle, Signature } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { SigningToken } from '@/services/proposalSigningService';

interface ProposalStatusTrackerProps {
  proposalData: {
    status?: string | null;
    submitted_at?: string | null;
    won_at?: string | null;
    rejected_at?: string | null;
  };
  signingTokens: SigningToken[];
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

export function ProposalStatusTracker({ proposalData, signingTokens }: ProposalStatusTrackerProps) {
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
          </div>
        </>
      )}
    </div>
  );
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
