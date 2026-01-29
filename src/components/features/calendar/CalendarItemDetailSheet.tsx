/**
 * Calendar Item Detail Sheet
 *
 * Sleek right sidebar for viewing proposal, task, reminder, or event details.
 * Color-accented header, grouped info cards, and polished action buttons.
 */

import React from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  ArrowSquareOut,
  CalendarBlank,
  Clock,
  Tag,
  FileText,
  CheckSquare,
  Bell,
  User,
  MapPin,
  CurrencyDollar,
  Buildings,
  Trash,
  PencilSimple,
} from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useProposal } from '@/hooks/queries/useProposals';
import { cn } from '@/lib/utils';
import type { UnifiedCalendarItem } from '@/lib/types/calendarEvents';
import { CALENDAR_SOURCE_LABELS } from '@/lib/types/calendarEvents';

interface CalendarItemDetailSheetProps {
  item: UnifiedCalendarItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const SOURCE_ICONS: Record<string, React.ElementType> = {
  proposal: FileText,
  task_deadline: CheckSquare,
  reminder: Bell,
  calendar_event: CalendarBlank,
};

export const CalendarItemDetailSheet: React.FC<CalendarItemDetailSheetProps> = ({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const navigate = useNavigate();

  const proposalId = item?.source === 'proposal' ? item.sourceId : undefined;
  const { data: proposal, isLoading: proposalLoading } = useProposal(
    proposalId || '',
    !!proposalId,
  );

  if (!item) return null;

  const SourceIcon = SOURCE_ICONS[item.source] || CalendarBlank;

  const handleNavigate = () => {
    if (item.linkUrl) {
      navigate(item.linkUrl);
      onOpenChange(false);
    }
  };

  const formattedDate = (() => {
    try {
      return format(parseISO(item.date), 'EEEE, MMMM d, yyyy');
    } catch {
      return item.date;
    }
  })();

  const formattedTime = (() => {
    if (item.allDay) return null;
    try {
      const start = parseISO(item.date);
      const startStr = format(start, 'h:mm a');
      if (item.endDate) {
        const end = parseISO(item.endDate);
        return `${startStr} – ${format(end, 'h:mm a')}`;
      }
      return startStr;
    } catch {
      return null;
    }
  })();

  const formattedEndDate = (() => {
    if (!item.endDate || !item.allDay) return null;
    try {
      return format(parseISO(item.endDate), 'EEEE, MMMM d, yyyy');
    } catch {
      return item.endDate;
    }
  })();

  const hasActions =
    item.linkUrl || (item.source === 'calendar_event' && (onEdit || onDelete));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[420px] w-[420px] p-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
      >
        {/* ── Color accent strip ── */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{ background: item.color }}
        />

        {/* ── Header ── */}
        <SheetHeader className="px-6 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase"
              style={{
                backgroundColor: `${item.color}15`,
                color: item.color,
              }}
            >
              <SourceIcon size={12} weight="bold" />
              {CALENDAR_SOURCE_LABELS[item.source]}
            </span>
            {item.status && (
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                  item.status === 'Won' ||
                    item.status === 'Done' ||
                    item.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : item.status === 'Submitted' ||
                        item.status === 'In Progress' ||
                        item.status === 'Pending'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                )}
              >
                {item.status}
              </span>
            )}
          </div>

          <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
            {item.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {CALENDAR_SOURCE_LABELS[item.source]} details
          </SheetDescription>
        </SheetHeader>

        {/* ── Content ── */}
        <div className="px-6 pb-6 space-y-5">
          {/* Date / time card */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3">
            <MetaRow icon={CalendarBlank} label="Date" value={formattedDate} />
            {formattedTime && (
              <MetaRow icon={Clock} label="Time" value={formattedTime} />
            )}
            {formattedEndDate && (
              <MetaRow
                icon={CalendarBlank}
                label="End Date"
                value={formattedEndDate}
              />
            )}
            {item.allDay && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 uppercase tracking-wider">
                  All Day
                </span>
              </div>
            )}
          </div>

          {/* Event type (calendar events only) */}
          {item.source === 'calendar_event' && item.calendarEvent && (
            <div className="flex items-center gap-2.5 px-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.calendarEvent.event_type}
              </span>
            </div>
          )}

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {/* ── Proposal details ── */}
          {item.source === 'proposal' && (
            <>
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Proposal Details
                </p>
              </div>

              {proposalLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ) : proposal ? (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4 space-y-3">
                  {proposal.proposal_number && (
                    <MetaRow
                      icon={FileText}
                      label="Proposal #"
                      value={proposal.proposal_number}
                    />
                  )}
                  {proposal.client_name && (
                    <MetaRow
                      icon={User}
                      label="Client"
                      value={proposal.client_name}
                    />
                  )}
                  {proposal.client_company && (
                    <MetaRow
                      icon={Buildings}
                      label="Company"
                      value={proposal.client_company}
                    />
                  )}
                  {proposal.job_location && (
                    <MetaRow
                      icon={MapPin}
                      label="Location"
                      value={proposal.job_location}
                    />
                  )}
                  {proposal.total_value != null && (
                    <MetaRow
                      icon={CurrencyDollar}
                      label="Value"
                      value={`$${Number(proposal.total_value).toLocaleString()}`}
                    />
                  )}
                  {proposal.document_type && (
                    <MetaRow
                      icon={Tag}
                      label="Type"
                      value={proposal.document_type}
                    />
                  )}
                </div>
              ) : null}
            </>
          )}

          {/* ── Task details ── */}
          {item.source === 'task_deadline' && item.status && (
            <>
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Task Details
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4">
                <MetaRow icon={CheckSquare} label="Status" value={item.status} />
              </div>
            </>
          )}

          {/* ── Reminder details ── */}
          {item.source === 'reminder' && item.status && (
            <>
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Reminder Details
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4">
                <MetaRow icon={Bell} label="Status" value={item.status} />
              </div>
            </>
          )}

          {/* ── Actions ── */}
          {hasActions && (
            <div className="pt-3 space-y-2">
              {item.source === 'calendar_event' && onEdit && (
                <button
                  onClick={onEdit}
                  disabled={isDeleting}
                  className={cn(
                    'w-full h-10 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                    'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100',
                    'text-white dark:text-gray-900',
                    'active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <PencilSimple size={15} weight="bold" />
                  Edit Event
                </button>
              )}
              {item.linkUrl && (
                <button
                  onClick={handleNavigate}
                  className={cn(
                    'w-full h-10 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                    item.source === 'calendar_event'
                      ? 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900',
                    'active:scale-[0.98]',
                  )}
                >
                  <ArrowSquareOut size={15} weight="bold" />
                  View Full Details
                </button>
              )}
              {item.source === 'calendar_event' && onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className={cn(
                    'w-full h-10 rounded-xl text-sm font-medium transition-all inline-flex items-center justify-center gap-2',
                    'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20',
                    'active:scale-[0.98]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  <Trash size={15} weight="bold" />
                  {isDeleting ? 'Deleting...' : 'Delete Event'}
                </button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Meta Row — icon + label + value, used inside info cards
// ─────────────────────────────────────────────────────────────────────────────

interface MetaRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

const MetaRow: React.FC<MetaRowProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <Icon size={14} className="text-gray-500 dark:text-gray-400" />
    </div>
    <div className="min-w-0 flex-1 pt-0.5">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider block leading-none mb-1">
        {label}
      </span>
      <span className="text-sm text-gray-900 dark:text-white font-medium block break-words leading-snug">
        {value}
      </span>
    </div>
  </div>
);
