/**
 * TaskCommentItem Component
 *
 * Displays a single comment with edit/delete actions and replies.
 */

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
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
}

export function TaskCommentItem({
  comment,
  currentUserId,
  members,
  onEdit,
  onDelete,
  onReply,
  isReply = false,
}: TaskCommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editMentions, setEditMentions] = useState<string[]>(comment.mentions || []);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyMentions, setReplyMentions] = useState<string[]>([]);

  const isOwner = currentUserId === comment.user_id;

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

  // Render content with styled mentions
  const renderContent = useMemo(() => {
    const content = isEditing ? editContent : comment.content;
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
            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-semibold text-[13px] cursor-default"
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

  return (
    <div className={cn('group', isReply ? 'ml-10 mt-3' : '')}>
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar
          className={cn(
            'ring-2 ring-white shadow-sm flex-shrink-0',
            isReply ? 'h-7 w-7' : 'h-8 w-8'
          )}
        >
          <AvatarFallback
            className={cn(
              'font-medium',
              isReply ? 'text-[9px]' : 'text-[10px]',
              'bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700'
            )}
          >
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('font-semibold text-gray-900', isReply ? 'text-[13px]' : 'text-sm')}>
              {displayName}
            </span>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-gray-400 italic">(edited)</span>
            )}
          </div>

          {/* Comment body */}
          {isEditing ? (
            <div className="space-y-2">
              <MentionInput
                value={editContent}
                onChange={(val, mentions) => {
                  setEditContent(val);
                  setEditMentions(mentions);
                }}
                members={members}
                minRows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="h-7 text-xs"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'text-gray-700 whitespace-pre-wrap break-words',
                isReply ? 'text-[13px] leading-relaxed' : 'text-sm leading-relaxed'
              )}
            >
              {renderContent}
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-2">
              {/* Reply button (only for top-level comments) */}
              {!isReply && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  <ChatCircle className="w-3.5 h-3.5" />
                  Reply
                </button>
              )}

              {/* Edit/Delete menu (only for owner) */}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all">
                      <DotsThree className="w-4 h-4 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-32">
                    <DropdownMenuItem
                      onClick={() => setIsEditing(true)}
                      className="gap-2 text-sm"
                    >
                      <PencilSimple className="w-3.5 h-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="gap-2 text-sm text-red-600 focus:text-red-600"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3 space-y-2">
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
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim()}
                  className="h-7 text-xs"
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
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <TaskCommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  members={members}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
