/**
 * Entity Attachments
 *
 * Files against anything the polymorphic `attachments` table supports — an
 * order, a manufacturer order, a receipt, a work order.
 *
 * The project board has had its own attachments panel since before that table
 * was polymorphic, and it takes its list as a prop and calls back on every
 * change. This is self-contained instead: give it an entity and it owns the
 * query, the upload, and the invalidation. That matters because the entities
 * this will hang off next — acknowledgments, packing slips, damage photos — are
 * reached from half a dozen screens, and threading a list and a refetch through
 * each one is how those screens end up disagreeing about what is attached.
 *
 * Document type is asked for on upload rather than inferred from the file. A
 * PDF might be an acknowledgment, a packing slip, or a freight invoice, and
 * guessing wrong is worse than asking — the type is what makes a file findable
 * later, and what a freight claim is built from.
 */

import { useRef, useState } from 'react';
import { Paperclip, Plus, Trash, DownloadSimple, Spinner } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from '@/hooks/queries/useAttachments';
import {
  formatFileSize,
  type AttachmentDocumentType,
  type AttachmentEntityType,
} from '@/services/attachmentsService';
import { cn } from '@/lib/utils';

/**
 * Types offered per entity, most likely first. A manufacturer order collects
 * acknowledgments and freight paperwork; an order collects the customer's own
 * documents. Offering all thirteen everywhere makes the useful ones harder to
 * pick.
 */
const TYPES_BY_ENTITY: Partial<
  Record<AttachmentEntityType, AttachmentDocumentType[]>
> = {
  vendor_po: ['acknowledgment', 'vendor_invoice', 'packing_slip', 'bill_of_lading', 'other'],
  sales_order: ['contract', 'quote', 'specification', 'spec_file', 'drawing', 'customer_invoice', 'other'],
  receipt: ['packing_slip', 'bill_of_lading', 'damage_photo', 'photo', 'other'],
  work_order: ['drawing', 'photo', 'damage_photo', 'other'],
  order_line: ['specification', 'drawing', 'photo', 'other'],
};

const FALLBACK_TYPES: AttachmentDocumentType[] = [
  'specification',
  'drawing',
  'photo',
  'contract',
  'other',
];

const TYPE_LABELS: Record<AttachmentDocumentType, string> = {
  acknowledgment: 'Acknowledgment',
  packing_slip: 'Packing slip',
  bill_of_lading: 'Bill of lading',
  damage_photo: 'Damage photo',
  vendor_invoice: 'Vendor invoice',
  customer_invoice: 'Customer invoice',
  quote: 'Quote',
  drawing: 'Drawing',
  specification: 'Specification',
  spec_file: 'Spec file',
  photo: 'Photo',
  contract: 'Contract',
  other: 'Other',
};

interface EntityAttachmentsProps {
  organizationId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  /** Heading text. Omit for a bare list, e.g. inside a row that already has one. */
  title?: string;
  className?: string;
}

export function EntityAttachments({
  organizationId,
  entityType,
  entityId,
  title = 'Files',
  className,
}: EntityAttachmentsProps) {
  const { data: attachments = [], isLoading } = useAttachments(entityType, entityId);
  const upload = useUploadAttachment();
  const remove = useDeleteAttachment();

  const fileInput = useRef<HTMLInputElement>(null);
  const types = TYPES_BY_ENTITY[entityType] ?? FALLBACK_TYPES;
  const [documentType, setDocumentType] = useState<AttachmentDocumentType>(types[0]!);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice still fires a change.
    event.target.value = '';
    if (!file) return;

    try {
      await upload.mutateAsync({
        organizationId,
        entityType,
        entityId,
        file,
        documentType,
      });
    } catch {
      // Surfaced as a toast by the mutation hook.
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {title && (
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {title}
              {attachments.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-gray-500">
                  {attachments.length}
                </span>
              )}
            </h3>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Select
            value={documentType}
            onValueChange={v => setDocumentType(v as AttachmentDocumentType)}
          >
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map(t => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={upload.isPending}
            onClick={() => fileInput.current?.click()}
          >
            {upload.isPending ? (
              <Spinner className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1.5" />
            )}
            {upload.isPending ? 'Uploading…' : 'Add file'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={handleFile}
            aria-label={`Add a file to this ${entityType.replace('_', ' ')}`}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
      ) : attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-6 text-center text-sm text-gray-500">
          No files yet.
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {attachments.map((file, index) => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5',
                index > 0 && 'border-t border-gray-100 dark:border-gray-700/50'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-900 dark:text-gray-100">
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-500">
                  {TYPE_LABELS[file.document_type] ?? file.document_type}
                  {' · '}
                  {formatFileSize(file.file_size)}
                  {' · '}
                  {new Date(file.created_at).toLocaleDateString()}
                </p>
              </div>
              {file.signed_url && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                >
                  <a
                    href={file.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${file.file_name}`}
                  >
                    <DownloadSimple className="w-4 h-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ attachmentId: file.id, entityType, entityId })
                }
                aria-label={`Remove ${file.file_name}`}
              >
                <Trash className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EntityAttachments;
