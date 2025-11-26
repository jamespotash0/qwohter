/**
 * Project Attachments Component
 *
 * Drag-and-drop file upload and management for project attachments.
 * Displays both quote files and project-specific files.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ProjectAttachmentsService } from '@/services/projectAttachmentsService';
import type { ProjectAttachment, AttachmentCategory } from '@/lib/types/projectAttachments';
import { useToast } from '@/hooks/use-toast';

interface ProjectAttachmentsProps {
  projectId: string;
  attachments: ProjectAttachment[];
  onAttachmentsChange: () => void;
}

export const ProjectAttachments: React.FC<ProjectAttachmentsProps> = ({
  projectId,
  attachments,
  onAttachmentsChange,
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('other');
  const [description, setDescription] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0]; // Upload one file at a time
      setUploading(true);
      setUploadingFileName(file.name);

      try {
        const result = await ProjectAttachmentsService.uploadAttachment(
          projectId,
          file,
          description || undefined,
          selectedCategory
        );

        if (result.success) {
          toast({
            title: 'File Uploaded',
            description: `${file.name} has been uploaded successfully.`,
          });
          setDescription('');
          onAttachmentsChange();
        } else {
          toast({
            title: 'Upload Failed',
            description: result.error || 'Failed to upload file.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload Failed',
          description: 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
        setUploadingFileName('');
      }
    },
    [projectId, description, selectedCategory, onAttachmentsChange, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: uploading,
  });

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    const result = await ProjectAttachmentsService.deleteAttachment(attachmentId);

    if (result.success) {
      toast({
        title: 'File Deleted',
        description: `${fileName} has been deleted.`,
      });
      onAttachmentsChange();
    } else {
      toast({
        title: 'Delete Failed',
        description: result.error || 'Failed to delete file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (publicUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = publicUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) => setSelectedCategory(value as AttachmentCategory)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drawing">Drawing</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="photo">Photo</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="specification">Specification</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-xs"
            disabled={uploading}
          />
        </div>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
            transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-600">Uploading {uploadingFileName}...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-xs text-gray-600">
                {isDragActive ? 'Drop file here...' : 'Drag & drop a file or click to browse'}
              </p>
              <p className="text-[10px] text-gray-400">Max file size: 50MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Files List */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700">
            Attached Files ({attachments.length})
          </h4>
          <div className="space-y-1.5">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
              >
                <span className="text-lg flex-shrink-0">
                  {ProjectAttachmentsService.getFileIcon(attachment.file_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{ProjectAttachmentsService.formatFileSize(attachment.file_size)}</span>
                    {attachment.category && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{attachment.category}</span>
                      </>
                    )}
                    {attachment.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[100px]">{attachment.description}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment.public_url, attachment.file_name)}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(attachment.id, attachment.file_name)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No files attached yet</p>
        </div>
      )}
    </div>
  );
};
