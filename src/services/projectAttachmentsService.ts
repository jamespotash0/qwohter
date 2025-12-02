/**
 * Project Attachments Service
 *
 * Handles file upload, validation, and management for project attachments.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectAttachment,
  AttachmentCategory,
  AttachmentUploadResult,
  AttachmentValidationResult,
} from '@/lib/types/projectAttachments';

export class ProjectAttachmentsService {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly BUCKET_NAME = 'projects-attachments';

  // Allowed file types for project attachments
  private static readonly ALLOWED_TYPES = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // CAD/Technical drawings
    'application/dwg',
    'application/dxf',
    'image/vnd.dwg',
    'image/vnd.dxf',
    // Other
    'text/plain',
    'application/zip',
  ];

  /**
   * Validates a file before upload
   */
  static validateFile(file: File): AttachmentValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        fileSize: file.size,
      };
    }

    // Check file type (allow all types for flexibility, just warn if unusual)
    if (!this.ALLOWED_TYPES.includes(file.type) && file.type !== '') {
      console.warn(`Unusual file type: ${file.type} for file ${file.name}`);
    }

    return {
      isValid: true,
      fileSize: file.size,
    };
  }

  /**
   * Uploads a file attachment to a project
   */
  static async uploadAttachment(
    projectId: string,
    file: File,
    description?: string,
    category?: AttachmentCategory
  ): Promise<AttachmentUploadResult> {
    try {
      // Validate the file first
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // Get user's organization ID
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'Active')
        .single();

      if (membershipError || !membershipData) {
        return {
          success: false,
          error: 'No active organization found',
        };
      }

      const organizationId = membershipData.organization_id;

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileExtension = sanitizedFileName.substring(sanitizedFileName.lastIndexOf('.'));
      const fileName = `${timestamp}_${sanitizedFileName}`;

      // Upload to storage: organizationId/projectId/fileName
      const filePath = `${organizationId}/${projectId}/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Supabase upload error:', uploadError);
        return {
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        };
      }

      // Create database record (no public_url for private buckets)
      const { data: attachmentData, error: dbError } = await supabase
        .from('project_attachments')
        .insert({
          project_id: projectId,
          organization_id: organizationId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          public_url: '', // Empty for private buckets, will use signed URLs
          uploaded_by: user.id,
          description: description || null,
          category: category || null,
        } as any)
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from(this.BUCKET_NAME).remove([filePath]);
        console.error('❌ Database error:', dbError);
        return {
          success: false,
          error: `Failed to save attachment info: ${dbError.message}`,
        };
      }

      return {
        success: true,
        attachment: attachmentData as ProjectAttachment,
      };
    } catch (error) {
      console.error('💥 Unexpected error during upload:', error);
      return {
        success: false,
        error: 'Upload failed. Please try again.',
      };
    }
  }

  /**
   * Fetches all attachments for a project with signed URLs (for private buckets)
   */
  static async getProjectAttachments(projectId: string): Promise<ProjectAttachment[]> {
    const { data, error } = await supabase
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      throw error;
    }

    const attachments = (data || []) as ProjectAttachment[];

    // Generate signed URLs for each attachment (valid for 1 hour)
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .createSignedUrl(attachment.file_path, 3600); // 1 hour expiration

        if (urlError) {
          console.error('Error creating signed URL:', urlError);
          return {
            ...attachment,
            public_url: '', // Fallback to empty if signed URL creation fails
          };
        }

        return {
          ...attachment,
          public_url: signedUrlData.signedUrl,
        };
      })
    );

    return attachmentsWithUrls;
  }

  /**
   * Deletes an attachment (both file and database record)
   */
  static async deleteAttachment(attachmentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get attachment info first
      const { data: attachment, error: fetchError } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      if (fetchError || !attachment) {
        return {
          success: false,
          error: 'Attachment not found',
        };
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue to delete DB record even if storage deletion fails
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from('project_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) {
        console.error('Error deleting attachment record:', dbError);
        return {
          success: false,
          error: dbError.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return {
        success: false,
        error: 'Failed to delete attachment. Please try again.',
      };
    }
  }

  /**
   * Updates attachment description or category
   */
  static async updateAttachment(
    attachmentId: string,
    updates: { description?: string; category?: AttachmentCategory }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('project_attachments')
        .update(updates)
        .eq('id', attachmentId);

      if (error) {
        console.error('Error updating attachment:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating attachment:', error);
      return {
        success: false,
        error: 'Failed to update attachment. Please try again.',
      };
    }
  }

  /**
   * Gets file icon based on file type
   */
  static getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('dwg') || fileType.includes('dxf')) return '📐';
    if (fileType === 'application/zip') return '📦';
    return '📎';
  }

  /**
   * Formats file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
