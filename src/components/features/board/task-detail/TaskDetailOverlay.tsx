/**
 * TaskDetailOverlay Component (Condensed Design)
 *
 * A sleek overlay panel for viewing and editing task details.
 * Compact inline properties, description, attachments, and nested comments.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { cn, parseLocalDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  X,
  Trash,
  Flag,
  FolderOpen,
  Check,
  CalendarBlank,
  Clock,
  ChatCircle,
  Paperclip,
  ArrowSquareOut,
  PaperPlaneTilt,
  File,
  DownloadSimple,
  Plus,
} from '@phosphor-icons/react';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { MentionInput } from './MentionInput';
import { TaskCommentItem } from './TaskCommentItem';
import type { ProjectTask, TaskPriority } from '@/lib/types/projectTasks';
import type { TaskBoardColumn } from '@/lib/types/taskBoardColumns';
import type { TaskComment, TaskAttachment, MentionSuggestion } from '@/lib/types/taskComments';
import { TASK_PRIORITY_LABELS } from '@/lib/types/projectTasks';

// =============================================================================
// Types
// =============================================================================

interface ProjectOption {
  id: string;
  proposal_id?: string | null;
  proposal?: {
    project_name?: string | null;
    proposal_number?: string | null;
  } | null;
}

interface Member {
  user_id: string;
  full_name?: string | null;
  email?: string;
  status: string;
}

interface TaskDetailOverlayProps {
  task: ProjectTask;
  columns: TaskBoardColumn[];
  members: Member[];
  projects: ProjectOption[];
  currentUserId?: string;
  organizationId: string;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<ProjectTask>) => Promise<void>;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  onLinkProject: (taskId: string, projectId: string | null) => Promise<void>;
  comments?: TaskComment[];
  isLoadingComments?: boolean;
  onAddComment?: (content: string, mentions: string[], parentId?: string) => void;
  onEditComment?: (commentId: string, content: string, mentions: string[]) => void;
  onDeleteComment?: (commentId: string) => void;
  attachments?: TaskAttachment[];
  isLoadingAttachments?: boolean;
  isUploadingAttachment?: boolean;
  onUploadAttachment?: (file: File) => void;
  onDeleteAttachment?: (attachment: TaskAttachment) => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function CompactSelect({
  icon: Icon,
  iconColor,
  iconWeight,
  value,
  placeholder,
  children,
  onValueChange,
  className,
}: {
  icon?: React.ElementType;
  iconColor?: string;
  iconWeight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  value: string;
  placeholder?: string;
  children: React.ReactNode;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          'h-7 text-xs border-0 bg-gray-100 hover:bg-gray-200 px-2 gap-1.5 rounded-md',
          'focus:ring-1 focus:ring-gray-300',
          className
        )}
      >
        {Icon && <Icon weight={iconWeight} className={cn('w-3.5 h-3.5', iconColor || 'text-gray-500')} />}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function AttachmentChip({
  attachment,
  onDelete,
}: {
  attachment: TaskAttachment;
  onDelete?: () => void;
}) {
  const isImage = attachment.attachment_type === 'image';
  const fileSize = attachment.file_size
    ? attachment.file_size < 1024 * 1024
      ? `${Math.round(attachment.file_size / 1024)}KB`
      : `${(attachment.file_size / (1024 * 1024)).toFixed(1)}MB`
    : '';

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
      {isImage ? (
        <div className="w-6 h-6 rounded overflow-hidden bg-gray-200 flex-shrink-0">
          <img src={attachment.file_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
      )}
      <span className="text-xs text-gray-600 truncate max-w-[120px]">{attachment.file_name}</span>
      <span className="text-[10px] text-gray-400">{fileSize}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={attachment.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-0.5 hover:bg-gray-200 rounded text-gray-400"
        >
          <DownloadSimple className="w-3 h-3" />
        </a>
        {onDelete && (
          <button onClick={onDelete} className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TaskDetailOverlay({
  task,
  columns,
  members,
  projects,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
  onLinkProject,
  comments = [],
  isLoadingComments = false,
  onAddComment,
  onEditComment,
  onDeleteComment,
  attachments = [],
  isLoadingAttachments = false,
  isUploadingAttachment = false,
  onUploadAttachment,
  onDeleteAttachment,
}: TaskDetailOverlayProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority | null>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [assignee, setAssignee] = useState(task.assigned_to || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionChanged, setDescriptionChanged] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentMentions, setNewCommentMentions] = useState<string[]>([]);

  // Sync local state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.due_date || '');
    setAssignee(task.assigned_to || '');
    setDescriptionChanged(false);
  }, [task.id]);

  const activeMembers = members.filter((m) => m.status === 'Active');

  const mentionSuggestions: MentionSuggestion[] = useMemo(() => {
    return activeMembers.map((m) => ({
      id: m.user_id,
      display: m.full_name || m.email || 'Unknown',
      email: m.email,
    }));
  }, [activeMembers]);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSave = async (field: string, value: unknown) => {
    setIsSaving(true);
    try {
      await onUpdate(task.id, { [field]: value || null });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleSave = async () => {
    if (title.trim() && title !== task.title) {
      await handleSave('title', title.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setDescriptionChanged(value !== (task.description || ''));
  };

  const handleDescriptionSave = async () => {
    if (description !== (task.description || '')) {
      await handleSave('description', description.trim() || null);
      setDescriptionChanged(false);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim(), newCommentMentions);
      setNewComment('');
      setNewCommentMentions([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadAttachment) {
      onUploadAttachment(file);
    }
    e.target.value = '';
  };

  const linkedProject = task.project_id ? projects.find((p) => p.id === task.project_id) : null;
  const proposalId = linkedProject?.proposal_id || task.project?.proposal_id;

  const getDueDateInfo = () => {
    if (!dueDate) return null;
    const date = parseLocalDate(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const isDueToday = isToday(date);
    const isDueTomorrow = isTomorrow(date);
    return {
      isOverdue,
      isDueToday,
      isDueTomorrow,
      label: isOverdue
        ? 'Overdue'
        : isDueToday
        ? 'Today'
        : isDueTomorrow
        ? 'Tomorrow'
        : format(date, 'MMM d'),
    };
  };

  const dueDateInfo = getDueDateInfo();

  // Group top-level comments (no parent) and nest replies
  const topLevelComments = useMemo(() => {
    return comments.filter((c) => !c.parent_id);
  }, [comments]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[480px] max-w-[95vw] z-50',
          'bg-white shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Header - Compact */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3">
          {/* Top row: Status + Reference + Actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Status dropdown */}
              <CompactSelect
                value={task.status}
                onValueChange={(value) => onStatusChange(task.id, value)}
                className="w-auto min-w-[90px]"
              >
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.slug}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-xs">{col.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </CompactSelect>
              {task.reference && (
                <span className="text-[11px] font-mono text-gray-400 uppercase">
                  {task.reference}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Title */}
          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') {
                  setTitle(task.title);
                  setIsEditingTitle(false);
                }
              }}
              onBlur={handleTitleSave}
              className="text-base font-semibold border-0 px-0 shadow-none focus-visible:ring-0 h-auto py-0"
              autoFocus
            />
          ) : (
            <h2
              className="text-base font-semibold text-gray-900 cursor-text hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
              onClick={() => setIsEditingTitle(true)}
            >
              {task.title}
            </h2>
          )}

          {/* Inline Properties Row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {/* Priority */}
            <CompactSelect
              value={priority || 'low'}
              onValueChange={(value) => {
                const newPriority = value as TaskPriority;
                setPriority(newPriority);
                handleSave('priority', newPriority);
              }}
              className="w-auto min-w-[80px]"
            >
              {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-1.5">
                    <Flag
                      weight="fill"
                      className={cn(
                        'w-3 h-3',
                        p === 'high' ? 'text-red-500' : p === 'medium' ? 'text-amber-500' : 'text-gray-400'
                      )}
                    />
                    <span className="text-xs">{TASK_PRIORITY_LABELS[p]}</span>
                  </div>
                </SelectItem>
              ))}
            </CompactSelect>

            {/* Assignee */}
            <Select
              value={assignee || 'unassigned'}
              onValueChange={(value) => {
                const newValue = value === 'unassigned' ? '' : value;
                setAssignee(newValue);
                handleSave('assigned_to', newValue || null);
              }}
            >
              <SelectTrigger
                className={cn(
                  'h-7 text-xs border-0 bg-gray-100 hover:bg-gray-200 px-2 gap-1.5 rounded-md',
                  'focus:ring-1 focus:ring-gray-300 w-auto min-w-[100px] max-w-[140px]'
                )}
              >
                <Avatar className="h-4 w-4 flex-shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[7px]">
                    {assignee ? getInitials(activeMembers.find((m) => m.user_id === assignee)?.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-xs text-gray-400">Unassigned</span>
                </SelectItem>
                {activeMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <span className="text-xs truncate">{member.full_name || member.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due Date */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'h-7 px-2 text-xs rounded-md flex items-center gap-1.5',
                    'bg-gray-100 hover:bg-gray-200 transition-colors',
                    dueDateInfo?.isOverdue && 'bg-red-100 text-red-700 hover:bg-red-200',
                    dueDateInfo?.isDueToday && 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  )}
                >
                  <CalendarBlank className="w-3.5 h-3.5" />
                  <span>{dueDateInfo?.label || 'No date'}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    handleSave('due_date', e.target.value || null);
                  }}
                  className="h-8 text-sm"
                />
                {dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 h-7 text-xs text-gray-500"
                    onClick={() => {
                      setDueDate('');
                      handleSave('due_date', null);
                    }}
                  >
                    Clear date
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* Project */}
            <div className="flex items-center gap-0.5">
              <CompactSelect
                icon={FolderOpen}
                iconColor="text-purple-500"
                value={task.project_id || 'none'}
                onValueChange={(value) => {
                  const newProjectId = value === 'none' ? null : value;
                  onLinkProject(task.id, newProjectId);
                }}
                className="w-auto min-w-[100px] max-w-[150px]"
              >
                <SelectItem value="none">
                  <span className="text-xs text-gray-400">No project</span>
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <span className="text-xs truncate">{project.proposal?.project_name || 'Unnamed'}</span>
                  </SelectItem>
                ))}
              </CompactSelect>
              {task.project_id && proposalId && (
                <button
                  onClick={() => navigate(`/proposals/${proposalId}/edit`)}
                  className="p-1 hover:bg-purple-100 rounded text-purple-600"
                >
                  <ArrowSquareOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Scrollable Content */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-5">
            {/* Description with inline attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
                {descriptionChanged && (
                  <Button
                    size="sm"
                    onClick={handleDescriptionSave}
                    disabled={isSaving}
                    className="h-6 text-[10px] gap-1 px-2"
                  >
                    <Check className="w-3 h-3" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                )}
              </div>

              {/* Description box with + button inside */}
              <div className="relative">
                <Textarea
                  placeholder="What's this task about?"
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  className="min-h-[80px] resize-none text-sm bg-gray-50 border-gray-200 focus:bg-white pb-8 rounded-md"
                />

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />

                {/* + button with dropdown - bottom right inside textarea */}
                <div className="absolute bottom-2 right-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        disabled={isUploadingAttachment}
                        className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 bg-gray-100 rounded transition-colors"
                        title="Add attachment"
                      >
                        {isUploadingAttachment ? (
                          <div className="animate-spin w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-1" align="end">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                        Attach file
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Attachments display - below textarea */}
              {(attachments.length > 0 || isUploadingAttachment) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {attachments.map((attachment) => (
                    <AttachmentChip
                      key={attachment.id}
                      attachment={attachment}
                      onDelete={() => onDeleteAttachment?.(attachment)}
                    />
                  ))}
                  {isUploadingAttachment && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 border border-blue-200">
                      <div className="animate-spin w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full" />
                      <span className="text-[10px] text-blue-600">Uploading...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <ChatCircle className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Comments {topLevelComments.length > 0 && `(${topLevelComments.length})`}
                </span>
              </div>

              {/* New Comment Input */}
              <div className="flex gap-2 mb-4">
                <Avatar className="h-6 w-6 flex-shrink-0 mt-1">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[8px]">
                    {getInitials(activeMembers.find((m) => m.user_id === currentUserId)?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                  <MentionInput
                    value={newComment}
                    onChange={(val, mentions) => {
                      setNewComment(val);
                      setNewCommentMentions(mentions);
                    }}
                    members={mentionSuggestions}
                    placeholder="Leave a note or @mention someone..."
                    minRows={1}
                    onSubmit={handleAddComment}
                    className="text-sm pr-16"
                  />
                  {/* Action buttons - bottom right inside input */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          disabled={isUploadingAttachment}
                          className="h-5 w-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 bg-gray-100 rounded transition-colors"
                          title="Attach file"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="end">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingAttachment}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                          Attach file
                        </button>
                      </PopoverContent>
                    </Popover>
                    {newComment.trim() && (
                      <button
                        onClick={handleAddComment}
                        className="h-5 w-5 flex items-center justify-center text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
                      >
                        <PaperPlaneTilt className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments List */}
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                </div>
              ) : topLevelComments.length > 0 ? (
                <div className="space-y-4">
                  {topLevelComments.map((comment) => (
                    <TaskCommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      members={mentionSuggestions}
                      onEdit={(commentId, content, mentions) => {
                        onEditComment?.(commentId, content, mentions);
                      }}
                      onDelete={(commentId) => {
                        onDeleteComment?.(commentId);
                      }}
                      onReply={(parentId, content, mentions) => {
                        onAddComment?.(content, mentions, parentId);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">No comments yet</p>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Footer */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center text-[10px] text-gray-400">
            <Clock className="w-3 h-3 mr-1" />
            Created {format(new Date(task.created_at), 'MMM d, yyyy')}
            {task.creator && <span className="ml-1">by {task.creator.full_name || task.creator.email}</span>}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          onDelete(task.id);
          setShowDeleteDialog(false);
          onClose();
        }}
        title="Delete Task"
        description="This action cannot be undone. This task will be permanently deleted."
        itemName={task.title}
      />
    </>
  );
}
