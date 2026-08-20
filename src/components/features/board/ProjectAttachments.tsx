/**
 * Project Attachments Component
 *
 * Simple file upload and management for project attachments.
 * Uses modal for adding new documents.
 */

import React, { useState, useRef } from 'react';
import { Plus, X, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  uploadAttachment,
  deleteAttachment,
  getFileIcon,
  formatFileSize,
  type AttachmentWithUrl,
  type AttachmentDocumentType,
} from '@/services/attachmentsService';
import { useToast } from '@/hooks/use-toast';

interface ProjectAttachmentsProps {
  projectId: string;
  attachments: AttachmentWithUrl[];
  onAttachmentsChange: () => void;
}

export const ProjectAttachments: React.FC<ProjectAttachmentsProps> = ({
  projectId,
  attachments,
  onAttachmentsChange,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<AttachmentDocumentType | ''>('');
  const [description, setDescription] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      await uploadAttachment({
        entityType: 'project',
        entityId: projectId,
        file: selectedFile,
        description: description || undefined,
        documentType: selectedDocumentType || undefined,
      });

      toast({
        title: 'File Uploaded',
        description: `${selectedFile.name} has been uploaded successfully.`,
      });
      resetForm();
      setIsModalOpen(false);
      onAttachmentsChange();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description:
          error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedDocumentType('');
    setDescription('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    if (!uploading) {
      resetForm();
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      await deleteAttachment(attachmentId);
      toast({
        title: 'File Deleted',
        description: `${fileName} has been deleted.`,
      });
      onAttachmentsChange();
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (signedUrl: string | null, fileName: string) => {
    if (!signedUrl) {
      toast({
        title: 'Download Unavailable',
        description: 'This file could not be reached. Try reloading the page.',
        variant: 'destructive',
      });
      return;
    }
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* Files List */}
      {attachments.length > 0 ? (
        <div className="space-y-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
            >
              <span className="text-lg flex-shrink-0">
                {getFileIcon(attachment.file_type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {attachment.file_name}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span>{formatFileSize(attachment.file_size)}</span>
                  {attachment.document_type !== 'other' && (
                    <>
                      <span>•</span>
                      <span className="capitalize">
                        {attachment.document_type.replace(/_/g, ' ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(attachment.signed_url, attachment.file_name)}
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
      ) : (
        <div className="text-center py-4">
          <FileText className="w-6 h-6 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-500">No documents attached</p>
        </div>
      )}

      {/* Add Document Button - Below files */}
      <Button
        onClick={() => setIsModalOpen(true)}
        size="sm"
        variant="outline"
        className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        Add Document
      </Button>

      {/* Upload Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="text-xs text-gray-500">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            {/* File Type */}
            <div className="space-y-2">
              <Label htmlFor="category">File Type</Label>
              <Select
                value={selectedDocumentType}
                onValueChange={(value) => setSelectedDocumentType(value as AttachmentDocumentType)}
                disabled={uploading}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select file type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drawing">Drawing</SelectItem>
                  <SelectItem value="customer_invoice">Invoice</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Enter description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
