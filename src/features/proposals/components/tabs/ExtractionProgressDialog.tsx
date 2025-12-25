/**
 * Extraction Progress Dialog
 * Shows file preview and extraction progress during AI document processing
 */

import { useState, useEffect, useMemo } from 'react';
import { File, FilePdf, FileDoc, FileImage, FileText, CheckCircle, CircleNotch, Circle } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ExtractionProgressDialogProps {
  open: boolean;
  file: File | null;
  isExtracting: boolean;
  onComplete?: () => void;
}

// Extraction stages that match the backend passes
const EXTRACTION_STAGES = [
  { id: 'upload', label: 'Uploading document', duration: 500 },
  { id: 'analyze', label: 'Analyzing document structure', duration: 2000 },
  { id: 'products', label: 'Extracting products', duration: 3000 },
  { id: 'pricing', label: 'Processing pricing data', duration: 2000 },
  { id: 'metadata', label: 'Extracting metadata', duration: 1500 },
  { id: 'complete', label: 'Finalizing results', duration: 500 },
];

function getFileIcon(file: File | null) {
  if (!file) return <File className="w-12 h-12 text-gray-400" />;

  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return <FilePdf className="w-12 h-12 text-red-500" />;
  }
  if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) {
    return <FileDoc className="w-12 h-12 text-blue-500" />;
  }
  if (type.startsWith('image/')) {
    return <FileImage className="w-12 h-12 text-purple-500" />;
  }
  if (type.startsWith('text/')) {
    return <FileText className="w-12 h-12 text-gray-500" />;
  }
  return <File className="w-12 h-12 text-gray-400" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ExtractionProgressDialog({
  open,
  file,
  isExtracting,
}: ExtractionProgressDialogProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Generate preview URL for images
  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
    return undefined;
  }, [file]);

  // Simulate stage progression based on extraction status
  useEffect(() => {
    if (!isExtracting) {
      setCurrentStage(0);
      return;
    }

    // Progress through stages with timing
    let stageIndex = 0;
    const advanceStage = () => {
      if (stageIndex < EXTRACTION_STAGES.length - 1) {
        stageIndex++;
        setCurrentStage(stageIndex);
      }
    };

    // Set up timers for each stage
    const timers: NodeJS.Timeout[] = [];
    let cumulativeTime = 0;

    EXTRACTION_STAGES.forEach((stage, index) => {
      if (index > 0) {
        cumulativeTime += EXTRACTION_STAGES[index - 1].duration;
        const timer = setTimeout(advanceStage, cumulativeTime);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isExtracting]);

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (!isExtracting) return 0;
    return Math.min(((currentStage + 1) / EXTRACTION_STAGES.length) * 100, 95);
  }, [currentStage, isExtracting]);

  if (!file) return null;

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Extracting Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Preview Section */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {/* File Icon or Image Preview */}
            <div className="flex-shrink-0">
              {filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Document preview"
                  className="w-16 h-16 object-cover rounded border"
                />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-white dark:bg-gray-700 rounded border">
                  {getFileIcon(file)}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-center text-gray-500">
              {Math.round(progressPercent)}% complete
            </p>
          </div>

          {/* Extraction Stages */}
          <div className="space-y-2">
            {EXTRACTION_STAGES.map((stage, index) => {
              const isComplete = index < currentStage;
              const isCurrent = index === currentStage && isExtracting;
              const isPending = index > currentStage;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    isCurrent && 'bg-coral/10',
                    isComplete && 'opacity-60'
                  )}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-green-500" weight="fill" />
                    ) : isCurrent ? (
                      <CircleNotch className="w-5 h-5 text-coral animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* Stage Label */}
                  <span
                    className={cn(
                      'text-sm',
                      isCurrent && 'text-gray-900 dark:text-gray-100 font-medium',
                      isComplete && 'text-gray-500',
                      isPending && 'text-gray-400'
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tip */}
          <p className="text-xs text-center text-gray-400 italic">
            AI is analyzing your document to extract product information...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
