/**
 * ProjectTasks Component
 *
 * Displays and manages project tasks with assignee support
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useProjectTasks,
  useCreateProjectTask,
  useDeleteProjectTask,
  useUpdateTaskStatus,
  useUpdateTaskPriority,
  useAssignTask,
} from '@/hooks/useProjectTasks';
import { useOrganizationMembers } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';
import type {
  ProjectTask,
  TaskStatus,
  TaskPriority,
} from '@/lib/types/projectTasks';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/lib/types/projectTasks';
import {
  Plus as PlusIcon,
  DotsThreeVertical,
  Trash,
  Calendar,
  CheckSquare,
  Flag,
  User,
} from '@phosphor-icons/react';

interface ProjectTasksProps {
  projectId: string;
  organizationId: string;
  projectName?: string;
}

export function ProjectTasks({ projectId, organizationId, projectName }: ProjectTasksProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');

  const user = useUser();
  const { data: members = [] } = useOrganizationMembers(organizationId);
  const { data: tasks = [], isLoading } = useProjectTasks(projectId);
  const createTask = useCreateProjectTask(organizationId, projectId);
  const deleteTask = useDeleteProjectTask(organizationId, projectId);
  const updateStatus = useUpdateTaskStatus(organizationId, projectId);
  const updatePriority = useUpdateTaskPriority(organizationId, projectId);
  const assignTask = useAssignTask(organizationId, projectId);

  // Filter active members for assignee dropdown
  const activeMembers = members.filter(m => m.status === 'Active');

  const handleSubmit = async () => {
    if (!title.trim()) return;

    await createTask.mutateAsync({
      project_id: projectId,
      title: title.trim(),
      priority,
      due_date: dueDate || undefined,
      assigned_to: assigneeId || undefined,
    });

    setTitle('');
    setPriority('medium');
    setDueDate('');
    setAssigneeId('');
    setIsAdding(false);
  };

  const handleToggleComplete = (task: ProjectTask) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ taskId: task.id, status: newStatus });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Group tasks by status
  const todoTasks = tasks.filter((t: ProjectTask) => t.status === 'todo');
  const inProgressTasks = tasks.filter((t: ProjectTask) => t.status === 'in_progress');
  const doneTasks = tasks.filter((t: ProjectTask) => t.status === 'done');

  if (isLoading) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        Loading tasks...
      </div>
    );
  }

  const TaskItem = ({ task }: { task: ProjectTask }) => (
    <div
      className={`flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group ${
        task.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      <Checkbox
        checked={task.status === 'done'}
        onCheckedChange={() => handleToggleComplete(task)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm ${
              task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'
            }`}
          >
            {task.title}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${TASK_PRIORITY_COLORS[task.priority]}`}
          >
            <Flag className="w-2.5 h-2.5 mr-0.5" />
            {TASK_PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {task.due_date && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(parseLocalDate(task.due_date), 'MMM d')}
            </span>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                  {getInitials(task.assignee.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500">{task.assignee.full_name}</span>
            </div>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <DotsThreeVertical className="w-4 h-4 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => updateStatus.mutate({ taskId: task.id, status: 'todo' })}
            disabled={task.status === 'todo'}
          >
            Move to To Do
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateStatus.mutate({ taskId: task.id, status: 'in_progress' })}
            disabled={task.status === 'in_progress'}
          >
            Move to In Progress
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateStatus.mutate({ taskId: task.id, status: 'done' })}
            disabled={task.status === 'done'}
          >
            Move to Done
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => deleteTask.mutate(task.id)}
            className="text-red-600"
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Add Task Form */}
      {isAdding && (
        <div className="pt-2">
          <div className="rounded-lg border border-gray-300 bg-white p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Task Name</label>
              <Input
                placeholder="e.g., Review floor plans"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Assign To</label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select team member..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-gray-500">Unassigned</span>
                  </SelectItem>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {member.full_name || member.email}
                        {member.user_id === user?.id && ' (You)'}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {TASK_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || createTask.isPending}
                size="sm"
                variant="default"
                className="flex-1"
              >
                {createTask.isPending ? 'Adding...' : 'Add Task'}
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setTitle('');
                  setPriority('medium');
                  setDueDate('');
                  setAssigneeId('');
                }}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No tasks yet
        </div>
      ) : (
        <div className="space-y-4">
          {/* To Do */}
          {todoTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={TASK_STATUS_COLORS.todo}>
                  {TASK_STATUS_LABELS.todo}
                </Badge>
                <span className="text-xs text-gray-500">{todoTasks.length}</span>
              </div>
              <div className="border rounded-lg divide-y">
                {todoTasks.map((task: ProjectTask) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* In Progress */}
          {inProgressTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={TASK_STATUS_COLORS.in_progress}>
                  {TASK_STATUS_LABELS.in_progress}
                </Badge>
                <span className="text-xs text-gray-500">{inProgressTasks.length}</span>
              </div>
              <div className="border rounded-lg divide-y">
                {inProgressTasks.map((task: ProjectTask) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {doneTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={TASK_STATUS_COLORS.done}>
                  {TASK_STATUS_LABELS.done}
                </Badge>
                <span className="text-xs text-gray-500">{doneTasks.length}</span>
              </div>
              <div className="border rounded-lg divide-y">
                {doneTasks.map((task: ProjectTask) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task Button */}
      {!isAdding && (
        <div className="pt-2">
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="outline"
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        </div>
      )}
    </div>
  );
}
