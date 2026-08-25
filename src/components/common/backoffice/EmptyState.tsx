/**
 * Empty state
 *
 * The dashed box every back office screen draws when it has nothing to show.
 * It carries the one action that would make it non-empty, because "No orders
 * yet" without a way to make one is a dead end that sends people back to the
 * sidebar to guess.
 */

import React from 'react';
import { type Icon as PhosphorIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: PhosphorIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function EmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-gray-300 text-center dark:border-gray-700',
        size === 'sm' ? 'px-4 py-8' : 'px-4 py-12 sm:py-16',
        className
      )}
    >
      {IconComponent && (
        <IconComponent className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
      )}
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
      {description && (
        <div className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
