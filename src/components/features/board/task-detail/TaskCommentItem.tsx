/**
 * TaskCommentItem Component
 *
 * Displays a single comment with collapsible threaded replies,
 * inline edit/delete actions, and refined compact styling.
 */

import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * Format time elapsed in compact format
 * Returns formatted string and refresh interval in ms
 */
function getTimeAgo(date: Date): { text: string; interval: number } {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return { text: `${Math.max(1, diffSeconds)}s`, interval: 1000 }; // Update every second
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return { text: `${diffMinutes}m`, interval: 60000 }; // Update every minute
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return { text: `${diffHours}h`, interval: 60000 }; // Update every minute to catch hour changes
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return { text: `${diffDays}d`, interval: 3600000 }; // Update every hour
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) {
    return { text: `${diffWeeks}w`, interval: 86400000 }; // Update every day
  }

  const diffYears = Math.floor(diffDays / 365);
  return { text: `${diffYears}y`, interval: 86400000 }; // Update every day
}

/**
 * Hook for real-time updating time ago display
 */
function useTimeAgo(dateString: string): string {
  const [timeAgo, setTimeAgo] = useState(() => getTimeAgo(new Date(dateString)).text);

  useEffect(() => {
    const update = () => {
      const { text, interval } = getTimeAgo(new Date(dateString));
      setTimeAgo(text);
      return interval;
    };

    // Initial update
    let nextInterval = update();

    // Set up recurring updates with dynamic interval
    let timeoutId: NodeJS.Timeout;
    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        nextInterval = update();
        scheduleNext();
      }, nextInterval);
    };
    scheduleNext();

    return () => clearTimeout(timeoutId);
  }, [dateString]);

  return timeAgo;
}
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DotsThree,
  PencilSimple,
  Trash,
  ChatCircle,
  CaretDown,
  CaretRight,
} from '@phosphor-icons/react';
import { MentionInput } from './MentionInput';
import type { TaskComment, MentionSuggestion } from '@/lib/types/taskComments';

interface TaskCommentItemProps {
  comment: TaskComment;
  currentUserId?: string;
  members: MentionSuggestion[];
  onEdit: (commentId: string, content: string, mentions: string[]) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string, mentions: string[]) => void;
  isReply?: boolean;
  depth?: number;
}

export function TaskCommentItem({
  comment,
  currentUserId,
  members,
  onEdit,
  onDelete,
  onReply,
  isReply = false,
  depth = 0,
}: TaskCommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editMentions, setEditMentions] = useState<string[]>(comment.mentions || []);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [isThreadCollapsed, setIsThreadCollapsed] = useState(false);

  const isOwner = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const replyCount = comment.replies?.length || 0;

  // Real-time updating timestamp
  const timeAgo = useTimeAgo(comment.created_at);

  // Get display name with fallbacks
  const displayName = useMemo(() => {
    if (comment.user?.full_name && comment.user.full_name !== 'Unknown User') {
      return comment.user.full_name;
    }
    if (comment.user?.email) {
      return comment.user.email.split('@')[0];
    }
    return 'Unknown User';
  }, [comment.user]);

  // Get initials from name
  const getInitials = (name?: string | null) => {
    if (!name || name === 'Unknown User') return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on user id
  const getAvatarColor = (userId?: string) => {
    const colors = [
      'from-violet-100 to-purple-100 text-violet-700',
      'from-blue-100 to-indigo-100 text-blue-700',
      'from-emerald-100 to-teal-100 text-emerald-700',
      'from-amber-100 to-orange-100 text-amber-700',
      'from-rose-100 to-pink-100 text-rose-700',
      'from-cyan-100 to-sky-100 text-cyan-700',
    ];
    if (!userId) return colors[0];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Render content with styled mentions
  const renderContent = useMemo(() => {
    const content = isEditing ? editContent : comment.content;
    // Handle undefined/null content
    if (!content) return null;
    // Split on @mentions - matches @Name or @First Last patterns
    const mentionRegex = /(@\w+(?:\s+\w+)?)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      // Check if this part is a mention (starts with @)
      if (part.startsWith('@') && part.length > 1) {
        const name = part.slice(1); // Remove the @
        return (
          <span
            key={index}
            className="inline-flex items-center px-1 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium text-[11px] cursor-default"
            title={name}
          >
            @{name}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }, [comment.content, editContent, isEditing]);

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEdit(comment.id, editContent.trim(), editMentions);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setEditMentions(comment.mentions || []);
    setIsEditing(false);
  };

  const handleSubmitReply = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent.trim(), replyMentions);
      setReplyContent('');
      setReplyMentions([]);
      setIsReplying(false);
    }
  };

  // Calculate left margin for nested replies (max visual indentation at depth 4)
  const getMarginClass = () => {
    if (!isReply) return '';
    if (depth >= 4) return 'ml-4'; // Cap indentation at depth 4
    if (depth >= 2) return 'ml-5';
    return 'ml-6';
  };
  const marginClass = getMarginClass();

  return (
    <div className={cn('group/comment', marginClass)}>
      <div className="flex gap-2">
        {/* Avatar */}
        <Avatar
          className={cn(
            'ring-1 ring-white/80 shadow-sm flex-shrink-0',
            isReply ? 'h-5 w-5' : 'h-6 w-6'
          )}
        >
          <AvatarFallback
            className={cn(
              'font-medium bg-gradient-to-br',
              isReply ? 'text-[7px]' : 'text-[8px]',
              getAvatarColor(comment.user_id)
            )}
          >
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row - Name, Time, Reply, Menu inline */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn('font-medium text-gray-800', isReply ? 'text-[11px]' : 'text-xs')}>
              {displayName}
            </span>
            <span className="text-[10px] text-gray-400">
              {timeAgo}
            </span>
            {comment.is_edited && (
              <span className="text-[9px] text-gray-400">(edited)</span>
            )}

            {/* Inline Actions - Next to time, always visible */}
            {!isEditing && (
              <div className="flex items-center gap-0.5">
                {/* Reply button - always available for infinite nesting */}
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Reply"
                >
                  <ChatCircle className="w-3 h-3" />
                </button>

                {/* Edit/Delete menu (only for owner) */}
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <DotsThree className="w-3 h-3" weight="bold" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-24 min-w-0">
                      <DropdownMenuItem
                        onClick={() => setIsEditing(true)}
                        className="gap-1.5 text-[11px] py-1"
                      >
                        <PencilSimple className="w-3 h-3" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(comment.id)}
                        className="gap-1.5 text-[11px] py-1 text-red-600 focus:text-red-600"
                      >
                        <Trash className="w-3 h-3" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>

          {/* Comment body */}
          {isEditing ? (
            <div className="space-y-1.5 mt-1">
              <MentionInput
                value={editContent}
                onChange={(val, mentions) => {
                  setEditContent(val);
                  setEditMentions(mentions);
                }}
                members={members}
                minRows={1}
                autoFocus
                className="text-[11px]"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="h-5 text-[10px] px-2"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-5 text-[10px] px-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'text-gray-600 whitespace-pre-wrap break-words leading-relaxed',
                isReply ? 'text-[11px]' : 'text-xs'
              )}
            >
              {renderContent}
            </div>
          )}

          {/* Reply input */}
          {isReplying && (
            <div className="mt-2 space-y-1.5">
              <MentionInput
                value={replyContent}
                onChange={(val, mentions) => {
                  setReplyContent(val);
                  setReplyMentions(mentions);
                }}
                members={members}
                placeholder="Write a reply..."
                minRows={1}
                autoFocus
                onSubmit={handleSubmitReply}
                className="text-[11px]"
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="h-5 text-[10px] px-2"
                >
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                  className="h-5 text-[10px] px-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Threaded Replies with Collapse Toggle */}
          {hasReplies && (
            <div className="mt-2">
              {/* Thread collapse toggle */}
              <button
                onClick={() => setIsThreadCollapsed(!isThreadCollapsed)}
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors mb-1.5 py-0.5"
              >
                {isThreadCollapsed ? (
                  <>
                    <CaretRight className="w-3 h-3" weight="bold" />
                    <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                  </>
                ) : (
                  <>
                    <CaretDown className="w-3 h-3" weight="bold" />
                    <span>Hide {replyCount === 1 ? 'reply' : 'replies'}</span>
                  </>
                )}
              </button>

              {/* Replies */}
              {!isThreadCollapsed && (
                <div className="space-y-2 pt-1">
                  {comment.replies!.map((reply) => (
                    <TaskCommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      members={members}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReply={onReply}
                      isReply
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
