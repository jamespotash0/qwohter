/**
 * Data table
 *
 * A table on a desktop and a list of cards on a phone, from one column
 * definition.
 *
 * The back office screens were written as bare `<table>` markup with no
 * responsive rules at all, which is fine until you remember who actually uses
 * them: receiving happens at a loading dock and install sign-off happens on a
 * site, both on a phone, and a nine-column table on a 390px screen is not a
 * scrolling problem but an unusable one. Rather than ask every screen to write
 * two layouts, columns declare what they are and this picks the layout.
 *
 * The breakpoint is `md`. Below it each row becomes a card headed by the
 * column marked `primary`, with the rest as label/value pairs; at and above it
 * the same columns render as a real table inside a horizontal scroller, so a
 * genuinely wide table still behaves on a laptop.
 */

import React from 'react';
import { CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface DataColumn<T> {
  /** Stable identity for the column. Also the card's label when `header` is a node. */
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /**
   * Heads the card on narrow screens. Exactly one column should set this; the
   * first column is used if none does.
   */
  primary?: boolean;
  /** Drop from the card layout — chevrons and row affordances, mostly. */
  hideInCard?: boolean;
  /** Drop from the table layout, for a value only worth showing on a card. */
  hideInTable?: boolean;
  /** Label to use on the card when `header` is not a plain string. */
  cardLabel?: string;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataColumn<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  /** Shown when there are no rows and nothing is loading. */
  empty?: React.ReactNode;
  /** Extra classes on a row, for tone stripes and the like. */
  rowClassName?: (row: T) => string | undefined;
  /** Skeleton rows to draw while loading. */
  loadingRows?: number;
  className?: string;
}

const ALIGN_CLASS = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  isLoading = false,
  empty,
  rowClassName,
  loadingRows = 3,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: loadingRows }, (_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={className}>
        {empty ?? (
          <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
            Nothing here yet.
          </p>
        )}
      </div>
    );
  }

  const tableColumns = columns.filter(c => !c.hideInTable);
  const cardColumns = columns.filter(c => !c.hideInCard);
  const primary = cardColumns.find(c => c.primary) ?? cardColumns[0];
  const secondary = cardColumns.filter(c => c !== primary);

  return (
    <div className={className}>
      {/* Table, from md up. */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 md:block">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {tableColumns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-500',
                    ALIGN_CLASS[column.align ?? 'left'],
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-gray-100 last:border-b-0 dark:border-gray-700/50',
                  onRowClick &&
                    'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  rowClassName?.(row)
                )}
              >
                {tableColumns.map(column => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-gray-900 dark:text-gray-100',
                      ALIGN_CLASS[column.align ?? 'left'],
                      column.className
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards, below md. */}
      <div className="space-y-2 md:hidden">
        {rows.map(row => {
          const Element = onRowClick ? 'button' : 'div';
          return (
            <Element
              key={getRowId(row)}
              type={onRowClick ? 'button' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'block w-full rounded-xl border border-gray-200 bg-white p-3 text-left dark:border-gray-700 dark:bg-gray-800',
                onRowClick && 'transition-colors active:bg-gray-50 dark:active:bg-gray-700/50',
                rowClassName?.(row)
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 font-medium text-gray-900 dark:text-gray-100">
                  {primary?.render(row)}
                </div>
                {onRowClick && (
                  <CaretRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                )}
              </div>

              {secondary.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {secondary.map(column => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-wide text-gray-500">
                        {column.cardLabel ??
                          (typeof column.header === 'string' ? column.header : column.key)}
                      </dt>
                      <dd className="truncate text-sm text-gray-900 dark:text-gray-100">
                        {column.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </Element>
          );
        })}
      </div>
    </div>
  );
}
