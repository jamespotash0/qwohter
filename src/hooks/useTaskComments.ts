/**
 * useTaskComments Hook
 *
 * React Query hooks for task comments, attachments, and activity
 * Includes realtime subscriptions for automatic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTaskComments,
  createTaskComment,
  updateTaskComment,
  deleteTaskComment,
  fetchTaskAttachments,
  uploadTaskAttachment,
  deleteTaskAttachment,
  fetchTaskActivity,
} from '@/services/taskCommentsService';
import type {
  TaskComment,
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
  TaskAttachment,
} from '@/lib/types/taskComments';
import { useToast } from '@/hooks/use-toast';

const COMMENTS_KEY = 'task-comments';
const ATTACHMENTS_KEY = 'task-attachments';
const ACTIVITY_KEY = 'task-activity';

// =============================================================================
// Task Comments Hooks
// =============================================================================

/**
 * Fetch all comments for a task
 */
export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: [COMMENTS_KEY, taskId],
    queryFn: () => fetchTaskComments(taskId!),
    enabled: !!taskId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * User info for optimistic updates
 */
interface CurrentUserInfo {
  id: string;
  full_name?: string | null;
  email?: string;
}

/**
 * Create a new comment
 */
export function useCreateTaskComment(
  taskId: string,
  organizationId: string,
  currentUser?: CurrentUserInfo
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: Omit<CreateTaskCommentInput, 'task_id' | 'organization_id'>) =>
      createTaskComment({ ...input, task_id: taskId, organization_id: organizationId }),
    onMutate: async (newComment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [COMMENTS_KEY, taskId] });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<TaskComment[]>([COMMENTS_KEY, taskId]);

      // Optimistically add new comment with user info for immediate display
      const optimisticComment: Partial<TaskComment> = {
        id: `temp-${Date.now()}`,
        task_id: taskId,
        user_id: currentUser?.id,
        content: newComment.content,
        mentions: newComment.mentions || [],
        parent_id: newComment.parent_id || null,
        is_edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        replies: [],
        reply_count: 0,
        // Include user info so comment displays correctly immediately
        user: currentUser
          ? {
              id: currentUser.id,
              full_name: currentUser.full_name || currentUser.email || 'You',
              email: currentUser.email || '',
            }
          : undefined,
      };

      if (newComment.parent_id) {
        // Add as reply to existing comment
        queryClient.setQueryData<TaskComment[]>([COMMENTS_KEY, taskId], (old) => {
          if (!old) return old;
          return old.map((comment) => {
            if (comment.id === newComment.parent_id) {
              return {
                ...comment,
                replies: [...(comment.replies || []), optimisticComment as TaskComment],
                reply_count: (comment.reply_count || 0) + 1,
              };
            }
            return comment;
          });
        });
      } else {
        // Add as new top-level comment
        queryClient.setQueryData<TaskComment[]>([COMMENTS_KEY, taskId], (old) => [
          ...(old || []),
          optimisticComment as TaskComment,
        ]);
      }

      return { previousComments };
    },
    onError: (err, _newComment, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData([COMMENTS_KEY, taskId], context.previousComments);
      }
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch to get server state
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [ACTIVITY_KEY, taskId] });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ commentId, input }: { commentId: string; input: UpdateTaskCommentInput }) =>
      updateTaskComment(commentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, taskId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a comment
 */
export function useDeleteTaskComment(taskId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (commentId: string) => deleteTaskComment(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: [COMMENTS_KEY, taskId] });

      const previousComments = queryClient.getQueryData<TaskComment[]>([COMMENTS_KEY, taskId]);

      // Optimistically remove the comment
      queryClient.setQueryData<TaskComment[]>([COMMENTS_KEY, taskId], (old) => {
        if (!old) return old;
        return old
          .filter((c) => c.id !== commentId)
          .map((comment) => ({
            ...comment,
            replies: (comment.replies || []).filter((r) => r.id !== commentId),
            reply_count: (comment.replies || []).filter((r) => r.id !== commentId).length,
          }));
      });

      return { previousComments };
    },
    onError: (err, _commentId, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData([COMMENTS_KEY, taskId], context.previousComments);
      }
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [ACTIVITY_KEY, taskId] });
    },
  });
}

// =============================================================================
// Task Attachments Hooks
// =============================================================================

/**
 * Fetch all attachments for a task
 */
export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: [ATTACHMENTS_KEY, taskId],
    queryFn: () => fetchTaskAttachments(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Upload an attachment
 */
export function useUploadTaskAttachment(taskId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => uploadTaskAttachment(taskId, organizationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [ACTIVITY_KEY, taskId] });
      toast({
        title: 'File uploaded',
        description: 'Attachment added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete an attachment
 */
export function useDeleteTaskAttachment(taskId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (attachment: TaskAttachment) => deleteTaskAttachment(attachment),
    onMutate: async (attachment) => {
      await queryClient.cancelQueries({ queryKey: [ATTACHMENTS_KEY, taskId] });

      const previousAttachments = queryClient.getQueryData<TaskAttachment[]>([ATTACHMENTS_KEY, taskId]);

      // Optimistically remove
      queryClient.setQueryData<TaskAttachment[]>([ATTACHMENTS_KEY, taskId], (old) =>
        (old || []).filter((a) => a.id !== attachment.id)
      );

      return { previousAttachments };
    },
    onError: (err, _attachment, context) => {
      if (context?.previousAttachments) {
        queryClient.setQueryData([ATTACHMENTS_KEY, taskId], context.previousAttachments);
      }
      toast({
        title: 'Error',
        description: 'Failed to delete attachment',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_KEY, taskId] });
      queryClient.invalidateQueries({ queryKey: [ACTIVITY_KEY, taskId] });
    },
  });
}

// =============================================================================
// Task Activity Hooks
// =============================================================================

/**
 * Fetch activity log for a task
 */
export function useTaskActivity(taskId: string | undefined) {
  return useQuery({
    queryKey: [ACTIVITY_KEY, taskId],
    queryFn: () => fetchTaskActivity(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
