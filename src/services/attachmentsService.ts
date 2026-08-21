/**
 * Attachments Service
 *
 * Polymorphic file attachments for back-office entities — acknowledgments on a
 * purchase order, packing slips and damage photos on a receipt, signed delivery
 * tickets on a work order.
 *
 * Files live in the private `projects-attachments` bucket and are read through
 * short-lived signed URLs, matching projectAttachmentsService. Nothing here
 * stores a public URL, because the bucket is not public.
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET_NAME = 'projects-attachments';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
// Matches the projects-attachments bucket cap and the limit project_attachments
// enforced before the two tables were consolidated.
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/** What an attachment hangs off. Mirrors the entity_type CHECK constraint. */
export type AttachmentEntityType =
  | 'project'
  | 'proposal'
  | 'company'
  | 'sales_order'
  | 'order_line'
  | 'vendor_po'
  | 'acknowledgment'
  | 'receipt'
  | 'work_order'
  | 'punch_item';

/** What the file is, independent of what it is attached to. */
export type AttachmentDocumentType =
  | 'acknowledgment'
  | 'packing_slip'
  | 'bill_of_lading'
  | 'damage_photo'
  | 'vendor_invoice'
  | 'customer_invoice'
  | 'quote'
  | 'drawing'
  | 'specification'
  | 'spec_file'
  | 'photo'
  | 'contract'
  | 'other';

export interface Attachment {
  id: string;
  organization_id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  document_type: AttachmentDocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** An attachment with a signed URL resolved for display or download. */
export interface AttachmentWithUrl extends Attachment {
  signed_url: string | null;
}

export interface UploadAttachmentInput {
  /** Resolved from the caller's active membership when omitted. */
  organizationId?: string;
  entityType: AttachmentEntityType;
  entityId: string;
  file: File;
  documentType?: AttachmentDocumentType;
  description?: string;
}

// The Database type fails supabase-js's GenericSchema constraint (no
// `Relationships` key on any table), so both reads and writes resolve to
// `never` and are effectively unchecked. The Attachment interface above
// describes the rows; it does not verify them. See companiesService.
const table = () => supabase.from('attachments' as never);

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): ValidationResult {
  if (file.size === 0) {
    return { valid: false, error: `${file.name} is empty.` };
  }
  if (file.size > MAX_FILE_BYTES) {
    const limitMb = Math.round(MAX_FILE_BYTES / (1024 * 1024));
    return { valid: false, error: `${file.name} is larger than ${limitMb} MB.` };
  }
  return { valid: true };
}

/**
 * Storage path for an uploaded file. Namespaced by organization and entity so a
 * listing of the bucket stays navigable, and prefixed with a timestamp so two
 * uploads of the same filename do not collide.
 */
export function buildFilePath(
  organizationId: string,
  entityType: AttachmentEntityType,
  entityId: string,
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${organizationId}/${entityType}/${entityId}/${Date.now()}_${safeName}`;
}


/**
 * The caller's active organization, for callers that hold only an entity id.
 * Mirrors what projectAttachmentsService did before consolidation.
 */
async function resolveOrganizationId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'Active')
    .single();

  const row = data as unknown as { organization_id: string } | null;

  if (error || !row) {
    console.error('[attachmentsService] resolveOrganizationId failed:', error);
    throw new Error('No active organization found for your account.');
  }

  return row.organization_id;
}

/** Emoji for a file type, used in compact attachment lists. */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '\u{1F5BC}\uFE0F';
  if (fileType === 'application/pdf') return '\u{1F4C4}';
  if (fileType.includes('word') || fileType.includes('document')) return '\u{1F4DD}';
  if (fileType.includes('excel') || fileType.includes('sheet')) return '\u{1F4CA}';
  if (fileType.includes('dwg') || fileType.includes('dxf')) return '\u{1F4D0}';
  if (fileType === 'application/zip') return '\u{1F4E6}';
  return '\u{1F4CE}';
}

/** Human-readable file size. */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

// ============================================================================
// Queries
// ============================================================================

/** Every attachment on one entity, newest first, with signed URLs resolved. */
export async function getAttachments(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<AttachmentWithUrl[]> {
  const { data, error } = await table()
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[attachmentsService] getAttachments failed:', error);
    throw new Error(`Failed to load attachments: ${error.message}`);
  }

  return withSignedUrls((data || []) as unknown as Attachment[]);
}

/**
 * Attachments of one kind across an organization — "every acknowledgment
 * uploaded this week", for the review queue.
 */
export async function getAttachmentsByDocumentType(
  organizationId: string,
  documentType: AttachmentDocumentType,
  limit = 100
): Promise<AttachmentWithUrl[]> {
  const { data, error } = await table()
    .select('*')
    .eq('organization_id', organizationId)
    .eq('document_type', documentType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[attachmentsService] getAttachmentsByDocumentType failed:', error);
    throw new Error(`Failed to load attachments: ${error.message}`);
  }

  return withSignedUrls((data || []) as unknown as Attachment[]);
}

/**
 * Resolve signed URLs for a set of attachments. A file that fails to sign gets a
 * null URL rather than failing the whole list — one missing object should not
 * blank the receipt it belongs to.
 */
async function withSignedUrls(rows: Attachment[]): Promise<AttachmentWithUrl[]> {
  return Promise.all(
    rows.map(async row => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS);

      if (error) {
        console.error('[attachmentsService] createSignedUrl failed:', row.file_path, error);
      }

      return { ...row, signed_url: data?.signedUrl ?? null };
    })
  );
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Upload a file and record it against an entity.
 *
 * The storage object is removed if the database insert fails, so a failed upload
 * does not leave an unreferenced file behind.
 */
export async function uploadAttachment(
  input: UploadAttachmentInput
): Promise<Attachment> {
  const { entityType, entityId, file } = input;

  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in to upload a file.');
  }

  const organizationId = input.organizationId ?? (await resolveOrganizationId(user.id));

  const filePath = buildFilePath(organizationId, entityType, entityId, file.name);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('[attachmentsService] upload failed:', uploadError);
    throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
  }

  const { data, error } = await table()
    .insert({
      organization_id: organizationId,
      entity_type: entityType,
      entity_id: entityId,
      document_type: input.documentType ?? 'other',
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type ? file.type : 'application/octet-stream',
      description: input.description ?? null,
      uploaded_by: user.id,
    } as never)
    .select()
    .single();

  if (error) {
    // Roll the storage object back so the bucket does not accumulate orphans.
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    console.error('[attachmentsService] insert failed, upload rolled back:', error);
    throw new Error(`Failed to record ${file.name}: ${error.message}`);
  }

  return data as unknown as Attachment;
}

export async function updateAttachment(
  attachmentId: string,
  patch: { description?: string | null; document_type?: AttachmentDocumentType }
): Promise<Attachment> {
  const { data, error } = await table()
    .update(patch as never)
    .eq('id', attachmentId)
    .select()
    .single();

  if (error) {
    console.error('[attachmentsService] updateAttachment failed:', error);
    throw new Error(`Failed to update attachment: ${error.message}`);
  }

  return data as unknown as Attachment;
}

/**
 * Delete an attachment and its stored file.
 *
 * The row is removed first: if storage removal then fails the file is orphaned,
 * which is recoverable, whereas the reverse leaves a row pointing at nothing.
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const { data: row, error: fetchError } = await table()
    .select('file_path')
    .eq('id', attachmentId)
    .maybeSingle();

  if (fetchError) {
    console.error('[attachmentsService] deleteAttachment lookup failed:', fetchError);
    throw new Error(`Failed to delete attachment: ${fetchError.message}`);
  }

  const { error } = await table().delete().eq('id', attachmentId);

  if (error) {
    console.error('[attachmentsService] deleteAttachment failed:', error);
    throw new Error(`Failed to delete attachment: ${error.message}`);
  }

  const filePath = (row as unknown as { file_path?: string } | null)?.file_path;
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    if (storageError) {
      // Non-fatal: the record is gone, the object is now unreferenced.
      console.error('[attachmentsService] storage cleanup failed:', storageError);
    }
  }
}

/**
 * Remove every attachment for an entity. Call this when deleting a parent row —
 * entity_id carries no foreign key, so nothing cascades on its own.
 */
export async function deleteAttachmentsForEntity(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<void> {
  const { data, error: fetchError } = await table()
    .select('file_path')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (fetchError) {
    console.error('[attachmentsService] cascade lookup failed:', fetchError);
    throw new Error(`Failed to delete attachments: ${fetchError.message}`);
  }

  const { error } = await table()
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    console.error('[attachmentsService] cascade delete failed:', error);
    throw new Error(`Failed to delete attachments: ${error.message}`);
  }

  const paths = ((data || []) as unknown as { file_path: string }[]).map(r => r.file_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);
    if (storageError) {
      console.error('[attachmentsService] cascade storage cleanup failed:', storageError);
    }
  }
}

/** Download URL for a single attachment, signed fresh. */
export async function getDownloadUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error('[attachmentsService] getDownloadUrl failed:', error);
    return null;
  }

  return data?.signedUrl ?? null;
}
