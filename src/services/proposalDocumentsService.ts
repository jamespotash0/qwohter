/**
 * Proposal Documents Service
 *
 * Handles file upload, validation, and management for proposal documents.
 * Files are stored in Supabase Storage bucket 'proposal-documents'.
 * Metadata is stored in the 'proposal_documents' table.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface ProposalDocument {
  id: string;
  proposal_id: string;
  organization_id: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  tab_key: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // Runtime property - signed URL for download
  download_url?: string;
}

export interface UploadDocumentResult {
  success: boolean;
  document?: ProposalDocument;
  error?: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
}

// ============================================================================
// Constants
// ============================================================================

const BUCKET_NAME = 'proposal-documents';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates a file before upload
 */
export function validateFile(file: File): DocumentValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      fileSize: file.size,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: PDF, images, Word, Excel, CSV, text.`,
      fileSize: file.size,
    };
  }

  return { isValid: true, fileSize: file.size };
}

// ============================================================================
// Upload Operations
// ============================================================================

/**
 * Uploads a document to a proposal
 *
 * @param proposalId - UUID of the proposal
 * @param organizationId - UUID of the organization
 * @param file - File to upload
 * @param options - Optional metadata (tabKey, description)
 */
export async function uploadProposalDocument(
  proposalId: string,
  organizationId: string,
  file: File,
  options?: { tabKey?: string; description?: string }
): Promise<UploadDocumentResult> {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;

    // Storage path: {organization_id}/{proposal_id}/{filename}
    const storagePath = `${organizationId}/${proposalId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    // Create database record
    const { data: document, error: dbError } = await supabase
      .from('proposal_documents')
      .insert({
        proposal_id: proposalId,
        organization_id: organizationId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        tab_key: options?.tabKey || null,
        description: options?.description || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      console.error('Database insert error:', dbError);
      return { success: false, error: `Failed to save document info: ${dbError.message}` };
    }

    return { success: true, document: document as ProposalDocument };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return { success: false, error: 'Upload failed. Please try again.' };
  }
}

// ============================================================================
// Fetch Operations
// ============================================================================

/**
 * Fetches all documents for a proposal with signed download URLs
 *
 * @param proposalId - UUID of the proposal
 * @returns Array of documents with download URLs
 */
export async function getProposalDocuments(proposalId: string): Promise<ProposalDocument[]> {
  const { data, error } = await supabase
    .from('proposal_documents')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  const documents = (data || []) as ProposalDocument[];

  // Generate signed URLs for each document (valid for 1 hour)
  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => {
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.storage_path, 3600);

      if (urlError) {
        console.error('Error creating signed URL:', urlError);
        return { ...doc, download_url: '' };
      }

      return { ...doc, download_url: signedUrlData.signedUrl };
    })
  );

  return documentsWithUrls;
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Deletes a document (both file and database record)
 *
 * @param documentId - UUID of the document to delete
 */
export async function deleteProposalDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get document info first
    const { data: document, error: fetchError } = await supabase
      .from('proposal_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return { success: false, error: 'Document not found' };
    }

    const typedDoc = document as ProposalDocument;

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([typedDoc.storage_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue to delete DB record even if storage deletion fails
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('proposal_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Error deleting document record:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: 'Failed to delete document. Please try again.' };
  }
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Updates document metadata (description)
 */
export async function updateProposalDocument(
  documentId: string,
  updates: { description?: string }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('proposal_documents')
    .update(updates)
    .eq('id', documentId);

  if (error) {
    console.error('Error updating document:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Gets file type category for icon display
 */
export function getFileCategory(mimeType: string | null): 'pdf' | 'image' | 'word' | 'excel' | 'text' | 'other' {
  if (!mimeType) return 'other';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType.includes('csv')) return 'excel';
  if (mimeType.startsWith('text/')) return 'text';
  return 'other';
}
