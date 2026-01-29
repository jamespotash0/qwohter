/**
 * Calendar Item Detail Sheet
 *
 * Right sidebar that opens when clicking on a proposal, task, or reminder
 * in the calendar. Shows item details and a link to the full view.
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
} from '@phosphor-icons/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
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

  // Fetch proposal details if the item is a proposal
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
      const date = parseISO(item.date);
      return item.allDay
        ? format(date, 'EEEE, MMMM d, yyyy')
        : format(date, 'EEEE, MMMM d, yyyy · h:mm a');
    } catch {
      return item.date;
    }
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[420px] w-[420px] p-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
      >
        <SheetHeader className="p-6 pb-4">
          {/* Source badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${item.color}15`,
                color: item.color,
              }}
            >
              <SourceIcon size={13} weight="bold" />
              {CALENDAR_SOURCE_LABELS[item.source]}
            </span>
            {item.status && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                  item.status === 'Won' || item.status === 'Done' || item.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : item.status === 'Submitted' || item.status === 'In Progress' || item.status === 'Pending'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                )}
              >
                {item.status}
              </span>
            )}
          </div>

          <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            {item.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {CALENDAR_SOURCE_LABELS[item.source]} details
          </SheetDescription>
        </SheetHeader>

        {/* ── Details ── */}
        <div className="px-6 space-y-5 pb-6">
          {/* Date section */}
          <DetailRow
            icon={CalendarBlank}
            label="Date"
            value={formattedDate}
          />

          {item.endDate && (
            <DetailRow
              icon={Clock}
              label="End"
              value={(() => {
                try {
                  const end = parseISO(item.endDate);
                  return item.allDay
                    ? format(end, 'EEEE, MMMM d, yyyy')
                    : format(end, 'EEEE, MMMM d, yyyy · h:mm a');
                } catch {
                  return item.endDate;
                }
              })()}
            />
          )}

          {item.description && (
            <DetailRow
              icon={Tag}
              label="Description"
              value={item.description}
            />
          )}

          {/* ── Calendar event type ── */}
          {item.source === 'calendar_event' && item.calendarEvent && (
            <DetailRow
              icon={CalendarBlank}
              label="Event Type"
              value={item.calendarEvent.event_type}
            />
          )}

          {/* ── Proposal-specific details ── */}
          {item.source === 'proposal' && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Proposal Details
                </span>
              </div>

              {proposalLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ) : proposal ? (
                <div className="space-y-3">
                  {proposal.proposal_number && (
                    <DetailRow
                      icon={FileText}
                      label="Proposal #"
                      value={proposal.proposal_number}
                    />
                  )}
                  {proposal.client_name && (
                    <DetailRow
                      icon={User}
                      label="Client"
                      value={proposal.client_name}
                    />
                  )}
                  {proposal.client_company && (
                    <DetailRow
                      icon={Buildings}
                      label="Company"
                      value={proposal.client_company}
                    />
                  )}
                  {proposal.job_location && (
                    <DetailRow
                      icon={MapPin}
                      label="Location"
                      value={proposal.job_location}
                    />
                  )}
                  {proposal.total_value != null && (
                    <DetailRow
                      icon={CurrencyDollar}
                      label="Value"
                      value={`$${Number(proposal.total_value).toLocaleString()}`}
                    />
                  )}
                  {proposal.document_type && (
                    <DetailRow
                      icon={Tag}
                      label="Type"
                      value={proposal.document_type}
                    />
                  )}
                </div>
              ) : null}
            </>
          )}

          {/* ── Task-specific details ── */}
          {item.source === 'task_deadline' && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Task Details
                </span>
              </div>
              <DetailRow
                icon={CheckSquare}
                label="Status"
                value={item.status}
              />
            </>
          )}

          {/* ── Reminder-specific details ── */}
          {item.source === 'reminder' && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Reminder Details
                </span>
              </div>
              <DetailRow
                icon={Bell}
                label="Status"
                value={item.status}
              />
            </>
          )}

          {/* ── Action buttons ── */}
          {(item.linkUrl || (item.source === 'calendar_event' && (onEdit || onDelete))) && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-2">
              {item.source === 'calendar_event' && onEdit && (
                <Button
                  onClick={onEdit}
                  disabled={isDeleting}
                  className="w-full h-10 gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm"
                >
                  Edit Event
                </Button>
              )}
              {item.linkUrl && (
                <Button
                  onClick={handleNavigate}
                  variant={item.source === 'calendar_event' ? 'outline' : 'default'}
                  className={cn(
                    'w-full h-10 gap-2 rounded-xl font-medium text-sm',
                    item.source !== 'calendar_event' && 'bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900',
                  )}
                >
                  <ArrowSquareOut size={16} weight="bold" />
                  View Full Details
                </Button>
              )}
              {item.source === 'calendar_event' && onDelete && (
                <Button
                  onClick={onDelete}
                  disabled={isDeleting}
                  variant="ghost"
                  className="w-full h-10 gap-2 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium text-sm"
                >
                  <Trash size={16} weight="bold" />
                  {isDeleting ? 'Deleting...' : 'Delete Event'}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Detail Row
// ─────────────────────────────────────────────────────────────────────────────

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={15} className="text-gray-500 dark:text-gray-400" />
    </div>
    <div className="min-w-0 flex-1">
      <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium block">
        {label}
      </span>
      <span className="text-sm text-gray-900 dark:text-white font-medium block break-words">
        {value}
      </span>
    </div>
  </div>
);
