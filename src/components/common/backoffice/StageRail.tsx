/**
 * Stage rail
 *
 * Where the job is, and how you get to the work.
 *
 * This is one control doing two jobs on purpose. It reports the derived stage
 * from `project_progress`, and it is also the tab bar — clicking a stage opens
 * the panel that governs it. Splitting those apart is what produced the screen
 * it replaces, where a chip said "Receiving" and a tab strip alongside it
 * offered seven nouns in a different order, leaving the reader to work out
 * which noun the chip meant.
 *
 * Two states are shown at once and they are not the same thing:
 *
 *   current   where the job actually is, from the event log. Not clickable
 *             away — it is a fact about the job.
 *   selected  which panel is open. Usually the current stage, but a person
 *             looking ahead at billing while a crew is still on site is a
 *             normal thing to do.
 *
 * Colour carries three meanings only: done, here, not yet. Stage identity is
 * carried by position, which is why this is not seven different hues.
 */

import React from 'react';
import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  JOB_STAGES,
  STAGE_SHORT_LABELS,
  STAGE_DESCRIPTIONS,
  stagePosition,
  type JobStage,
} from './stages';

interface StageRailProps {
  /** Where the job is, from `project_progress.stage`. */
  current: JobStage;
  /** Which panel is open. Defaults to the current stage. */
  selected?: JobStage;
  onSelect?: (stage: JobStage) => void;
  /**
   * Attention counts, keyed by stage — lines awaiting acknowledgment on
   * Ordering, damaged cartons on Receiving. Zero and undefined both render
   * nothing, so callers can pass a raw rollup without filtering it.
   */
  counts?: Partial<Record<JobStage, number>>;
  className?: string;
}

export function StageRail({
  current,
  selected,
  onSelect,
  counts,
  className,
}: StageRailProps) {
  const active = selected ?? current;

  return (
    // Overflowing rather than wrapping: a rail that wraps to two lines stops
    // reading as a sequence, and seven steps do not fit across a phone.
    <div className={cn('-mx-1 overflow-x-auto px-1 pb-1', className)}>
      <div
        role="tablist"
        aria-label="Job stages"
        className="flex min-w-[560px] items-start sm:min-w-0"
      >
        {JOB_STAGES.map((stage, index) => {
          const position = stagePosition(stage, current);
          const isSelected = stage === active;
          const count = counts?.[stage] ?? 0;
          const isFirst = index === 0;
          const isLast = index === JOB_STAGES.length - 1;

          return (
            <button
              key={stage}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-current={position === 'current' ? 'step' : undefined}
              title={STAGE_DESCRIPTIONS[stage]}
              onClick={() => onSelect?.(stage)}
              disabled={!onSelect}
              className={cn(
                'group relative flex flex-1 flex-col items-center gap-1.5 pt-1',
                'focus-visible:outline-none',
                onSelect ? 'cursor-pointer' : 'cursor-default'
              )}
            >
              {/* Track: the connector either side of the marker. */}
              <div className="flex w-full items-center" aria-hidden="true">
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    isFirst ? 'bg-transparent' : connectorClass(position)
                  )}
                />
                <StageMarker position={position} isSelected={isSelected} />
                <span
                  className={cn(
                    'h-0.5 flex-1 rounded-full',
                    isLast
                      ? 'bg-transparent'
                      : // The segment after the current step is not yet
                        // travelled, so it reads as upcoming.
                        connectorClass(position === 'done' ? 'done' : 'upcoming')
                  )}
                />
              </div>

              <span
                className={cn(
                  'px-1 text-center text-[11px] leading-tight transition-colors sm:text-xs',
                  isSelected
                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                    : position === 'upcoming'
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-600 dark:text-gray-400',
                  onSelect && 'group-hover:text-gray-900 dark:group-hover:text-gray-100'
                )}
              >
                {STAGE_SHORT_LABELS[stage]}
              </span>

              {count > 0 && (
                <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium tabular-nums text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  {count}
                </span>
              )}

              {/* Selection underline, distinct from the stage marker so that
                  "open" never gets mistaken for "reached". */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-2 -bottom-1 h-0.5 rounded-full transition-colors',
                  isSelected ? 'bg-coral' : 'bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function connectorClass(position: 'done' | 'current' | 'upcoming'): string {
  return position === 'done'
    ? 'bg-emerald-400 dark:bg-emerald-600'
    : 'bg-gray-200 dark:bg-gray-700';
}

function StageMarker({
  position,
  isSelected,
}: {
  position: 'done' | 'current' | 'upcoming';
  isSelected: boolean;
}) {
  if (position === 'done') {
    return (
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white',
          isSelected && 'ring-2 ring-emerald-500/25'
        )}
      >
        <Check className="h-2.5 w-2.5" weight="bold" />
      </span>
    );
  }

  if (position === 'current') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-coral ring-4 ring-coral/20">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'h-4 w-4 shrink-0 rounded-full border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800',
        isSelected && 'border-gray-400 ring-2 ring-gray-300/40 dark:border-gray-500'
      )}
    />
  );
}

/**
 * The rail with the labels taken off, for a list row or a board card. Same
 * vocabulary and the same three colours, so a glance down a list of jobs reads
 * the same way as the header of any one of them.
 */
export function StageRailCompact({
  current,
  className,
}: {
  current: JobStage;
  className?: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-1', className)}
      title={`${current} — step ${JOB_STAGES.indexOf(current) + 1} of ${JOB_STAGES.length}`}
    >
      {JOB_STAGES.map(stage => {
        const position = stagePosition(stage, current);
        return (
          <span
            key={stage}
            className={cn(
              'h-1.5 rounded-full transition-colors',
              position === 'current' ? 'w-4 bg-coral' : 'w-1.5',
              position === 'done' && 'bg-emerald-400 dark:bg-emerald-600',
              position === 'upcoming' && 'bg-gray-200 dark:bg-gray-700'
            )}
          />
        );
      })}
    </div>
  );
}
