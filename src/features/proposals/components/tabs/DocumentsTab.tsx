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

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    if (!files || files.length === 0) return;
    handleFileUpload(files[0]);
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
  return (
    <div className="space-y-6">
      {/* Signed Documents Section */}
      {signatures.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Signed Documents
            </h3>
          </div>
          <div className="space-y-2">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center gap-3">
                  {/* Signature Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                      <Signature className="w-5 h-5 text-green-600 dark:text-green-400" weight="fill" />
                    </div>
                  </div>

                  {/* Signature Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Signed Proposal PDF
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>Signed by {sig.signer_name}</span>
                      <span>•</span>
                      <span>{formatDate(sig.signed_at)}</span>
                    </div>
                  </div>

                  {/* Download Action */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => sig.signed_pdf_url && window.open(sig.signed_pdf_url, '_blank')}
                      disabled={!sig.signed_pdf_url}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents Section */}
      <div className="space-y-3">
        {/* Header with Add File button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {signatures.length > 0 ? 'Other Documents' : 'Documents'}
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
                    <span>{formatDate(doc.created_at)}</span>
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
