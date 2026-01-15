/**
 * Task Comments & Attachments Types
 *
 * Type definitions for task collaboration features:
 * - Comments with @mentions
 * - File attachments
 * - Activity tracking
 */

// =============================================================================
// Task Comments
// =============================================================================

export interface TaskComment {
  id: string;
  task_id: string;
  organization_id: string;
  user_id: string;
  content: string;
  mentions: string[]; // Array of user IDs mentioned in the comment
  parent_id: string | null; // For threaded replies
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  replies?: TaskComment[];
  reply_count?: number;
}

export interface CreateTaskCommentInput {
  task_id: string;
  organization_id: string;
  content: string;
  mentions?: string[];
  parent_id?: string | null;
}

export interface UpdateTaskCommentInput {
  content: string;
  mentions?: string[];
}

// =============================================================================
// Task Attachments
// =============================================================================

export type AttachmentType = 'image' | 'document' | 'video' | 'other';

export interface TaskAttachment {
  id: string;
  task_id: string;
  organization_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number; // in bytes
  file_type: string; // MIME type
  attachment_type: AttachmentType;
  thumbnail_url?: string | null;
  created_at: string;
  // Joined data
  uploader?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface CreateTaskAttachmentInput {
  task_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  file_type: string;
  attachment_type: AttachmentType;
  thumbnail_url?: string | null;
}

// =============================================================================
// Task Activity (for activity feed)
// =============================================================================

export type TaskActivityType =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'priority_changed'
  | 'due_date_changed'
  | 'description_updated'
  | 'title_updated'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_removed'
  | 'project_linked'
  | 'project_unlinked';

export interface TaskActivity {
  id: string;
  task_id: string;
  organization_id: string;
  user_id: string;
  activity_type: TaskActivityType;
  metadata: TaskActivityMetadata;
  created_at: string;
  // Joined data
  user?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface TaskActivityMetadata {
  // Status change
  from_status?: string;
  to_status?: string;
  // Assignment
  assigned_to?: string;
  assigned_to_name?: string;
  // Priority
  from_priority?: string;
  to_priority?: string;
  // Due date
  from_due_date?: string | null;
  to_due_date?: string | null;
  // Title
  from_title?: string;
  to_title?: string;
  // Comment
  comment_id?: string;
  comment_preview?: string;
  // Attachment
  attachment_id?: string;
  file_name?: string;
  // Project
  project_id?: string;
  project_name?: string;
  [key: string]: unknown;
}

// =============================================================================
// Mention Types
// =============================================================================

export interface MentionSuggestion {
  id: string;
  display: string;
  email?: string;
  avatar_url?: string | null;
}

export interface ParsedMention {
  userId: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
}

// =============================================================================
// Activity Type Labels & Icons
// =============================================================================

export const ACTIVITY_TYPE_LABELS: Record<TaskActivityType, string> = {
  created: 'created this task',
  status_changed: 'changed the status',
  assigned: 'assigned',
  unassigned: 'unassigned',
  priority_changed: 'changed priority',
  due_date_changed: 'updated due date',
  description_updated: 'updated description',
  title_updated: 'updated title',
  comment_added: 'commented',
  attachment_added: 'added attachment',
  attachment_removed: 'removed attachment',
  project_linked: 'linked to project',
  project_unlinked: 'unlinked from project',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse mentions from comment content
 * Mentions are in format @[User Name](user_id)
 */
export function parseMentions(content: string): ParsedMention[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: ParsedMention[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const displayName = match[1];
    const userId = match[2];
    if (displayName && userId) {
      mentions.push({
        displayName,
        userId,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  return mentions;
}

/**
 * Extract user IDs from mentions in content
 */
export function extractMentionedUserIds(content: string): string[] {
  return parseMentions(content).map((m) => m.userId);
}

/**
 * Render content with mentions as styled spans
 */
export function renderContentWithMentions(content: string): string {
  return content.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    '<span class="mention" data-user-id="$2">@$1</span>'
  );
}

/**
 * Get file type category from MIME type
 */
export function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('text/')
  ) {
    return 'document';
  }
  return 'other';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
