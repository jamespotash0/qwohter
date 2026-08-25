/**
 * Status chip
 *
 * The pill that shows a status, in one of the six tones. The tones and the
 * vocabularies that map onto them live in `tones.ts`, so this file exports a
 * component and nothing else.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TONE_PILL, TONE_OUTLINE, TONE_SOLID, type Tone } from './tones';

interface StatusChipProps {
  tone?: Tone;
  variant?: 'pill' | 'outline';
  size?: 'sm' | 'md';
  /** Show a solid dot in the tone colour, for when the chip is monochrome. */
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function StatusChip({
  tone = 'neutral',
  variant = 'pill',
  size = 'md',
  dot = false,
  className,
  children,
}: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        variant === 'pill' ? TONE_PILL[tone] : cn('border', TONE_OUTLINE[tone]),
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', TONE_SOLID[tone])} />
      )}
      {children}
    </span>
  );
}
