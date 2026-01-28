/**
 * TaskDetailOverlay Component
 *
 * A refined overlay panel for viewing and editing task details.
 * Features compact inline properties, collapsible comments with threads,
 * and a clean, minimal aesthetic.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
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
  CaretDown,
  CaretRight,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { TaskDeleteDialog } from './TaskDeleteDialog';
import { MentionInput } from './MentionInput';
import { TaskCommentItem } from './TaskCommentItem';
import { ReminderPicker } from './ReminderPicker';
import type { ProjectTask, TaskPriority } from '@/lib/types/projectTasks';
import type { TaskBoardColumn } from '@/lib/types/taskBoardColumns';
import type { TaskComment, TaskAttachment, TaskActivity, MentionSuggestion } from '@/lib/types/taskComments';
// import type { ScheduledNotificationRecurrence } from '@/lib/types/scheduledNotifications';
import { TASK_PRIORITY_LABELS } from '@/lib/types/projectTasks';
import {
  getTaskReminder,
  scheduleTaskReminder,
  cancelTaskReminder,
  type TaskReminder,
} from '@/services/scheduledNotificationsService';

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
  activities?: TaskActivity[];
  isLoadingActivities?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

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
    <div className="group flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
      {isImage ? (
        <div className="w-5 h-5 rounded overflow-hidden bg-gray-200 flex-shrink-0">
          <img src={attachment.file_url} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <File className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      )}
      <span className="text-[10px] text-gray-600 truncate max-w-[100px]">{attachment.file_name}</span>
      <span className="text-[9px] text-gray-400">{fileSize}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={attachment.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-0.5 hover:bg-gray-200 rounded text-gray-400"
        >
          <DownloadSimple className="w-2.5 h-2.5" />
        </a>
        {onDelete && (
          <button onClick={onDelete} className="p-0.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500">
            <X className="w-2.5 h-2.5" />
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
  organizationId,
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
  isUploadingAttachment = false,
  onUploadAttachment,
  onDeleteAttachment,
  activities = [],
  isLoadingActivities = false,
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
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(false);
  const [isAttachmentsCollapsed, setIsAttachmentsCollapsed] = useState(false);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(true); // Collapsed by default
  const [taskReminder, setTaskReminder] = useState<TaskReminder | null>(null);
  const [isLoadingReminder, setIsLoadingReminder] = useState(false);
  const [descriptionDragOver, setDescriptionDragOver] = useState(false);
  const [commentDragOver, setCommentDragOver] = useState(false);

  // Sync local state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.due_date || '');
    setAssignee(task.assigned_to || '');
    setDescriptionChanged(false);
  }, [task.id, task.title, task.description, task.priority, task.due_date, task.assigned_to]);

  // Fetch reminder from scheduled_notifications when task changes
  useEffect(() => {
    const fetchReminder = async () => {
      setIsLoadingReminder(true);
      try {
        const reminder = await getTaskReminder(task.id);
        setTaskReminder(reminder);
      } catch (error) {
        console.error('Failed to fetch task reminder:', error);
        setTaskReminder(null);
      } finally {
        setIsLoadingReminder(false);
      }
    };

    fetchReminder();
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
      // Only convert empty strings to null, preserve false/0 as valid values
      const normalizedValue = value === '' ? null : value;
      await onUpdate(task.id, { [field]: normalizedValue });
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

  // Drag-and-drop file upload handlers
  const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileDrop = (e: React.DragEvent, setDragOver: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (!onUploadAttachment) return;

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.size <= MAX_FILE_SIZE && ALLOWED_FILE_TYPES.includes(file.type)) {
        onUploadAttachment(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent, setDragOver: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent, setDragOver: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
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

  // Group top-level comments (no parent)
  const topLevelComments = useMemo(() => {
    return comments.filter((c) => !c.parent_id);
  }, [comments]);

  const totalComments = comments.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 animate-in fade-in-0 duration-150"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[40%] min-w-[400px] max-w-[95vw] z-50',
          'bg-white shadow-2xl flex flex-col',
          'animate-in slide-in-from-right duration-200'
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-100 px-4 py-3">
          {/* Top row: Task ID + Status + Actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Task reference first */}
              {task.reference && (
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wide whitespace-nowrap">
                  {task.reference}
                </span>
              )}

              {/* Status pill */}
              <Select value={task.status} onValueChange={(value) => onStatusChange(task.id, value)}>
                <SelectTrigger className="h-6 text-[11px] border-0 bg-gray-50 hover:bg-gray-100 px-2 gap-1 rounded-md w-auto min-w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.slug}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                        <span className="text-xs">{col.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <button
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete task"
              >
                <Trash className="w-4 h-4" />
              </button>
              <button
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                onClick={onClose}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="min-h-[24px]">
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
                className="text-sm font-semibold border-0 px-1 shadow-none focus-visible:ring-0 h-[24px] py-0 -mx-1 bg-gray-50"
                autoFocus
              />
            ) : (
              <h2
                className="text-sm font-semibold text-gray-900 cursor-text hover:bg-gray-50 -mx-1 px-1 h-[24px] leading-[24px] rounded transition-colors"
                onClick={() => setIsEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Properties Row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {/* Priority */}
            <Select
              value={priority || 'Low'}
              onValueChange={(value) => {
                const newPriority = value as TaskPriority;
                setPriority(newPriority);
                handleSave('priority', newPriority);
              }}
            >
              <SelectTrigger className="h-6 text-[11px] border-0 bg-gray-50 hover:bg-gray-100 px-2 gap-1 rounded-md w-auto min-w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    <div className="flex items-center gap-1.5">
                      <Flag
                        weight="fill"
                        className={cn(
                          'w-3 h-3',
                          p === 'High' ? 'text-red-500' : p === 'Medium' ? 'text-amber-500' : 'text-gray-400'
                        )}
                      />
                      <span className="text-xs">{TASK_PRIORITY_LABELS[p]}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assignee */}
            <Select
              value={assignee || 'unassigned'}
              onValueChange={(value) => {
                const newValue = value === 'unassigned' ? '' : value;
                setAssignee(newValue);
                handleSave('assigned_to', newValue || null);
              }}
            >
              <SelectTrigger className="h-6 text-[11px] border-0 bg-gray-50 hover:bg-gray-100 px-2 gap-1 rounded-md w-auto min-w-[100px] max-w-[140px]">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-4 w-4 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200 text-gray-500 text-[7px]">?</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-400">Unassigned</span>
                  </div>
                </SelectItem>
                {activeMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-4 w-4 flex-shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[7px]">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate">{member.full_name || member.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due Date */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    'h-6 px-2 text-[11px] rounded-md flex items-center gap-1',
                    'bg-gray-50 hover:bg-gray-100 transition-colors',
                    dueDateInfo?.isOverdue && 'bg-red-50 text-red-600 hover:bg-red-100',
                    dueDateInfo?.isDueToday && 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  )}
                >
                  <CalendarBlank className="w-3 h-3" />
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
                  className="h-7 text-xs"
                />
                {dueDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 h-6 text-[10px] text-gray-500"
                    onClick={() => {
                      setDueDate('');
                      handleSave('due_date', null);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* Reminder */}
            <ReminderPicker
              dueDate={dueDate}
              reminderDate={taskReminder?.scheduledFor ?? null}
              reminderRecurrence={taskReminder?.recurrence ?? 'Once'}
              reminderSent={taskReminder?.status === 'Sent'}
              lastReminderSentAt={taskReminder?.lastSentAt ?? null}
              disabled={isLoadingReminder}
              onReminderChange={async (newReminderDate, newRecurrence) => {
                if (!currentUserId) return;

                try {
                  if (newReminderDate) {
                    // Schedule or update reminder
                    const newReminder = await scheduleTaskReminder({
                      taskId: task.id,
                      userId: currentUserId,
                      organizationId,
                      scheduledFor: newReminderDate,
                      recurrence: newRecurrence,
                      dueDate: dueDate || undefined,
                      taskTitle: task.title,
                      taskReference: task.reference,
                      priority: task.priority,
                    });
                    setTaskReminder(newReminder);
                  } else {
                    // Cancel reminder
                    await cancelTaskReminder(task.id, currentUserId);
                    setTaskReminder(null);
                  }
                } catch (error) {
                  console.error('Failed to update reminder:', error);
                }
              }}
            />

            {/* Project Link */}
            <div className="flex items-center gap-0.5">
              <Select
                value={task.project_id || 'none'}
                onValueChange={(value) => {
                  const newProjectId = value === 'none' ? null : value;
                  onLinkProject(task.id, newProjectId);
                }}
              >
                <SelectTrigger className="h-6 text-[11px] border-0 bg-gray-50 hover:bg-gray-100 px-2 gap-1 rounded-md w-auto min-w-[80px] max-w-[120px]">
                  <FolderOpen className="w-3 h-3 text-purple-500" />
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-xs text-gray-400">No project</span>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <span className="text-xs truncate">{project.proposal?.project_name || 'Unnamed'}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {task.project_id && proposalId && (
                <button
                  onClick={() => navigate(`/proposals/${proposalId}/edit`)}
                  className="p-1 hover:bg-purple-100 rounded text-purple-600"
                  title="Open proposal"
                >
                  <ArrowSquareOut className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-4">
            {/* Description */}
            <div>
              <div className="flex items-center mb-1.5">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Description</span>
              </div>

              <div
                onDragOver={(e) => handleDragOver(e, setDescriptionDragOver)}
                onDragLeave={(e) => handleDragLeave(e, setDescriptionDragOver)}
                onDrop={(e) => handleFileDrop(e, setDescriptionDragOver)}
              >
                {/* Textarea with relative positioning for action buttons */}
                <div className="relative">
                  <Textarea
                    placeholder="Add a description..."
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className={cn(
                      "min-h-[100px] resize-none text-xs bg-gray-50 border-gray-100 focus:bg-white pb-8",
                      // Remove bottom rounding when attachments or drag overlay shown
                      (attachments.length > 0 || isUploadingAttachment || descriptionDragOver)
                        ? "rounded-t-sm rounded-b-none border-b-0"
                        : "rounded-sm",
                      descriptionDragOver && "border-indigo-400"
                    )}
                  />

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />

                  {/* Bottom row: Paperclip + Save button */}
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Add attachment"
                    >
                      {isUploadingAttachment ? (
                        <div className="animate-spin w-3 h-3 border border-gray-300 border-t-gray-600 rounded-full" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {descriptionChanged && (
                      <button
                        onClick={handleDescriptionSave}
                        disabled={isSaving}
                        className="h-5 px-2 flex items-center gap-0.5 text-[9px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 rounded-sm transition-colors"
                      >
                        <Check className="w-2.5 h-2.5" />
                        {isSaving ? 'Saving' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline attachments strip - connected to textarea */}
                {(attachments.length > 0 || isUploadingAttachment) && !descriptionDragOver && (
                  <div className="flex flex-wrap gap-1.5 px-2.5 py-2 bg-gray-50 border border-t-0 border-gray-100 rounded-b-sm">
                    {attachments.map((attachment) => (
                      <AttachmentChip
                        key={attachment.id}
                        attachment={attachment}
                        onDelete={() => onDeleteAttachment?.(attachment)}
                      />
                    ))}
                    {isUploadingAttachment && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-100">
                        <div className="animate-spin w-2.5 h-2.5 border border-blue-300 border-t-blue-600 rounded-full" />
                        <span className="text-[9px] text-blue-600">Uploading...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Drop zone strip at bottom */}
                {descriptionDragOver && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-2 border-t-0 border-dashed border-indigo-400 rounded-b-sm">
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    <p className="text-[11px] text-indigo-600 font-medium">Drop files here to attach</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments Section - Collapsible like Jira */}
            <div>
              <button
                onClick={() => setIsAttachmentsCollapsed(!isAttachmentsCollapsed)}
                className="w-full flex items-center justify-between mb-2 group"
              >
                <div className="flex items-center gap-1.5">
                  {isAttachmentsCollapsed ? (
                    <CaretRight className="w-3 h-3 text-gray-400" weight="bold" />
                  ) : (
                    <CaretDown className="w-3 h-3 text-gray-400" weight="bold" />
                  )}
                  <Paperclip className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Attachments
                  </span>
                  {attachments.length > 0 && (
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {attachments.length}
                    </span>
                  )}
                </div>
                {!isAttachmentsCollapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploadingAttachment}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium"
                  >
                    + Add
                  </button>
                )}
              </button>

              {!isAttachmentsCollapsed && (
                <div className="space-y-2">
                  {/* Uploading indicator */}
                  {isUploadingAttachment && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-100">
                      <div className="animate-spin w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full" />
                      <span className="text-xs text-blue-600">Uploading...</span>
                    </div>
                  )}

                  {/* Attachments list */}
                  {attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((attachment) => (
                        <AttachmentChip
                          key={attachment.id}
                          attachment={attachment}
                          onDelete={() => onDeleteAttachment?.(attachment)}
                        />
                      ))}
                    </div>
                  ) : !isUploadingAttachment ? (
                    <p className="text-[10px] text-gray-400 text-center py-2">
                      No attachments. Drag files to description or click + Add
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div>
              {/* Section Header - Collapsible */}
              <button
                onClick={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
                className="w-full flex items-center justify-between mb-2 group"
              >
                <div className="flex items-center gap-1.5">
                  {isCommentsCollapsed ? (
                    <CaretRight className="w-3 h-3 text-gray-400" weight="bold" />
                  ) : (
                    <CaretDown className="w-3 h-3 text-gray-400" weight="bold" />
                  )}
                  <ChatCircle className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Comments
                  </span>
                  {totalComments > 0 && (
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {totalComments}
                    </span>
                  )}
                </div>
              </button>

              {!isCommentsCollapsed && (
                <>
                  {/* New Comment Input */}
                  <div className="flex gap-2 mb-3">
                    <Avatar className="h-5 w-5 flex-shrink-0 mt-1">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[7px]">
                        {getInitials(activeMembers.find((m) => m.user_id === currentUserId)?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="flex-1"
                      onDragOver={(e) => handleDragOver(e, setCommentDragOver)}
                      onDragLeave={(e) => handleDragLeave(e, setCommentDragOver)}
                      onDrop={(e) => handleFileDrop(e, setCommentDragOver)}
                    >
                      <div className="relative">
                        <MentionInput
                          value={newComment}
                          onChange={(val, mentions) => {
                            setNewComment(val);
                            setNewCommentMentions(mentions);
                          }}
                          members={mentionSuggestions}
                          placeholder="Add a comment..."
                          minRows={1}
                          onSubmit={handleAddComment}
                          className={cn("text-xs pr-16", commentDragOver && "border-indigo-400 border-b-0 rounded-b-none")}
                        />
                        {/* Paperclip + Send button */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Add attachment"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                          {newComment.trim() && (
                            <button
                              onClick={handleAddComment}
                              className="h-5 w-5 flex items-center justify-center text-white bg-indigo-500 hover:bg-indigo-600 rounded-sm transition-colors"
                            >
                              <PaperPlaneTilt className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Drop zone strip at bottom */}
                      {commentDragOver && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border-2 border-t-0 border-dashed border-indigo-400 rounded-b-md">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                          <p className="text-[10px] text-indigo-600 font-medium">Drop files here</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments List */}
                  {isLoadingComments ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full" />
                    </div>
                  ) : topLevelComments.length > 0 ? (
                    <div className="space-y-3">
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
                    <p className="text-[10px] text-gray-400 text-center py-3">No comments yet</p>
                  )}
                </>
              )}
            </div>

            {/* Activity Section - Collapsible */}
            <div>
              <button
                onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
                className="w-full flex items-center justify-between mb-2 group"
              >
                <div className="flex items-center gap-1.5">
                  {isActivityCollapsed ? (
                    <CaretRight className="w-3 h-3 text-gray-400" weight="bold" />
                  ) : (
                    <CaretDown className="w-3 h-3 text-gray-400" weight="bold" />
                  )}
                  <ClockCounterClockwise className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Activity
                  </span>
                  {activities.length > 0 && (
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {activities.length}
                    </span>
                  )}
                </div>
              </button>

              {!isActivityCollapsed && (
                <div className="space-y-2">
                  {isLoadingActivities ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full" />
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-2">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-2 text-[10px] text-gray-500 py-1"
                        >
                          <Avatar className="h-4 w-4 flex-shrink-0 mt-0.5">
                            <AvatarFallback className="bg-gray-100 text-gray-500 text-[6px]">
                              {activity.user?.full_name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-700">
                              {activity.user?.full_name || 'Someone'}
                            </span>{' '}
                            <span className="text-gray-500">
                              {activity.activity_type === 'status_changed' && activity.metadata?.from_status && activity.metadata?.to_status
                                ? `moved from ${activity.metadata.from_status} to ${activity.metadata.to_status}`
                                : activity.activity_type === 'assigned' && activity.metadata?.assigned_to_name
                                ? `assigned to ${activity.metadata.assigned_to_name}`
                                : activity.activity_type === 'priority_changed' && activity.metadata?.to_priority
                                ? `set priority to ${activity.metadata.to_priority}`
                                : activity.activity_type === 'attachment_added' && activity.metadata?.file_name
                                ? `uploaded ${activity.metadata.file_name}`
                                : activity.activity_type === 'attachment_removed' && activity.metadata?.file_name
                                ? `removed ${activity.metadata.file_name}`
                                : activity.activity_type === 'comment_added'
                                ? 'added a comment'
                                : activity.activity_type === 'created'
                                ? 'created this task'
                                : activity.activity_type === 'due_date_changed'
                                ? activity.metadata?.to_due_date ? `set due date to ${activity.metadata.to_due_date}` : 'removed the due date'
                                : activity.activity_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-gray-400 ml-1">
                              · {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 text-center py-2">No activity yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-50 bg-gray-50/50">
          <div className="flex items-center text-[9px] text-gray-400">
            <Clock className="w-2.5 h-2.5 mr-1" />
            Created {format(new Date(task.created_at), 'MMM d, yyyy')}
            {task.creator && <span className="ml-1">by {task.creator.full_name || task.creator.email}</span>}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <TaskDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          onDelete(task.id);
          setShowDeleteDialog(false);
          onClose();
        }}
        taskTitle={task.title}
        taskReference={task.reference ?? undefined}
      />
    </>
  );
}
