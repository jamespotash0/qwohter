/**
 * File Upload Step Component
 * Drag & drop interface for uploading quote documents
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateFile, detectFileType } from '@/services/quoteImport';
import { ACCEPTED_FILE_EXTENSIONS } from '@/lib/types/quoteImport';
import type { ImportFileType } from '@/lib/types/quoteImport';

interface FileUploadStepProps {
  file: File | null;
  onFileSelect: (file: File, fileType: ImportFileType) => void;
  onClear: () => void;
  error: string | null;
  onError: (error: string | null) => void;
}

const FILE_TYPE_ICONS: Record<ImportFileType, React.ReactNode> = {
  pdf: <FileText className="w-8 h-8 text-red-500" />,
  docx: <FileText className="w-8 h-8 text-blue-500" />,
  csv: <FileSpreadsheet className="w-8 h-8 text-green-500" />,
  xlsx: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
  txt: <File className="w-8 h-8 text-gray-500" />,
};

export function FileUploadStep({
  file,
  onFileSelect,
  onClear,
  error,
  onError,
}: FileUploadStepProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const selectedFile = acceptedFiles[0];
      const validation = validateFile(selectedFile);

      if (!validation.valid) {
        onError(validation.error || 'Invalid file');
        return;
      }

      const fileType = detectFileType(selectedFile);
      if (!fileType) {
        onError('Unsupported file type');
        return;
      }

      onError(null);
      onFileSelect(selectedFile, fileType);
    },
    [onFileSelect, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const fileType = file ? detectFileType(file) : null;

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-orange-500 bg-orange-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload
            className={`w-12 h-12 mx-auto mb-4 ${
              isDragActive ? 'text-orange-500' : 'text-gray-400'
            }`}
          />
          <p className="text-lg font-medium text-gray-700 mb-1">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your quote file'}
          </p>
          <p className="text-sm text-gray-500 mb-3">or click to browse</p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {fileType && FILE_TYPE_ICONS[fileType]}
              <div>
                <p className="font-medium text-gray-900 truncate max-w-[300px]">
                  {file.name}
                </p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB • {fileType?.toUpperCase()}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium">Supported formats:</p>
        <ul className="list-disc list-inside space-y-0.5 pl-2">
          <li><span className="font-medium">PDF</span> - Quote documents, proposals</li>
          <li><span className="font-medium">DOCX</span> - Word documents</li>
          <li><span className="font-medium">CSV/XLSX</span> - Spreadsheets with quote data</li>
          <li><span className="font-medium">TXT</span> - Plain text quotes</li>
        </ul>
      </div>
    </div>
  );
}
