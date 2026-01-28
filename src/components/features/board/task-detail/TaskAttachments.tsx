/**
 * TaskAttachments Component
 *
 * File upload and display for task attachments.
 * Supports images, documents, and other file types.
 */

import { useState, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Image as ImageIcon,
  File,
  FilePdf,
  FileDoc,
  FileXls,
  CloudArrowUp,
  DotsThree,
  Trash,
  DownloadSimple,
  Eye,
} from '@phosphor-icons/react';
import type { TaskAttachment } from '@/lib/types/taskComments';
import { formatFileSize } from '@/lib/types/taskComments';

interface TaskAttachmentsProps {
  attachments: TaskAttachment[];
  isLoading?: boolean;
  isUploading?: boolean;
  onUpload: (file: File) => void;
  onDelete: (attachment: TaskAttachment) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

export function TaskAttachments({
  attachments,
  isLoading,
  isUploading,
  onUpload,
  onDelete,
}: TaskAttachmentsProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (file.size <= MAX_FILE_SIZE && ALLOWED_TYPES.includes(file.type)) {
          onUpload(file);
        }
      });
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        if (file.size <= MAX_FILE_SIZE && ALLOWED_TYPES.includes(file.type)) {
          onUpload(file);
        }
      });
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUpload]
  );

  // Get icon based on file type
  const getFileIcon = (attachment: TaskAttachment) => {
    if (attachment.attachment_type === 'image') {
      return <ImageIcon className="w-5 h-5 text-purple-500" weight="duotone" />;
    }
    if (attachment.file_type.includes('pdf')) {
      return <FilePdf className="w-5 h-5 text-red-500" weight="duotone" />;
    }
    if (attachment.file_type.includes('word') || attachment.file_type.includes('document')) {
      return <FileDoc className="w-5 h-5 text-blue-500" weight="duotone" />;
    }
    if (attachment.file_type.includes('excel') || attachment.file_type.includes('spreadsheet')) {
      return <FileXls className="w-5 h-5 text-green-500" weight="duotone" />;
    }
    return <File className="w-5 h-5 text-gray-500" weight="duotone" />;
  };

  // Group attachments by type
  const imageAttachments = attachments.filter((a) => a.attachment_type === 'image');
  const fileAttachments = attachments.filter((a) => a.attachment_type !== 'image');

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-all duration-200',
          'flex flex-col items-center justify-center py-6 px-4',
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50',
          isUploading && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <CloudArrowUp
          className={cn(
            'w-8 h-8 mb-2 transition-colors',
            dragOver ? 'text-indigo-500' : 'text-gray-400'
          )}
          weight="duotone"
        />
        <p className="text-sm text-gray-600 text-center">
          {isUploading ? (
            'Uploading...'
          ) : (
            <>
              <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Images, PDFs, documents up to 10MB
        </p>
      </div>

      {/* Image Grid */}
      {imageAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Images ({imageAttachments.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {imageAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={() => setPreviewImage(attachment.file_url)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                  >
                    <DownloadSimple className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white hover:bg-red-500/50"
                    onClick={() => onDelete(attachment)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File List */}
      {fileAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Files ({fileAttachments.length})
          </h4>
          <div className="space-y-1">
            {fileAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  {getFileIcon(attachment)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.file_size)} &middot;{' '}
                    {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <DotsThree className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => window.open(attachment.file_url, '_blank')}
                      className="gap-2"
                    >
                      <DownloadSimple className="w-4 h-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(attachment)}
                      className="gap-2 text-red-600 focus:text-red-600"
                    >
                      <Trash className="w-4 h-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && attachments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No attachments yet
        </p>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
