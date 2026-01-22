/**
 * TaskBoard Page
 *
 * Jira-like kanban board for organization tasks
 * Clean card design with overlay for details
 */

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Link2 } from 'lucide-react';
import { parseLocalDate } from '@/lib/utils';
import { PageContent } from '@/components/common/layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useOrganizationTasks,
  useCreateProjectTask,
  useReorderTask,
} from '@/hooks/useProjectTasks';
import {
  useTaskBoardColumns,
  useCreateTaskBoardColumn,
  useUpdateTaskBoardColumn,
  useDeleteTaskBoardColumn,
  useReorderTaskBoardColumns,
} from '@/hooks/useTaskBoardColumns';
import { useOrganizationMembers, useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useProjects } from '@/hooks/queries/useBoard';
import { useUser } from '@/auth';
import { TaskDetailOverlay } from '@/components/features/board/task-detail';
import {
  useTaskComments,
  useCreateTaskComment,
  useUpdateTaskComment,
  useDeleteTaskComment,
  useTaskAttachments,
  useUploadTaskAttachment,
  useDeleteTaskAttachment,
  useTaskActivity,
} from '@/hooks/useTaskComments';
import {
  notifyTaskCommentMention,
  notifyTaskCommentAdded,
  notifyTaskCommentReply,
} from '@/services/notificationService';
import { TaskDeleteDialog } from '@/components/features/board/task-detail/TaskDeleteDialog';
import { getTaskReminders, type TaskReminder } from '@/services/scheduledNotificationsService';
import type { ProjectTask } from '@/lib/types/projectTasks';
import type { TaskBoardColumn } from '@/lib/types/taskBoardColumns';
import type { TaskAttachment } from '@/lib/types/taskComments';
import { COLUMN_COLORS } from '@/lib/types/taskBoardColumns';
import {
  Plus,
  DotsThreeVertical,
  Trash,
  Calendar,
  Flag,
  X,
  PencilSimple,
  Check,
  DotsSixVertical,
  CaretDown,
  CaretRight,
  User,
  BellSimple,
} from '@phosphor-icons/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Format date as local ISO string (without UTC conversion)
 */
function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Get reminder display text for tooltip (from scheduled_notifications)
 */
function getReminderDisplayText(reminder: TaskReminder | undefined): string | null {
  if (!reminder) return null;

  try {
    const reminderDate = new Date(reminder.scheduledFor);
    const dateStr = reminderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = reminderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    if (reminder.status === 'Sent') {
      return `Reminder sent: ${dateStr} @ ${timeStr}`;
    }

    if (reminder.recurrence === 'Daily') {
      return `Daily reminder starting ${dateStr} @ ${timeStr}`;
    }

    return `Reminder: ${dateStr} @ ${timeStr}`;
  } catch {
    return null;
  }
}

/**
 * Get due date display info with countdown and color coding
 */
function getDueDateDisplay(dueDate: string): { text: string; color: string; bgColor: string } {
  const now = new Date();
  const due = parseLocalDate(dueDate);

  // Check if same calendar day
  const isToday = now.getFullYear() === due.getFullYear() &&
                  now.getMonth() === due.getMonth() &&
                  now.getDate() === due.getDate();

  // Check if tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = tomorrow.getFullYear() === due.getFullYear() &&
                     tomorrow.getMonth() === due.getMonth() &&
                     tomorrow.getDate() === due.getDate();

  const diffMs = due.getTime() - now.getTime();
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  // Overdue - red
  if (diffMs < 0 && !isToday) {
    const overdueTotalHours = Math.abs(totalHours);
    const overdueDays = Math.floor(overdueTotalHours / 24);
    const overdueHours = overdueTotalHours % 24;
    let text: string;
    if (overdueDays >= 1) {
      text = overdueHours > 0 ? `${overdueDays}d ${overdueHours}h overdue` : `${overdueDays}d overdue`;
    } else {
      text = `${overdueHours}h overdue`;
    }
    return { text, color: 'text-red-600', bgColor: 'bg-red-50' };
  }

  // Today - amber
  if (isToday) {
    return { text: 'Today', color: 'text-amber-600', bgColor: 'bg-amber-50' };
  }

  // Tomorrow - amber
  if (isTomorrow) {
    return { text: 'Tomorrow', color: 'text-amber-600', bgColor: 'bg-amber-50' };
  }

  // More than 1 day - green with days and hours
  const text = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  return { text, color: 'text-green-600', bgColor: 'bg-green-50' };
}

export default function TaskBoard() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');
  const organizationId = organization?.id || '';

  // URL-based task selection (like Jira's ?selectedIssue=TASK-123)
  const [searchParams, setSearchParams] = useSearchParams();
  const taskFromUrl = searchParams.get('task');

  // Fetch columns, tasks, and projects
  const { data: columns = [], isLoading: columnsLoading } = useTaskBoardColumns(organizationId);
  const { data: tasks = [], isLoading: tasksLoading } = useOrganizationTasks(organizationId);
  const { data: members = [] } = useOrganizationMembers(organizationId);
  const { data: projects = [] } = useProjects(organizationId, !!organizationId);
  const createTask = useCreateProjectTask(organizationId, '');
  const reorderTask = useReorderTask(organizationId);
  const createColumn = useCreateTaskBoardColumn(organizationId);
  const updateColumn = useUpdateTaskBoardColumn(organizationId);
  const deleteColumn = useDeleteTaskBoardColumn(organizationId);
  const reorderColumns = useReorderTaskBoardColumns(organizationId);

  // State for adding task
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  // State for task detail overlay
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  // Track if user manually closed (to prevent useEffect from re-opening)
  const userClosedRef = useRef(false);

  // State for task reminders (from scheduled_notifications)
  const [taskReminders, setTaskReminders] = useState<Map<string, TaskReminder>>(new Map());

  // Fetch reminders for all tasks
  useEffect(() => {
    const fetchReminders = async () => {
      if (tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const reminders = await getTaskReminders(taskIds);
        setTaskReminders(reminders);
      }
    };
    fetchReminders();
  }, [tasks]);

  // Open task from URL param on load (e.g., ?task=TASK-123)
  useEffect(() => {
    // Don't re-open if user just closed the overlay
    if (userClosedRef.current) {
      userClosedRef.current = false;
      return;
    }
    if (taskFromUrl && tasks.length > 0 && !selectedTask) {
      // Try to find by reference first, then by ID
      const foundTask = tasks.find(
        (t) => t.reference === taskFromUrl || t.id === taskFromUrl
      );
      if (foundTask) {
        setSelectedTask(foundTask);
      }
    }
  }, [taskFromUrl, tasks, selectedTask]);

  // Helper to open task and update URL
  const openTaskOverlay = (task: ProjectTask) => {
    setSelectedTask(task);
    setSearchParams({ task: task.reference || task.id });
  };

  // Helper to close task and clear URL
  const closeTaskOverlay = () => {
    userClosedRef.current = true;
    setSelectedTask(null);
    // Clear the task param from URL
    searchParams.delete('task');
    setSearchParams(searchParams);
  };

  // Task comments and attachments hooks (only fetch when task is selected)
  const { data: taskComments = [], isLoading: isLoadingComments } = useTaskComments(selectedTask?.id);
  const { data: taskAttachments = [], isLoading: isLoadingAttachments } = useTaskAttachments(selectedTask?.id);
  const { data: taskActivities = [], isLoading: isLoadingActivities } = useTaskActivity(selectedTask?.id);
  // Get current user's profile for optimistic comment updates
  const currentUserProfile = members.find((m) => m.user_id === user?.id);
  const createComment = useCreateTaskComment(selectedTask?.id || '', organizationId, {
    id: user?.id || '',
    full_name: currentUserProfile?.full_name,
    email: user?.email,
  });
  const updateComment = useUpdateTaskComment(selectedTask?.id || '');
  const deleteComment = useDeleteTaskComment(selectedTask?.id || '');
  const uploadAttachment = useUploadTaskAttachment(selectedTask?.id || '', organizationId);
  const deleteAttachment = useDeleteTaskAttachment(selectedTask?.id || '');

  // State for delete task dialog
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{ open: boolean; task: ProjectTask | null }>({
    open: false,
    task: null,
  });

  // State for new column
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Timer for due date countdown refresh (every 5 minutes)
  const [, setCountdownTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(tick => tick + 1);
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLUMN_COLORS[0]?.value || '#94A3B8');

  // State for column editing
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Drag state for tasks (matches Board.tsx pattern)
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');

  // Drag state for columns
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [columnDropSide, setColumnDropSide] = useState<'left' | 'right' | null>(null);

  const activeMembers = members.filter(m => m.status === 'Active');
  const isLoading = columnsLoading || tasksLoading;

  // Focus input when adding task
  useEffect(() => {
    if (addingToColumn && addTaskInputRef.current) {
      addTaskInputRef.current.focus();
    }
  }, [addingToColumn]);

  // Group tasks by status (column slug) - sorted by position
  const getTasksByStatus = (status: string) => {
    return tasks
      .filter((task: ProjectTask) => task.status === status)
      .sort((a: ProjectTask, b: ProjectTask) => (a.position ?? 0) - (b.position ?? 0));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnSlug: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnSlug);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // Handle drag over a specific task card (matches Board.tsx pattern)
  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Don't show card drop indicators if we're dragging a column
    if (draggedColumnId) return;

    // Determine if hovering over top or bottom half of the card
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midpoint;

    setDragOverCard(cardId);
    setDropPosition(isTopHalf ? 'before' : 'after');
  };

  const handleCardDragLeave = () => {
    setDragOverCard(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();

    // Clear drag states immediately to remove blue border
    setDragOverColumn(null);
    setDragOverCard(null);

    if (!draggedTask) {
      resetDragState();
      return;
    }

    // Find the dragged task to get its current status and position
    const draggedTaskData = tasks.find((t: ProjectTask) => t.id === draggedTask);
    if (!draggedTaskData) {
      resetDragState();
      return;
    }

    const oldStatus = draggedTaskData.status;
    const oldPosition = draggedTaskData.position ?? 0;

    const columnTasks = getTasksByStatus(newStatus);
    let newPosition: number;

    if (dragOverCard && dragOverCard !== draggedTask) {
      // Dropping relative to a specific card
      const targetCardIndex = columnTasks.findIndex((t: ProjectTask) => t.id === dragOverCard);
      if (targetCardIndex >= 0) {
        if (dropPosition === 'before') {
          newPosition = targetCardIndex;
        } else {
          newPosition = targetCardIndex + 1;
        }
      } else {
        // Card not found, add to end
        newPosition = columnTasks.length;
      }
    } else {
      // Dropped in empty space - add to end
      newPosition = columnTasks.length;
    }

    // Check if position actually changed - skip reorder if same position in same column
    const isSameColumn = oldStatus === newStatus;
    if (isSameColumn) {
      // If dropping before/after self or in same effective position, skip
      const effectivelySamePosition =
        newPosition === oldPosition ||
        newPosition === oldPosition + 1; // Dropping right after self

      if (effectivelySamePosition) {
        resetDragState();
        return;
      }
    }

    // Reorder the task
    await reorderTask.mutateAsync({
      taskId: draggedTask,
      newStatus,
      newPosition,
    });

    resetDragState();
  };

  const resetDragState = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverCard(null);
    setDropPosition('before');
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string, projectId: string | null) => {
    const { updateTaskStatus } = await import('@/services/projectTasksService');
    await updateTaskStatus(taskId, newStatus as any);
    const { queryClient } = await import('@/lib/queryClient');
    queryClient.invalidateQueries({ queryKey: ['organization-tasks', organizationId] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    }
  };

  const handleDeleteTask = async (taskId: string, projectId: string | null) => {
    const { deleteProjectTask } = await import('@/services/projectTasksService');
    await deleteProjectTask(taskId);
    const { queryClient } = await import('@/lib/queryClient');
    queryClient.invalidateQueries({ queryKey: ['organization-tasks', organizationId] });
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    const { updateProjectTask } = await import('@/services/projectTasksService');
    await updateProjectTask(taskId, updates as any);
    const { queryClient } = await import('@/lib/queryClient');
    queryClient.invalidateQueries({ queryKey: ['organization-tasks', organizationId] });
  };

  const handleQuickAssign = async (taskId: string, userId: string | null) => {
    await handleUpdateTask(taskId, { assigned_to: userId } as any);
  };

  const handleQuickDueDate = async (taskId: string, date: string | null) => {
    await handleUpdateTask(taskId, { due_date: date } as any);
  };

  const handleLinkProject = async (taskId: string, projectId: string | null) => {
    await handleUpdateTask(taskId, { project_id: projectId } as any);
    // Update selected task for UI
    if (selectedTask?.id === taskId) {
      const linkedProject = projectId ? projects.find(p => p.id === projectId) : undefined;
      const projectData = linkedProject ? {
        id: linkedProject.id,
        proposal: linkedProject.proposal ? {
          project_name: linkedProject.proposal.project_name ?? undefined,
          proposal_number: linkedProject.proposal.proposal_number ?? undefined,
        } : undefined,
      } : null;

      setSelectedTask(prev => prev ? {
        ...prev,
        project_id: projectId,
        project: projectData,
      } : null);
    }
  };

  // Comment handlers with notifications
  const handleAddComment = async (content: string, mentions: string[], parentId?: string) => {
    if (!selectedTask || !user) return;

    try {
      await createComment.mutateAsync({
        content,
        mentions,
        parent_id: parentId,
      });

      // Get commenter info
      const commenter = activeMembers.find(m => m.user_id === user.id);
      const commenterName = commenter?.full_name || user.email || 'Someone';

      // Send notifications (non-blocking)
      if (mentions.length > 0) {
        notifyTaskCommentMention({
          organizationId,
          taskId: selectedTask.id,
          taskTitle: selectedTask.title,
          taskReference: selectedTask.reference || undefined,
          commentId: '', // Will be set by the notification service
          commentContent: content,
          commenterName,
          commenterId: user.id,
          mentionedUserIds: mentions,
        }).catch(console.error);
      }

      // Notify assignee if different from commenter
      if (selectedTask.assigned_to && selectedTask.assigned_to !== user.id && !parentId) {
        notifyTaskCommentAdded({
          organizationId,
          taskId: selectedTask.id,
          taskTitle: selectedTask.title,
          taskReference: selectedTask.reference || undefined,
          commentId: '',
          commentContent: content,
          commenterName,
          commenterId: user.id,
          assigneeId: selectedTask.assigned_to,
        }).catch(console.error);
      }

      // Notify parent comment author if this is a reply
      if (parentId) {
        const parentComment = taskComments.find(c => c.id === parentId);
        if (parentComment && parentComment.user_id !== user.id) {
          notifyTaskCommentReply({
            organizationId,
            taskId: selectedTask.id,
            taskTitle: selectedTask.title,
            taskReference: selectedTask.reference || undefined,
            commentId: '',
            commentContent: content,
            commenterName,
            commenterId: user.id,
            parentCommentUserId: parentComment.user_id,
          }).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleEditComment = async (commentId: string, content: string, mentions: string[]) => {
    try {
      await updateComment.mutateAsync({
        commentId,
        input: { content, mentions },
      });
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Attachment handlers
  const handleUploadAttachment = async (file: File) => {
    try {
      await uploadAttachment.mutateAsync(file);
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    }
  };

  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    try {
      await deleteAttachment.mutateAsync(attachment);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  // Quick add task with optional due date and assignee
  const handleAddTask = async (columnSlug: string) => {
    if (!newTaskTitle.trim()) return;

    await createTask.mutateAsync({
      project_id: null,
      title: newTaskTitle.trim(),
      status: columnSlug as any,
      due_date: newTaskDueDate || undefined,
      assigned_to: newTaskAssignee || undefined,
      priority: newTaskPriority,
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskAssignee('');
    setNewTaskPriority('Medium');
    setAddingToColumn(null);
  };

  const resetAddTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskAssignee('');
    setNewTaskPriority('Medium');
    setAddingToColumn(null);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;

    await createColumn.mutateAsync({
      name: newColumnName.trim(),
      color: newColumnColor,
    });

    setNewColumnName('');
    setNewColumnColor(COLUMN_COLORS[0]!.value);
    setIsAddingColumn(false);
  };

  // Column editing handlers
  const handleStartEditColumn = (columnId: string, currentName: string) => {
    setEditingColumn(columnId);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnName = async (columnId: string) => {
    if (!editingColumnName.trim()) return;
    await updateColumn.mutateAsync({
      columnId,
      input: { name: editingColumnName.trim() },
    });
    setEditingColumn(null);
    setEditingColumnName('');
  };

  const handleChangeColumnColor = async (columnId: string, color: string) => {
    await updateColumn.mutateAsync({
      columnId,
      input: { color },
    });
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  // Column drag handlers
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== columnId) {
      const sortedCols = [...columns].sort((a, b) => a.position - b.position);
      const draggedIndex = sortedCols.findIndex(c => c.id === draggedColumnId);
      const targetIndex = sortedCols.findIndex(c => c.id === columnId);
      const side = draggedIndex < targetIndex ? 'right' : 'left';
      setDragOverColumnId(columnId);
      setColumnDropSide(side);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumnId(null);
    setColumnDropSide(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumnId || draggedColumnId === targetColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      setColumnDropSide(null);
      return;
    }

    const sortedCols = [...columns].sort((a, b) => a.position - b.position);
    const draggedIndex = sortedCols.findIndex(c => c.id === draggedColumnId);
    const targetIndex = sortedCols.findIndex(c => c.id === targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...sortedCols];
    const [removed] = reordered.splice(draggedIndex, 1);
    if (removed) {
      reordered.splice(targetIndex, 0, removed);
    }

    await reorderColumns.mutateAsync(reordered.map(c => c.id));

    setDraggedColumnId(null);
    setDragOverColumnId(null);
    setColumnDropSide(null);
  };

  const handleDeleteColumn = async (columnId: string, columnSlug: string) => {
    const tasksInColumn = getTasksByStatus(columnSlug);
    if (tasksInColumn.length > 0) {
      alert('Cannot delete column with tasks. Move or delete tasks first.');
      return;
    }
    await deleteColumn.mutateAsync(columnId);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getProjectName = (task: ProjectTask) => {
    if (!task.project_id) return null;
    return task.project?.proposal?.project_name || 'Linked Project';
  };

  if (isLoading) {
    return (
      <PageContent
        title="Task Board"
        subtitle="Manage all organization tasks"
        showPageHeader={true}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent
      title="Task Board"
      subtitle="Manage all organization tasks across projects"
      showPageHeader={true}
      contentClassName="overflow-hidden"
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-1 h-full">
        {columns
          .sort((a, b) => a.position - b.position)
          .map((column: TaskBoardColumn) => {
          const columnTasks = getTasksByStatus(column.slug);
          const isDragOver = dragOverColumn === column.slug;
          const isEditing = editingColumn === column.id;
          const isCollapsed = collapsedColumns.has(column.id);

          return (
            <div
              key={column.id}
              className="flex flex-col gap-1 relative"
              onDragOver={(e) => handleColumnDragOver(e, column.id)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleColumnDrop(e, column.id)}
            >
              {/* Column drop indicators */}
              {dragOverColumnId === column.id && columnDropSide === 'left' && (
                <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
              )}
              {dragOverColumnId === column.id && columnDropSide === 'right' && (
                <div className="absolute -right-2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
              )}

              <div
                className={`flex-shrink-0 transition-all duration-300 ease-in-out rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-10rem)] ${
                  isCollapsed ? 'w-12' : 'w-72'
                } ${draggedColumnId === column.id ? 'opacity-40 bg-gray-200 border-2 border-dashed border-gray-400' : 'bg-gray-50'} ${
                  isDragOver && !draggedColumnId ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.slug)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.slug)}
              >
                {/* Colored Banner */}
                <div
                  className="h-1.5 rounded-t-lg flex-shrink-0"
                  style={{ backgroundColor: column.color }}
                />

                {/* Column Header */}
                <div className="px-2 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {!isCollapsed && (
                      <button
                        onClick={() => toggleColumnCollapse(column.id)}
                        className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                      >
                        <CaretDown className="w-4 h-4 text-gray-500" />
                      </button>
                    )}

                    {!isCollapsed && (
                      <>
                        {/* Color Picker */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="w-4 h-4 rounded-full flex-shrink-0 hover:ring-2 ring-offset-1 ring-gray-300 transition-all"
                              style={{ backgroundColor: column.color }}
                            />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="start">
                            <div className="grid grid-cols-5 gap-2">
                              {COLUMN_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => handleChangeColumnColor(column.id, color.value)}
                                  className="w-8 h-8 rounded-full hover:scale-110 transition-transform flex items-center justify-center"
                                  style={{ backgroundColor: color.value }}
                                  title={color.label}
                                >
                                  {column.color === color.value && <Check className="w-4 h-4 text-white" />}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Drag handle - all columns can be reordered */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleColumnDragStart(e, column.id);
                          }}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
                          title="Drag to reorder column"
                        >
                          <DotsSixVertical className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Column name */}
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editingColumnName}
                              onChange={(e) => setEditingColumnName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveColumnName(column.id);
                                if (e.key === 'Escape') setEditingColumn(null);
                              }}
                              className="h-7 text-sm font-medium"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveColumnName(column.id)}
                              className="p-1 hover:bg-green-100 rounded text-green-600"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingColumn(null)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="font-medium text-gray-900 text-sm truncate">
                                {column.name}
                              </h3>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 font-normal shrink-0">
                              {columnTasks.length}
                            </Badge>
                          </>
                        )}

                        {/* Column Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded ml-auto">
                              <DotsThreeVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleStartEditColumn(column.id, column.name)}
                              className="flex items-center gap-2"
                            >
                              <PencilSimple className="w-4 h-4" />
                              Rename
                            </DropdownMenuItem>
                            {!column.is_default && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteColumn(column.id, column.slug)}
                                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                >
                                  <Trash className="w-4 h-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}

                    {/* Collapsed state */}
                    {isCollapsed && (
                      <div className="flex flex-col items-center gap-2 py-4 w-full">
                        <button
                          onClick={() => toggleColumnCollapse(column.id)}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        >
                          <CaretRight className="w-4 h-4 text-gray-500" />
                        </button>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                          style={{ backgroundColor: column.color }}
                        />
                        <div
                          className="text-xs font-medium text-gray-900 whitespace-nowrap cursor-pointer flex-shrink-0 mt-2"
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                          onClick={() => toggleColumnCollapse(column.id)}
                        >
                          {column.name}
                        </div>
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                          {columnTasks.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks List */}
                {!isCollapsed && (
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col min-h-[120px]">
                    {/* Task Cards */}
                    <div className="space-y-2 flex-1">
                    {columnTasks.map((task: ProjectTask) => {
                      const projectName = getProjectName(task);

                      return (
                        <div key={task.id} className="relative">
                          {/* Drop indicator above card (matches Board.tsx) */}
                          {dragOverCard === task.id && draggedTask !== task.id && (
                            <div className="h-0.5 bg-blue-500 rounded-full mb-2" />
                          )}
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragOver={(e) => handleCardDragOver(e, task.id)}
                            onDragLeave={handleCardDragLeave}
                            onClick={() => openTaskOverlay(task)}
                            className={`group bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200 relative ${
                              draggedTask === task.id ? 'opacity-50 scale-95' : ''
                            }`}
                          >
                          {/* Top Right: Menu only */}
                          <div className="absolute top-2 right-2">
                            {/* Task Menu - 3 dot ellipsis */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <DotsThreeVertical className="w-4 h-4 text-gray-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem
                                  onClick={() => setDeleteTaskDialog({ open: true, task })}
                                  className="flex items-center gap-2 text-red-600 focus:text-red-600"
                                >
                                  <Trash className="w-4 h-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Task Title with Project Link */}
                          <div className="mb-1 pr-8 flex items-start gap-1.5">
                            <h4 className="text-sm font-small text-gray-900 line-clamp-2">
                              {task.title}
                            </h4>
                            {/* Project Link Icon - rotated, right of title */}
                            {projects.length > 0 && (
                              <Popover>
                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-all ${
                                      projectName
                                        ? 'text-purple-500 hover:text-purple-600'
                                        : 'text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100'
                                    }`}
                                    title={projectName || 'Link to project'}
                                  >
                                    <Link2 className="w-3.5 h-3.5 -rotate-45" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 px-2 pb-1">Link to Project</p>
                                    {projects.map((project) => (
                                      <button
                                        key={project.id}
                                        onClick={() => handleLinkProject(task.id, project.id)}
                                        className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 ${
                                          task.project_id === project.id ? 'bg-purple-50' : ''
                                        }`}
                                      >
                                        <Link2 className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 -rotate-45" />
                                        <span className="truncate">{project.proposal?.project_name || 'Unnamed Project'}</span>
                                      </button>
                                    ))}
                                    {task.project_id && (
                                      <button
                                        onClick={() => handleLinkProject(task.id, null)}
                                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 rounded text-red-600"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {task.description}
                            </p>
                          )}

                          {/* Bottom Row: Reference, Priority, Due Date, Assignee */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Task Reference */}
                              {task.reference && (
                                <span className="text-xs font-medium text-gray-900 uppercase">
                                  {task.reference}
                                </span>
                              )}

                              {/* Priority Indicator - clickable dropdown */}
                              <Popover>
                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className={`p-1 rounded hover:bg-gray-100 transition-all ${
                                      task.priority
                                        ? ''
                                        : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                    title={task.priority ? `Priority: ${task.priority}` : 'Set priority'}
                                  >
                                    <Flag
                                      weight="fill"
                                      className={`w-3.5 h-3.5 ${
                                        task.priority === 'High' ? 'text-red-500' :
                                        task.priority === 'Medium' ? 'text-yellow-500' :
                                        task.priority === 'Low' ? 'text-gray-400' : 'text-gray-300'
                                      }`}
                                    />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-32 p-2" align="start" onClick={(e) => e.stopPropagation()}>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 px-2 pb-1">Priority</p>
                                    {(['High', 'Medium', 'Low'] as const).map((priority) => (
                                      <button
                                        key={priority}
                                        onClick={() => handleUpdateTask(task.id, { priority } as any)}
                                        className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 ${
                                          task.priority === priority ? 'bg-gray-50' : ''
                                        }`}
                                      >
                                        <Flag
                                          weight="fill"
                                          className={`w-3.5 h-3.5 ${
                                            priority === 'High' ? 'text-red-500' :
                                            priority === 'Medium' ? 'text-yellow-500' : 'text-gray-400'
                                          }`}
                                        />
                                        <span>{priority}</span>
                                      </button>
                                    ))}
                                    {task.priority && (
                                      <button
                                        onClick={() => handleUpdateTask(task.id, { priority: null } as any)}
                                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 rounded text-red-600"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>

                              {/* Due Date */}
                              {task.due_date ? (() => {
                                const dueDateInfo = getDueDateDisplay(task.due_date);
                                return (
                                <Popover>
                                  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className={`flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded ${dueDateInfo.bgColor} ${dueDateInfo.color}`}>
                                      <Calendar className="w-3 h-3" />
                                      <span className="font-medium">{dueDateInfo.text}</span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                                    <CalendarPicker
                                      mode="single"
                                      selected={parseLocalDate(task.due_date)}
                                      defaultMonth={parseLocalDate(task.due_date)}
                                      disabled={{ before: new Date() }}
                                      onSelect={(date) => {
                                        if (date) {
                                          // Set to end of day (23:59:59) so "today" isn't immediately overdue
                                          date.setHours(23, 59, 59, 999);
                                          handleQuickDueDate(task.id, toLocalISOString(date));
                                        }
                                      }}
                                      initialFocus
                                    />
                                    <div className="border-t p-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-red-600"
                                        onClick={() => handleQuickDueDate(task.id, null)}
                                      >
                                        Remove date
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                );
                              })() : (
                                <Popover>
                                  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                                    <CalendarPicker
                                      mode="single"
                                      selected={undefined}
                                      defaultMonth={new Date()}
                                      disabled={{ before: new Date() }}
                                      onSelect={(date) => {
                                        if (date) {
                                          // Set to end of day (23:59:59) so "today" isn't immediately overdue
                                          date.setHours(23, 59, 59, 999);
                                          handleQuickDueDate(task.id, toLocalISOString(date));
                                        }
                                      }}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}

                              {/* Reminder Indicator */}
                              {(() => {
                                const reminder = taskReminders.get(task.id);
                                const reminderText = getReminderDisplayText(reminder);
                                if (!reminderText) return null;
                                const isSent = reminder?.status === 'Sent';
                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <button className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                                          isSent ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                          <BellSimple className="w-3 h-3" weight="fill" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        {reminderText}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })()}
                            </div>

                            {/* Assignee */}
                            {task.assignee ? (
                              <Popover>
                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button>
                                    <Avatar className="h-6 w-6 hover:ring-2 ring-blue-300">
                                      <AvatarFallback className="bg-blue-100 text-blue-700 text-[10px]">
                                        {getInitials(task.assignee.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                                  <div className="space-y-1">
                                    {activeMembers.map((member) => (
                                      <button
                                        key={member.user_id}
                                        onClick={() => handleQuickAssign(task.id, member.user_id)}
                                        className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 ${
                                          task.assigned_to === member.user_id ? 'bg-blue-50' : ''
                                        }`}
                                      >
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                                            {getInitials(member.full_name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{member.full_name || member.email}</span>
                                      </button>
                                    ))}
                                    <button
                                      onClick={() => handleQuickAssign(task.id, null)}
                                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 rounded text-red-600"
                                    >
                                      Unassign
                                    </button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded">
                                    <User className="w-4 h-4 text-gray-400" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                                  <div className="space-y-1">
                                    {activeMembers.map((member) => (
                                      <button
                                        key={member.user_id}
                                        onClick={() => handleQuickAssign(task.id, member.user_id)}
                                        className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                                      >
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                                            {getInitials(member.full_name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{member.full_name || member.email}</span>
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </div>

                        </div>
                      );
                    })}
                    </div>

                    {/* Add Task Form - at bottom of column (hidden during drag) */}
                    <div className={columnTasks.length === 0 ? 'mt-auto' : 'mt-2'}>
                    {!draggedTask && addingToColumn === column.slug ? (
                      <div className="bg-white rounded-lg border border-blue-200 p-2 shadow-sm">
                        <Input
                          ref={addTaskInputRef}
                          placeholder="What needs to be done?"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTaskTitle.trim()) {
                              handleAddTask(column.slug);
                            }
                            if (e.key === 'Escape') {
                              resetAddTaskForm();
                            }
                          }}
                          className="border-0 shadow-none focus-visible:ring-0 px-1 text-sm"
                        />
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleAddTask(column.slug)}
                              disabled={!newTaskTitle.trim() || createTask.isPending}
                            >
                              {createTask.isPending ? 'Adding...' : 'Create'}
                            </Button>

                            {/* Due Date */}
                            <Popover>
                              <PopoverTrigger asChild>
                                {newTaskDueDate ? (
                                  <span className="text-xs text-blue-600 hover:text-blue-700 hover:underline cursor-pointer">
                                    {format(parseLocalDate(newTaskDueDate), 'MMM d, yyyy')}
                                  </span>
                                ) : (
                                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="Set due date">
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                )}
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarPicker
                                  mode="single"
                                  selected={newTaskDueDate ? parseLocalDate(newTaskDueDate) : undefined}
                                  defaultMonth={newTaskDueDate ? parseLocalDate(newTaskDueDate) : new Date()}
                                  onSelect={(date) => setNewTaskDueDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                  initialFocus
                                />
                                {newTaskDueDate && (
                                  <div className="border-t p-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-full text-red-600"
                                      onClick={() => setNewTaskDueDate('')}
                                    >
                                      Clear date
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>

                            {/* Assignee */}
                            <Popover>
                              <PopoverTrigger asChild>
                                {newTaskAssignee ? (
                                  <Avatar
                                    className="h-5 w-5 cursor-pointer hover:ring-2 hover:ring-blue-200"
                                    title={activeMembers.find(m => m.user_id === newTaskAssignee)?.full_name || 'Assigned'}
                                  >
                                    <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                                      {getInitials(activeMembers.find(m => m.user_id === newTaskAssignee)?.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400" title="Assign to">
                                    <User className="w-4 h-4" />
                                  </button>
                                )}
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="start">
                                <div className="space-y-1">
                                  {newTaskAssignee && (
                                    <button
                                      onClick={() => setNewTaskAssignee('')}
                                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded text-gray-500"
                                    >
                                      Unassign
                                    </button>
                                  )}
                                  {activeMembers.map((member) => (
                                    <button
                                      key={member.user_id}
                                      onClick={() => setNewTaskAssignee(member.user_id)}
                                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 ${
                                        newTaskAssignee === member.user_id ? 'bg-blue-50' : ''
                                      }`}
                                    >
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                                          {getInitials(member.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="truncate">{member.full_name || member.email}</span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>

                            {/* Priority */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  className="p-1 rounded hover:bg-gray-100 cursor-pointer"
                                  title={`Priority: ${newTaskPriority}`}
                                >
                                  <Flag
                                    className={`w-4 h-4 ${
                                      newTaskPriority === 'High' ? 'text-red-500' :
                                      newTaskPriority === 'Medium' ? 'text-yellow-500' :
                                      'text-gray-400'
                                    }`}
                                    weight="fill"
                                  />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-32 p-2" align="start">
                                <div className="space-y-1">
                                  {(['High', 'Medium', 'Low'] as const).map((priority) => (
                                    <button
                                      key={priority}
                                      onClick={() => setNewTaskPriority(priority)}
                                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 ${
                                        newTaskPriority === priority ? 'bg-blue-50' : ''
                                      }`}
                                    >
                                      <Flag
                                        className={`w-3 h-3 ${
                                          priority === 'High' ? 'text-red-500' :
                                          priority === 'Medium' ? 'text-yellow-500' :
                                          'text-gray-400'
                                        }`}
                                        weight="fill"
                                      />
                                      <span>{priority}</span>
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>

                          <button
                            onClick={resetAddTaskForm}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingToColumn(column.slug)}
                        className="w-full py-2 text-sm text-gray-900 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create
                      </button>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add New Column */}
        {isAddingColumn ? (
          <div className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-3">
            <div className="space-y-3">
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') setIsAddingColumn(false);
                }}
                placeholder="Column name..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewColumnColor(color.value)}
                    className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                      newColumnColor === color.value ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim() || createColumn.isPending}
                  className="flex-1 h-8"
                >
                  {createColumn.isPending ? 'Adding...' : 'Add Column'}
                </Button>
                <button
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnName('');
                    setNewColumnColor(COLUMN_COLORS[0]?.value || '#94A3B8');
                  }}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 w-72">
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-gray-400"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>
        )}
      </div>

      {/* Task Detail Overlay */}
      {selectedTask && (
        <TaskDetailOverlay
          task={selectedTask}
          columns={columns}
          members={activeMembers}
          projects={projects}
          currentUserId={user?.id}
          organizationId={organizationId}
          onClose={closeTaskOverlay}
          onUpdate={handleUpdateTask}
          onDelete={(taskId) => {
            handleDeleteTask(taskId, selectedTask.project_id);
            closeTaskOverlay();
          }}
          onStatusChange={(taskId, newStatus) => {
            handleStatusUpdate(taskId, newStatus, selectedTask.project_id);
            // Update selected task's status for UI
            setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
          }}
          onLinkProject={handleLinkProject}
          // Comments
          comments={taskComments}
          isLoadingComments={isLoadingComments}
          onAddComment={handleAddComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          // Attachments
          attachments={taskAttachments}
          isLoadingAttachments={isLoadingAttachments}
          isUploadingAttachment={uploadAttachment.isPending}
          onUploadAttachment={handleUploadAttachment}
          onDeleteAttachment={handleDeleteAttachment}
          // Activity
          activities={taskActivities}
          isLoadingActivities={isLoadingActivities}
        />
      )}

      {/* Delete Task Confirmation Dialog */}
      <TaskDeleteDialog
        open={deleteTaskDialog.open}
        onOpenChange={(open) => setDeleteTaskDialog({ open, task: open ? deleteTaskDialog.task : null })}
        onConfirm={() => {
          if (deleteTaskDialog.task) {
            handleDeleteTask(deleteTaskDialog.task.id, deleteTaskDialog.task.project_id);
          }
          setDeleteTaskDialog({ open: false, task: null });
        }}
        taskTitle={deleteTaskDialog.task?.title || ''}
        taskReference={deleteTaskDialog.task?.reference ?? undefined}
      />
    </PageContent>
  );
}
