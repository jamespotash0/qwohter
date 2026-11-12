/**
 * Callout
 *
 * The tinted box that tells somebody why they cannot continue, or what will
 * happen if they do. It appeared inline about a dozen times across the order
 * dialogs, each with its own border, padding and icon placement; this is that
 * box, once, so a warning looks the same wherever it is raised.
 *
 * Default icons follow the tone rather than the caller, because a warning that
 * looks like a success is worse than no icon at all.
 */

import React from 'react';
import {
  Warning,
  WarningCircle,
  CheckCircle,
  Info,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { type Tone, TONE_SURFACE, TONE_SURFACE_TEXT } from './tones';

const TONE_ICONS: Record<Tone, PhosphorIcon | null> = {
  neutral: null,
  info: Info,
  active: Info,
  warn: Warning,
  danger: WarningCircle,
  success: CheckCircle,
};

const TONE_ICON_COLOR: Record<Tone, string> = {
  neutral: 'text-gray-500',
  info: 'text-blue-600 dark:text-blue-400',
  active: 'text-violet-600 dark:text-violet-400',
  warn: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  success: 'text-emerald-600 dark:text-emerald-400',
};

interface CalloutProps {
  tone?: Tone;
  /** Override the tone's icon, or pass null to show none. */
  icon?: PhosphorIcon | null;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Buttons or links, right-aligned on wide screens and wrapped below on narrow. */
  actions?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function Callout({
  tone = 'warn',
  icon,
  title,
  children,
  actions,
  size = 'md',
  className,
}: CalloutProps) {
  const IconComponent = icon === undefined ? TONE_ICONS[tone] : icon;

  return (
    <div
      className={cn(
        'rounded-lg border',
        size === 'sm' ? 'p-2.5' : 'p-3',
        TONE_SURFACE[tone],
        className
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {IconComponent && (
            <IconComponent
              className={cn('mt-0.5 h-4 w-4 shrink-0', TONE_ICON_COLOR[tone])}
              weight="fill"
            />
          )}
          <div className={cn('min-w-0 text-sm', TONE_SURFACE_TEXT[tone])}>
            {title && <p className="font-medium">{title}</p>}
            {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
