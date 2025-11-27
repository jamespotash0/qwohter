/**
 * TaskBoard Page
 *
 * Organization-wide kanban board for all tasks
 * Supports custom columns and standalone/project-linked tasks
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { PageContent } from '@/components/common/layout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useUser } from '@/auth';
import type { ProjectTask, TaskPriority } from '@/lib/types/projectTasks';
import type { TaskBoardColumn } from '@/lib/types/taskBoardColumns';
import { COLUMN_COLORS } from '@/lib/types/taskBoardColumns';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/lib/types/projectTasks';
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
} from '@phosphor-icons/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function TaskBoard() {
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');
  const organizationId = organization?.id || '';

  // Fetch columns and tasks
  const { data: columns = [], isLoading: columnsLoading } = useTaskBoardColumns(organizationId);
  const { data: tasks = [], isLoading: tasksLoading } = useOrganizationTasks(organizationId);
  const { data: members = [] } = useOrganizationMembers(organizationId);
  const createTask = useCreateProjectTask(organizationId, '');
  const createColumn = useCreateTaskBoardColumn(organizationId);
  const updateColumn = useUpdateTaskBoardColumn(organizationId);
  const deleteColumn = useDeleteTaskBoardColumn(organizationId);
  const reorderColumns = useReorderTaskBoardColumns(organizationId);

  // State for new task form
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // State for new column (inline form like Project Board)
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
        handleStatusUpdate(draggedTask, newStatus, task.project_id);
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

  const handleAddTask = async (status: string) => {
    if (!newTaskTitle.trim()) return;

    await createTask.mutateAsync({
      project_id: null,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      status: status as any,
      priority: newTaskPriority,
      due_date: newTaskDueDate || undefined,
      assigned_to: newTaskAssignee || undefined,
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setNewTaskAssignee('');
    setIsAddingTask(null);

    const { queryClient } = await import('@/lib/queryClient');
    queryClient.invalidateQueries({ queryKey: ['organization-tasks', organizationId] });
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

    // Reorder array
    const reordered = [...sortedCols];
    const [removed] = reordered.splice(draggedIndex, 1);
    if (removed) {
      reordered.splice(targetIndex, 0, removed);
    }

    // Update positions
    await reorderColumns.mutateAsync(reordered.map(c => c.id));

    setDraggedColumnId(null);
    setDragOverColumnId(null);
    setColumnDropSide(null);
  };

  const handleDeleteColumn = async (columnId: string, columnSlug: string) => {
    // Check if there are tasks in this column
    const tasksInColumn = getTasksByStatus(columnSlug);
    if (tasksInColumn.length > 0) {
      alert('Cannot delete column with tasks. Move or delete tasks first.');
      return;
    }
    await deleteColumn.mutateAsync(columnId);
  };

  const getInitials = (name?: string) => {
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
              {/* Column drop indicator - left */}
              {dragOverColumnId === column.id && columnDropSide === 'left' && (
                <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
              )}
              {/* Column drop indicator - right */}
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

                        {/* Drag handle - only for non-default columns */}
                        {!column.is_default && (
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
                        )}

                        {/* Column name - editable */}
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

                        {/* Add Task Button */}
                        <button
                          onClick={() => setIsAddingTask(column.slug)}
                          className="p-1 hover:bg-gray-100 rounded ml-auto"
                          title="Add task"
                        >
                          <Plus className="w-4 h-4 text-gray-500" />
                        </button>

                        {/* Column Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded">
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
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {/* Add Task Form */}
                {isAddingTask === column.slug && (
                  <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3 shadow-sm">
                    <Input
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="text-sm"
                      autoFocus
                    />
                    <Textarea
                      placeholder="Description (optional)..."
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={newTaskPriority} onValueChange={(v) => setNewTaskPriority(v as TaskPriority)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                            <SelectItem key={p} value={p}>
                              {TASK_PRIORITY_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Select
                      value={newTaskAssignee || 'unassigned'}
                      onValueChange={(v) => setNewTaskAssignee(v === 'unassigned' ? '' : v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {activeMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.full_name || member.email}
                            {member.user_id === user?.id && ' (You)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8"
                        onClick={() => handleAddTask(column.slug)}
                        disabled={!newTaskTitle.trim() || createTask.isPending}
                      >
                        {createTask.isPending ? 'Adding...' : 'Add Task'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setIsAddingTask(null);
                          setNewTaskTitle('');
                          setNewTaskDescription('');
                          setNewTaskPriority('medium');
                          setNewTaskDueDate('');
                          setNewTaskAssignee('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Task Cards */}
                {columnTasks.map((task: ProjectTask) => {
                  const projectName = getProjectName(task);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab hover:shadow-md transition-all duration-200 ${
                        draggedTask === task.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          {task.reference && (
                            <span className="text-[10px] font-mono text-gray-400 uppercase">
                              {task.reference}
                            </span>
                          )}
                          <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                            {task.title}
                          </h4>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
                              <DotsThreeVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {columns.filter((c: TaskBoardColumn) => c.slug !== task.status).map((col: TaskBoardColumn) => (
                              <DropdownMenuItem
                                key={col.id}
                                onClick={() => handleStatusUpdate(task.id, col.slug, task.project_id)}
                              >
                                Move to {col.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id, task.project_id)}
                              className="text-red-600"
                            >
                              <Trash className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {projectName && (
                        <div className="flex items-center gap-1 mb-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                            <FolderOpen className="w-2.5 h-2.5 mr-1" />
                            {projectName}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${TASK_PRIORITY_COLORS[task.priority]}`}
                          >
                            <Flag className="w-2.5 h-2.5 mr-0.5" />
                            {TASK_PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {task.due_date && (
                            <span className="text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(task.due_date), 'MMM d')}
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                              {getInitials(task.assignee.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  );
                })}

                {columnTasks.length === 0 && isAddingTask !== column.slug && !isCollapsed && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No tasks
                  </div>
                )}
              </div>
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
    </PageContent>
  );
}
