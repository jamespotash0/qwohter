/**
 * Documents Tab
 *
 * File upload and management for proposals:
 * - Builder Mode: Disabled (no functionality)
 * - Filler Mode: Upload and view documents stored in Supabase
 * - Shows signed PDFs from e-signatures
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, FilePdf, FileDoc, FileImage, File as FileIcon, Trash, Download, Spinner, Signature, CheckCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { EditorMode } from '../ProposalEditor';
import {
  uploadProposalDocument,
  getProposalDocuments,
  deleteProposalDocument,
  formatFileSize,
  getFileCategory,
  type ProposalDocument,
} from '@/services/proposalDocumentsService';
import { formatTimestamp } from '@/lib/utils';
import {
  getProposalSignaturesWithUrls,
  type ProposalSignature,
} from '@/services/proposalSigningService';

interface DocumentsTabProps {
  mode: EditorMode;
  proposalId?: string;
  organizationId?: string;
}

// File type icon mapping
const getFileIcon = (mimeType: string | null) => {
  const category = getFileCategory(mimeType);
  switch (category) {
    case 'pdf':
      return <FilePdf className="w-5 h-5 text-red-500" />;
    case 'word':
      return <FileDoc className="w-5 h-5 text-blue-500" />;
    case 'image':
      return <FileImage className="w-5 h-5 text-green-500" />;
    default:
      return <FileIcon className="w-5 h-5 text-gray-500" />;
  }
};

export function DocumentsTab({ mode, proposalId, organizationId }: DocumentsTabProps) {
  const isBuilderMode = mode === 'builder';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<ProposalDocument[]>([]);
  const [signatures, setSignatures] = useState<ProposalSignature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load documents and signatures on mount (filler mode only)
  useEffect(() => {
    if (!isBuilderMode && proposalId) {
      loadDocuments();
      loadSignatures();
    }
  }, [isBuilderMode, proposalId]);

  const loadDocuments = useCallback(async () => {
    if (!proposalId) return;
    setIsLoading(true);
    try {
      const docs = await getProposalDocuments(proposalId);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [proposalId]);

  const loadSignatures = useCallback(async () => {
    if (!proposalId) return;
    try {
      const sigs = await getProposalSignaturesWithUrls(proposalId);
      setSignatures(sigs);
    } catch (error) {
      console.error('Failed to load signatures:', error);
      // Don't show error toast - signatures are supplementary
    }
  }, [proposalId]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files?.[0];
    if (!file) return;
    handleFileUpload(file);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!proposalId || !organizationId) {
      toast.error('Missing proposal or organization information');
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadProposalDocument(proposalId, organizationId, file, {
        tabKey: 'documents',
      });

      if (!result.success) {
        toast.error(result.error || 'Upload failed');
        return;
      }

      // Add new document to list
      if (result.document) {
        setDocuments(prev => [result.document!, ...prev]);
      }
      toast.success(`${file.name} uploaded successfully`);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [proposalId, organizationId]);

  // Handle delete document
  const handleDelete = useCallback(async (docId: string) => {
    setDeletingId(docId);
    try {
      const result = await deleteProposalDocument(docId);
      if (result.success) {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        toast.success('Document deleted');
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Handle download document
  const handleDownload = useCallback((doc: ProposalDocument) => {
    if (doc.download_url) {
      window.open(doc.download_url, '_blank');
    } else {
      toast.error('Download URL not available');
    }
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  // Filler mode: Compact file list with add button
  const totalFiles = documents.length + signatures.length;

  return (
    <div className="space-y-6">
      {/* Documents Section */}
      <div className="space-y-3">
        {/* Header with Add File button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Documents
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
              disabled={isUploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              className="bg-coral hover:bg-coral-hover text-white"
            >
              {isUploading ? (
                <>
                  <Spinner className="w-4 h-4 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add File
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Documents List */}
      {totalFiles === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <FileIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No documents uploaded yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Signed Documents (shown first with signature badge) */}
          {signatures.map((sig) => {
            // Extract filename from path, or use default
            const fileName = sig.signed_pdf_path
              ? sig.signed_pdf_path.split('/').pop() || 'signed-document.pdf'
              : 'signed-document.pdf';

            return (
              <div
                key={`sig-${sig.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* PDF Icon with signature badge */}
                  <div className="flex-shrink-0 relative">
                    <FilePdf className="w-5 h-5 text-red-500" />
                    <CheckCircle
                      className="w-3 h-3 text-green-600 absolute -bottom-0.5 -right-0.5"
                      weight="fill"
                    />
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {fileName}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                        <Signature className="w-3 h-3" weight="fill" />
                        Signed
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(sig.signed_at, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Download Action */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => sig.signed_pdf_url && window.open(sig.signed_pdf_url, '_blank')}
                      disabled={!sig.signed_pdf_url}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Regular uploaded documents */}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-coral dark:hover:border-coral transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(doc.mime_type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.file_name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatTimestamp(doc.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                    title="Download"
                    disabled={!doc.download_url}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === doc.id ? (
                      <Spinner className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

export default DocumentsTab;
