/**
 * Task Comments Service
 *
 * Service for managing task comments, attachments, and activity
 *
 * NOTE: This service uses tables created by migration 20260115000001_create_task_comments_tables.sql
 * After running the migration, regenerate types with: supabase gen types typescript
 * Until then, type assertions are used to bypass Supabase's generated types.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TaskComment,
  CreateTaskCommentInput,
  UpdateTaskCommentInput,
  TaskAttachment,
  TaskActivity,
} from '@/lib/types/taskComments';

// Type helpers for tables not yet in generated Supabase types
// After running migration and `supabase gen types typescript`, these can be removed
interface TaskCommentRow {
  id: string;
  task_id: string;
  organization_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  parent_id: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Task Comments
// =============================================================================

/**
 * Fetch all comments for a task (with replies)
 */
export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      user:profiles!task_comments_user_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('task_id', taskId)
    .is('parent_id', null) // Only top-level comments
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Fetch reply counts for each comment
  const comments = data as unknown as TaskComment[];

  // Get replies for each comment
  const commentIds = comments.map(c => c.id);
  if (commentIds.length > 0) {
    const { data: replies } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:profiles!task_comments_user_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .in('parent_id', commentIds)
      .order('created_at', { ascending: true });

    // Attach replies to their parent comments
    const typedReplies = (replies || []) as unknown as TaskCommentRow[];
    const repliesByParent = typedReplies.reduce((acc, reply) => {
      const parentId = reply.parent_id;
      if (parentId) {
        if (!acc[parentId]) acc[parentId] = [];
        acc[parentId].push(reply as unknown as TaskComment);
      }
      return acc;
    }, {} as Record<string, TaskComment[]>);

    comments.forEach(comment => {
      comment.replies = repliesByParent[comment.id] || [];
      comment.reply_count = comment.replies.length;
    });
  }

  return comments;
}

/**
 * Create a new comment on a task
 */
export async function createTaskComment(
  input: CreateTaskCommentInput
): Promise<TaskComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Type assertion needed until migration is applied and types regenerated
  const { data, error } = await (supabase
    .from('task_comments') as ReturnType<typeof supabase.from>)
    .insert({
      task_id: input.task_id,
      organization_id: input.organization_id,
      user_id: user.id,
      content: input.content,
      mentions: input.mentions || [],
      parent_id: input.parent_id || null,
    } as Record<string, unknown>)
    .select(`
      *,
      user:profiles!task_comments_user_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data as unknown as TaskComment;
}

/**
 * Update a comment
 */
export async function updateTaskComment(
  commentId: string,
  input: UpdateTaskCommentInput
): Promise<TaskComment> {
  // Type assertion needed until migration is applied and types regenerated
  const { data, error } = await (supabase
    .from('task_comments') as ReturnType<typeof supabase.from>)
    .update({
      content: input.content,
      mentions: input.mentions || [],
      is_edited: true,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', commentId)
    .select(`
      *,
      user:profiles!task_comments_user_id_fkey (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  return data as unknown as TaskComment;
}

/**
 * Delete a comment
 */
export async function deleteTaskComment(commentId: string): Promise<void> {
  // First delete all replies
  await supabase
    .from('task_comments')
    .delete()
    .eq('parent_id', commentId);

  // Then delete the comment itself
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

// =============================================================================
// Task Attachments
// =============================================================================

/**
 * Fetch all attachments for a task (with signed URLs for private bucket)
 */
export async function fetchTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Generate signed URLs for private bucket access
  const attachments = (data || []) as unknown as TaskAttachment[];

  for (const attachment of attachments) {
    const { data: signedData } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

    if (signedData?.signedUrl) {
      attachment.file_url = signedData.signedUrl;
    }
  }

  return attachments;
}

/**
 * Upload a file and create attachment record (private bucket with signed URLs)
 */
export async function uploadTaskAttachment(
  taskId: string,
  organizationId: string,
  file: File
): Promise<TaskAttachment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Generate unique file path
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${organizationId}/tasks/${taskId}/${fileName}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get signed URL for private bucket (1 hour expiry)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('task-attachments')
    .createSignedUrl(filePath, 3600);

  if (signedError) throw signedError;

  // Determine attachment type
  let attachmentType: 'image' | 'document' | 'video' | 'other' = 'other';
  if (file.type.startsWith('image/')) attachmentType = 'image';
  else if (file.type.startsWith('video/')) attachmentType = 'video';
  else if (file.type.includes('pdf') || file.type.includes('document')) attachmentType = 'document';

  // Create attachment record (store path, URL will be regenerated on fetch)
  // Type assertion needed until migration is applied and types regenerated
  const { data, error } = await (supabase
    .from('task_attachments') as ReturnType<typeof supabase.from>)
    .insert({
      task_id: taskId,
      organization_id: organizationId,
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_url: signedData.signedUrl,
      file_size: file.size,
      file_type: file.type,
      attachment_type: attachmentType,
    } as Record<string, unknown>)
    .select('*')
    .single();

  if (error) throw error;
  return data as unknown as TaskAttachment;
}

/**
 * Delete an attachment
 */
export async function deleteTaskAttachment(attachment: TaskAttachment): Promise<void> {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('task-attachments')
    .remove([attachment.file_path]);

  if (storageError) {
    console.warn('Failed to delete file from storage:', storageError);
  }

  // Delete record
  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachment.id);

  if (error) throw error;
}

// =============================================================================
// Task Activity
// =============================================================================

/**
 * Fetch activity log for a task
 */
export async function fetchTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const { data, error } = await supabase
    .from('task_activities')
    .select(`
      *,
      user:profiles!task_activities_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as unknown as TaskActivity[];
}

/**
 * Log a task activity
 */
export async function logTaskActivity(
  taskId: string,
  organizationId: string,
  activityType: TaskActivity['activity_type'],
  metadata: TaskActivity['metadata'] = {}
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Type assertion needed until migration is applied and types regenerated
  const { error } = await (supabase
    .from('task_activities') as ReturnType<typeof supabase.from>)
    .insert({
      task_id: taskId,
      organization_id: organizationId,
      user_id: user.id,
      activity_type: activityType,
      metadata,
    } as Record<string, unknown>);

  if (error) {
    console.warn('Failed to log task activity:', error);
  }
}
