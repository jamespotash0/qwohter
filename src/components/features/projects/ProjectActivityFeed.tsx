/**
 * Project Activity Feed
 *
 * What happened on this job, and what someone wanted the next person to know.
 *
 * Notes and system events share one timeline rather than living in separate
 * panels, because the question a PM opens a project to answer — "where is this
 * and what changed" — is answered by both at once. A note saying the client
 * moved the install only makes sense beside the delivery that arrived the day
 * before.
 *
 * Pinned notes lead regardless of age. Dock hours, elevator bookings, and
 * certificate-of-insurance requirements stay relevant for months, and burying
 * them under a week of status updates is how an install day gets lost.
 */

import { useState } from 'react';
import {
  PushPin,
  PushPinSlash,
  Trash,
  Note,
  ShoppingCart,
  Storefront,
  CheckCircle,
  Truck,
  ArrowsClockwise,
  Wrench,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useProjectActivity,
  useCreateProjectNote,
  useSetNotePinned,
  useDeleteProjectNote,
  type ProjectActivity,
} from '@/hooks/queries/useProjectHub';
import { cn } from '@/lib/utils';

const KIND_META: Record<
  string,
  { icon: typeof Note; tone: string; ring: string }
> = {
  note: { icon: Note, tone: 'text-gray-500', ring: 'bg-gray-100 dark:bg-gray-800' },
  order_created: {
    icon: ShoppingCart,
    tone: 'text-blue-600 dark:text-blue-400',
    ring: 'bg-blue-50 dark:bg-blue-900/20',
  },
  order_placed: {
    icon: Storefront,
    tone: 'text-indigo-600 dark:text-indigo-400',
    ring: 'bg-indigo-50 dark:bg-indigo-900/20',
  },
  acknowledgment: {
    icon: CheckCircle,
    tone: 'text-amber-600 dark:text-amber-400',
    ring: 'bg-amber-50 dark:bg-amber-900/20',
  },
  delivery: {
    icon: Truck,
    tone: 'text-cyan-600 dark:text-cyan-400',
    ring: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
  change_order: {
    icon: ArrowsClockwise,
    tone: 'text-violet-600 dark:text-violet-400',
    ring: 'bg-violet-50 dark:bg-violet-900/20',
  },
  work_order: {
    icon: Wrench,
    tone: 'text-emerald-600 dark:text-emerald-400',
    ring: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
};

/** "3 days ago" — precise enough for a feed, without a date library. */
function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface ProjectActivityFeedProps {
  organizationId: string;
  projectId: string;
}

export function ProjectActivityFeed({
  organizationId,
  projectId,
}: ProjectActivityFeedProps) {
  const { data: activity = [], isLoading } = useProjectActivity(projectId);
  const createNote = useCreateProjectNote();
  const setPinned = useSetNotePinned();
  const deleteNote = useDeleteProjectNote();

  const [body, setBody] = useState('');
  const [pinned, setPinnedInput] = useState(false);

  const handlePost = async () => {
    if (!body.trim()) return;
    try {
      await createNote.mutateAsync({
        organization_id: organizationId,
        project_id: projectId,
        body,
        is_pinned: pinned,
      });
      setBody('');
      setPinnedInput(false);
    } catch {
      // Surfaced as a toast by the mutation hook.
    }
  };

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What should the next person know? Access codes, a moved date, what the client said on site…"
          rows={3}
          className="resize-none border-0 p-0 shadow-none focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700/50 pt-2">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <Checkbox
              checked={pinned}
              onCheckedChange={value => setPinnedInput(value === true)}
            />
            Pin to the top — for things that stay true
          </label>
          <Button
            size="sm"
            onClick={handlePost}
            disabled={!body.trim() || createNote.isPending}
          >
            {createNote.isPending ? 'Saving…' : 'Add note'}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center text-sm text-gray-500">
          Nothing has happened on this project yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {activity.map(item => (
            <ActivityRow
              key={`${item.reference_type}-${item.reference_id}-${item.occurred_at}`}
              item={item}
              projectId={projectId}
              onPin={(noteId, isPinned) => setPinned.mutate({ noteId, isPinned })}
              onDelete={noteId => deleteNote.mutate({ noteId, projectId })}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

interface ActivityRowProps {
  item: ProjectActivity;
  projectId: string;
  onPin: (noteId: string, isPinned: boolean) => void;
  onDelete: (noteId: string) => void;
}

function ActivityRow({ item, onPin, onDelete }: ActivityRowProps) {
  const meta = KIND_META[item.kind ?? 'note'] ?? KIND_META.note!;
  const Icon = meta.icon;
  const isNote = item.kind === 'note';
  const isPinned = item.is_pinned === true;

  return (
    <li
      className={cn(
        'group flex gap-3 rounded-lg border p-3',
        isPinned
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          meta.ring
        )}
      >
        <Icon className={cn('h-4 w-4', meta.tone)} weight={isPinned ? 'fill' : 'regular'} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.title}
          </p>
          <span className="text-xs text-gray-400">
            {relativeTime(item.occurred_at)}
          </span>
        </div>
        {item.detail && (
          <p
            className={cn(
              'mt-0.5 text-sm text-gray-600 dark:text-gray-300',
              isNote && 'whitespace-pre-wrap'
            )}
          >
            {item.detail}
          </p>
        )}
      </div>

      {isNote && item.reference_id && (
        <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onPin(item.reference_id as string, !isPinned)}
            aria-label={isPinned ? 'Unpin this note' : 'Pin this note'}
          >
            {isPinned ? (
              <PushPinSlash className="h-4 w-4 text-gray-500" />
            ) : (
              <PushPin className="h-4 w-4 text-gray-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onDelete(item.reference_id as string)}
            aria-label="Delete this note"
          >
            <Trash className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )}
    </li>
  );
}

export default ProjectActivityFeed;
