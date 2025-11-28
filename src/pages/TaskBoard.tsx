/**
 * TaskBoard Page
 *
 * Jira-like kanban board for organization tasks
 * Clean card design with overlay for details
 */

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
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
import { TaskDetailOverlay } from '@/components/features/board/TaskDetailOverlay';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import type { ProjectTask } from '@/lib/types/projectTasks';
import type { TaskBoardColumn } from '@/lib/types/taskBoardColumns';
import { COLUMN_COLORS } from '@/lib/types/taskBoardColumns';
import {
  Plus,
  DotsThreeVertical,
  Trash,
  Calendar,
  Flag,
  X,
  FolderOpen,
  PencilSimple,
  Check,
  DotsSixVertical,
  CaretDown,
  CaretRight,
  User,
} from '@phosphor-icons/react';

export default function TaskBoard() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');
  const organizationId = organization?.id || '';

  // Fetch columns, tasks, and projects
  const { data: columns = [], isLoading: columnsLoading } = useTaskBoardColumns(organizationId);
  const { data: tasks = [], isLoading: tasksLoading } = useOrganizationTasks(organizationId);
  const { data: members = [] } = useOrganizationMembers(organizationId);
  const { data: projects = [] } = useProjects(organizationId, !!organizationId);
  const createTask = useCreateProjectTask(organizationId, '');
  const createColumn = useCreateTaskBoardColumn(organizationId);
  const updateColumn = useUpdateTaskBoardColumn(organizationId);
  const deleteColumn = useDeleteTaskBoardColumn(organizationId);
  const reorderColumns = useReorderTaskBoardColumns(organizationId);

  // State for adding task
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  // State for task detail overlay
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);

  // State for delete task dialog
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{ open: boolean; task: ProjectTask | null }>({
    open: false,
    task: null,
  });

  // State for new column
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState(COLUMN_COLORS[0]?.value || '#94A3B8');

  // State for column editing
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Drag state for tasks
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

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

  // Group tasks by status (column slug)
  const getTasksByStatus = (status: string) => {
    return tasks.filter((task: ProjectTask) => task.status === status);
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnSlug: string) => {
    e.preventDefault();
    setDragOverColumn(columnSlug);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask) {
      const task = tasks.find((t: ProjectTask) => t.id === draggedTask);
      if (task && task.status !== newStatus) {
        handleStatusUpdate(task.id, newStatus, task.project_id);
      }
    }
    setDraggedTask(null);
    setDragOverColumn(null);
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
      const linkedProject = projectId ? projects.find(p => p.id === projectId) : null;
      setSelectedTask(prev => prev ? {
        ...prev,
        project_id: projectId,
        project: linkedProject ? {
          id: linkedProject.id,
          quote: linkedProject.quote ? {
            project_name: linkedProject.quote.project_name,
            proposal_number: linkedProject.quote.proposal_number,
          } : undefined,
        } : null,
      } : null);
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
    setNewTaskPriority('medium');
    setAddingToColumn(null);
  };

  const resetAddTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskAssignee('');
    setNewTaskPriority('medium');
    setAddingToColumn(null);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;

    await createColumn.mutateAsync({
      name: newColumnName.trim(),
      color: newColumnColor,
    });

    setNewColumnName('');
    setNewColumnColor(COLUMN_COLORS[0].value);
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
    return task.project?.quote?.project_name || 'Linked Project';
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
                className={`flex-shrink-0 transition-all duration-300 ease-in-out rounded-lg flex flex-col max-h-[calc(100vh-10rem)] ${
                  isCollapsed ? 'w-12' : 'w-72'
                } ${draggedColumnId === column.id ? 'opacity-40 bg-gray-200 border-2 border-dashed border-gray-400' : 'bg-gray-50'} ${
                  isDragOver && !draggedColumnId ? 'ring-2 ring-blue-400 bg-blue-50' : ''
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
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {/* Task Cards */}
                    {columnTasks.map((task: ProjectTask) => {
                      const projectName = getProjectName(task);

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onClick={() => setSelectedTask(task)}
                          className={`group bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200 relative ${
                            draggedTask === task.id ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Task Menu - 3 dot ellipsis */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
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

                          {/* Task Title */}
                          <div className="mb-2 pr-6">
                            <h4 className="text-sm font-small text-gray-900 line-clamp-2">
                              {task.title}
                            </h4>
                          </div>

                          {/* Project Badge */}
                          {projectName && (
                            <div className="mb-2">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                                <FolderOpen className="w-2.5 h-2.5 mr-1" />
                                {projectName}
                              </Badge>
                            </div>
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

                              {/* Priority Indicator - only show if priority is set */}
                              {task.priority && (
                                <Flag
                                  weight="fill"
                                  className={`w-3.5 h-3.5 ${
                                    task.priority === 'high' ? 'text-red-500' :
                                    task.priority === 'medium' ? 'text-yellow-500' : 'text-gray-400'
                                  }`}
                                />
                              )}

                              {/* Due Date */}
                              {task.due_date ? (
                                <Popover>
                                  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                                      <Calendar className="w-3 h-3" />
                                      {format(parseLocalDate(task.due_date), 'MMM d')}
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
                                    <CalendarPicker
                                      mode="single"
                                      selected={parseLocalDate(task.due_date)}
                                      onSelect={(date) => handleQuickDueDate(task.id, date ? format(date, 'yyyy-MM-dd') : null)}
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
                              ) : (
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
                                      onSelect={(date) => handleQuickDueDate(task.id, date ? format(date, 'yyyy-MM-dd') : null)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
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
                                    <button
                                      onClick={() => handleQuickAssign(task.id, null)}
                                      className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded text-gray-500"
                                    >
                                      Unassign
                                    </button>
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
                      );
                    })}

                    {/* Add Task Form - at bottom of column */}
                    {addingToColumn === column.slug ? (
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
                                      newTaskPriority === 'high' ? 'text-red-500' :
                                      newTaskPriority === 'medium' ? 'text-yellow-500' :
                                      'text-gray-400'
                                    }`}
                                    weight="fill"
                                  />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-32 p-2" align="start">
                                <div className="space-y-1">
                                  {(['high', 'medium', 'low'] as const).map((priority) => (
                                    <button
                                      key={priority}
                                      onClick={() => setNewTaskPriority(priority)}
                                      className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 ${
                                        newTaskPriority === priority ? 'bg-blue-50' : ''
                                      }`}
                                    >
                                      <Flag
                                        className={`w-3 h-3 ${
                                          priority === 'high' ? 'text-red-500' :
                                          priority === 'medium' ? 'text-yellow-500' :
                                          'text-gray-400'
                                        }`}
                                        weight="fill"
                                      />
                                      <span className="capitalize">{priority}</span>
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
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create
                      </button>
                    )}
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
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={(taskId) => {
            handleDeleteTask(taskId, selectedTask.project_id);
            setSelectedTask(null);
          }}
          onStatusChange={(taskId, newStatus) => {
            handleStatusUpdate(taskId, newStatus, selectedTask.project_id);
            // Update selected task's status for UI
            setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
          }}
          onLinkProject={handleLinkProject}
        />
      )}

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteTaskDialog.open}
        onOpenChange={(open) => setDeleteTaskDialog({ open, task: open ? deleteTaskDialog.task : null })}
        onConfirm={() => {
          if (deleteTaskDialog.task) {
            handleDeleteTask(deleteTaskDialog.task.id, deleteTaskDialog.task.project_id);
          }
          setDeleteTaskDialog({ open: false, task: null });
        }}
        title="Delete Task"
        description="This action cannot be undone. This task will be permanently deleted."
        itemName={deleteTaskDialog.task?.title}
      />
    </PageContent>
  );
}
