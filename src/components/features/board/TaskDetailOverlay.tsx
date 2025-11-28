/**
 * TaskDetailOverlay Component
 *
 * Jira-like overlay for viewing and editing task details
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X,
  Trash,
  Flag,
  Calendar,
  User,
  FolderOpen,
  Check,
} from '@phosphor-icons/react';
import type { ProjectTask, TaskPriority } from '@/lib/types/projectTasks';
import type { TaskBoardColumn } from '@/lib/types/taskBoardColumns';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
} from '@/lib/types/projectTasks';

interface Member {
  user_id: string;
  full_name: string | null;
  email: string;
  status: string;
}

interface TaskDetailOverlayProps {
  task: ProjectTask;
  columns: TaskBoardColumn[];
  members: Member[];
  currentUserId?: string;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<ProjectTask>) => Promise<void>;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export function TaskDetailOverlay({
  task,
  columns,
  members,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
  onStatusChange,
}: TaskDetailOverlayProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority | null>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [assignee, setAssignee] = useState(task.assigned_to || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [descriptionChanged, setDescriptionChanged] = useState(false);

  // Sync local state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.due_date || '');
    setAssignee(task.assigned_to || '');
    setDescriptionChanged(false);
  }, [task.id]);

  const activeMembers = members.filter(m => m.status === 'Active');

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSave = async (field: string, value: any) => {
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

  const currentColumn = columns.find(c => c.slug === task.status);
  const projectName = task.project?.quote?.project_name;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Overlay Panel */}
      <div className="fixed top-0 right-0 h-full w-[500px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {task.reference && (
              <span className="text-xs font-mono text-gray-500 uppercase">
                {task.reference}
              </span>
            )}
            {projectName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
                <FolderOpen className="w-2.5 h-2.5 mr-1" />
                {projectName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                if (confirm('Delete this task?')) {
                  onDelete(task.id);
                  onClose();
                }
              }}
            >
              <Trash className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Title */}
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
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
                  className="text-lg font-semibold"
                  autoFocus
                />
              </div>
            ) : (
              <h2
                className="text-lg font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded"
                onClick={() => setIsEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">Status</span>
            <Select
              value={task.status}
              onValueChange={(value) => onStatusChange(task.id, value)}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.slug}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                      {col.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">Priority</span>
            <Select
              value={priority || 'none'}
              onValueChange={(value) => {
                const newPriority = value === 'none' ? null : value as TaskPriority;
                setPriority(newPriority);
                handleSave('priority', newPriority);
              }}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-gray-400">None</span>
                </SelectItem>
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    <div className="flex items-center gap-2">
                      <Flag className={`w-3 h-3 ${p === 'high' ? 'text-red-500' : p === 'medium' ? 'text-yellow-500' : 'text-gray-400'}`} />
                      {TASK_PRIORITY_LABELS[p]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">Assignee</span>
            <Select
              value={assignee || 'unassigned'}
              onValueChange={(value) => {
                const newValue = value === 'unassigned' ? '' : value;
                setAssignee(newValue);
                handleSave('assigned_to', newValue || null);
              }}
            >
              <SelectTrigger className="w-48 h-8">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="text-gray-500">Unassigned</span>
                </SelectItem>
                {activeMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-[8px]">
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {member.full_name || member.email}
                      {member.user_id === currentUserId && ' (You)'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-20">Due Date</span>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                handleSave('due_date', e.target.value || null);
              }}
              className="w-40 h-8"
            />
            {dueDate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-gray-400 hover:text-red-500"
                onClick={() => {
                  setDueDate('');
                  handleSave('due_date', null);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Description</span>
              <Button
                size="sm"
                variant={descriptionChanged ? 'default' : 'outline'}
                className="h-7 text-xs gap-1"
                onClick={handleDescriptionSave}
                disabled={isSaving || !descriptionChanged}
              >
                <Check className="w-3 h-3" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <Textarea
              placeholder="Add a description..."
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-400 space-y-1">
            <p>Created {format(new Date(task.created_at), 'MMM d, yyyy \'at\' h:mm a')}</p>
            {task.creator && (
              <p>by {task.creator.full_name || task.creator.email}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
