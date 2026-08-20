/**
 * React Query hooks for polymorphic attachments.
 *
 * Signed URLs expire, so the cache is deliberately short-lived — a stale entry
 * renders a dead link rather than a missing one, which is worse.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  getAttachments,
  getAttachmentsByDocumentType,
  uploadAttachment,
  updateAttachment,
  deleteAttachment,
  type AttachmentWithUrl,
  type AttachmentEntityType,
  type AttachmentDocumentType,
  type UploadAttachmentInput,
} from '@/services/attachmentsService';

export type {
  Attachment,
  AttachmentWithUrl,
  AttachmentEntityType,
  AttachmentDocumentType,
} from '@/services/attachmentsService';
export { getDownloadUrl, validateFile } from '@/services/attachmentsService';

// Signed URLs are issued for an hour; refetch well inside that window.
const SIGNED_URL_STALE_TIME = 30 * 60 * 1000;

export const attachmentsQueryKeys = {
  all: ['attachments'] as const,
  entity: (entityType: AttachmentEntityType, entityId: string) =>
    [...attachmentsQueryKeys.all, entityType, entityId] as const,
  byDocumentType: (organizationId: string, documentType: AttachmentDocumentType) =>
    [...attachmentsQueryKeys.all, 'org', organizationId, documentType] as const,
};

/** Every file attached to one entity, newest first. */
export function useAttachments(
  entityType?: AttachmentEntityType,
  entityId?: string
) {
  return useQuery({
    queryKey: attachmentsQueryKeys.entity(
      entityType ?? ('project' as AttachmentEntityType),
      entityId ?? '__pending__'
    ),
    enabled: !!entityType && !!entityId,
    staleTime: SIGNED_URL_STALE_TIME,
    queryFn: async (): Promise<AttachmentWithUrl[]> => {
      if (!entityType || !entityId) return [];
      return getAttachments(entityType, entityId);
    },
  });
}

/**
 * Files of one kind across an organization — the backing query for review
 * queues such as "acknowledgments awaiting reconciliation".
 */
export function useAttachmentsByDocumentType(
  organizationId?: string,
  documentType?: AttachmentDocumentType,
  limit = 100
) {
  return useQuery({
    queryKey: attachmentsQueryKeys.byDocumentType(
      organizationId ?? '__pending__',
      documentType ?? ('other' as AttachmentDocumentType)
    ),
    enabled: !!organizationId && !!documentType,
    staleTime: SIGNED_URL_STALE_TIME,
    queryFn: async (): Promise<AttachmentWithUrl[]> => {
      if (!organizationId || !documentType) return [];
      return getAttachmentsByDocumentType(organizationId, documentType, limit);
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadAttachmentInput) => uploadAttachment(input),
    onSuccess: attachment => {
      queryClient.invalidateQueries({
        queryKey: attachmentsQueryKeys.entity(
          attachment.entity_type,
          attachment.entity_id
        ),
      });
      toast.success('File uploaded', { description: attachment.file_name });
    },
    onError: (error: unknown) =>
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attachmentId,
      patch,
    }: {
      attachmentId: string;
      patch: { description?: string | null; document_type?: AttachmentDocumentType };
    }) => updateAttachment(attachmentId, patch),
    onSuccess: attachment => {
      queryClient.invalidateQueries({
        queryKey: attachmentsQueryKeys.entity(
          attachment.entity_type,
          attachment.entity_id
        ),
      });
      toast.success('File updated', { description: attachment.file_name });
    },
    onError: (error: unknown) =>
      toast.error('Could not update file', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/**
 * Delete one attachment. Takes the entity it belongs to so the right cache entry
 * can be invalidated — the row is gone by the time the mutation resolves.
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attachmentId }: {
      attachmentId: string;
      entityType: AttachmentEntityType;
      entityId: string;
    }) => deleteAttachment(attachmentId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: attachmentsQueryKeys.entity(
          variables.entityType,
          variables.entityId
        ),
      });
      toast.success('File deleted');
    },
    onError: (error: unknown) =>
      toast.error('Could not delete file', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}
