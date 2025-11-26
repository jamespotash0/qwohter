/**
 * Project Attachments Types
 *
 * Type definitions for project file attachments (drawings, invoices, photos, etc.)
 */

export interface ProjectAttachment {
  id: string;
  project_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  public_url: string;
  uploaded_by: string;
  description?: string;
  category?: AttachmentCategory;
  created_at: string;
  updated_at: string;
}

export type AttachmentCategory =
  | 'drawing'
  | 'invoice'
  | 'photo'
  | 'contract'
  | 'specification'
  | 'proposal'
  | 'other';

export interface UploadAttachmentData {
  project_id: string;
  file: File;
  description?: string;
  category?: AttachmentCategory;
}

export interface AttachmentUploadResult {
  success: boolean;
  attachment?: ProjectAttachment;
  error?: string;
}

export interface AttachmentValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
}
