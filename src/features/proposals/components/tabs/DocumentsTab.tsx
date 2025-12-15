/**
 * Documents Tab
 *
 * File upload and management for proposals:
 * - Builder Mode: Disabled (no functionality)
 * - Filler Mode: Upload and view documents
 */

import { useState, useCallback, useRef } from 'react';
import { Plus, FilePdf, FileDoc, FileImage, File as FileIcon, Trash, Download } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EditorMode } from '../ProposalEditor';

interface DocumentsTabProps {
  mode: EditorMode;
  proposalId?: string;
}

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_at: string;
  uploaded_by: string;
}

// File type icon mapping
const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return <FilePdf className="w-5 h-5 text-red-500" />;
  if (fileType.includes('word') || fileType.includes('doc')) return <FileDoc className="w-5 h-5 text-blue-500" />;
  if (fileType.includes('image')) return <FileImage className="w-5 h-5 text-green-500" />;
  return <FileIcon className="w-5 h-5 text-gray-500" />;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function DocumentsTab({ mode, proposalId }: DocumentsTabProps) {
  const isBuilderMode = mode === 'builder';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock documents state (will be replaced with React Query)
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handleFileUpload(files[0]);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!proposalId) {
      toast.error('No proposal ID provided');
      return;
    }

    // Validate file size (50MB max)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);

    try {
      // TODO: Implement actual file upload to Supabase Storage
      // For now, create mock document
      const mockDoc: Document = {
        id: Math.random().toString(36).substr(2, 9),
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: '#', // Will be replaced with actual URL
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Current User',
      };

      setDocuments(prev => [mockDoc, ...prev]);
      toast.success(`${file.name} uploaded successfully`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [proposalId]);

  // Handle delete document
  const handleDelete = useCallback((docId: string) => {
    // TODO: Implement actual delete with confirmation
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast.success('Document deleted');
  }, []);

  // Handle download document
  const handleDownload = useCallback((doc: Document) => {
    // TODO: Implement actual download
    toast.info(`Downloading ${doc.file_name}...`);
  }, []);

  // Builder mode: Show disabled state
  if (isBuilderMode) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-gray-500">
          <FileIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">Documents Tab</p>
          <p className="text-sm mt-1">
            Documents are uploaded when filling out proposals
          </p>
        </div>
      </div>
    );
  }

  // Filler mode: Compact file list with add button
  return (
    <div className="space-y-4">
      {/* Header with Add File button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Documents
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
            disabled={uploading}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="bg-coral hover:bg-coral-hover text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            {uploading ? 'Uploading...' : 'Add File'}
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <FileIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No documents uploaded yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-coral dark:hover:border-coral transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(doc.file_type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.file_name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.uploaded_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DocumentsTab;
