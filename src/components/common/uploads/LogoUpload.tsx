import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LogoUploadService, LogoUploadResult, LogoValidationResult } from '@/services/LogoUploadService';

interface LogoUploadProps {
  onUploadSuccess: (result: LogoUploadResult) => void;
  onUploadError: (error: string) => void;
  currentLogoUrl?: string;
  userId: string;
  disabled?: boolean;
  className?: string;
}

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
  uploadedFile?: File;
  previewUrl?: string;
  validationError?: string;
  isUploaded: boolean;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  currentLogoUrl,
  userId,
  disabled = false,
  className = ''
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    progress: 0,
    isUploaded: !!currentLogoUrl
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle file validation and preview
  const processFile = useCallback(async (file: File) => {
    setUploadState(prev => ({ ...prev, validationError: undefined }));
    
    // Validate the file
    const validation: LogoValidationResult = await LogoUploadService.validateFile(file);
    
    if (!validation.isValid) {
      setUploadState(prev => ({ 
        ...prev, 
        validationError: validation.error,
        uploadedFile: undefined,
        previewUrl: undefined
      }));
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    setUploadState(prev => ({
      ...prev,
      uploadedFile: file,
      previewUrl,
      validationError: undefined
    }));
  }, []);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!uploadState.uploadedFile) return;

    setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      const result = await LogoUploadService.uploadLogo(uploadState.uploadedFile, userId);

      clearInterval(progressInterval);
      setUploadState(prev => ({ ...prev, progress: 100 }));

      if (result.success) {
        onUploadSuccess(result);
        // Mark as uploaded and clean up
        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          progress: 100,
          isUploaded: true,
          uploadedFile: undefined,
          previewUrl: undefined
        }));
        if (uploadState.previewUrl) {
          URL.revokeObjectURL(uploadState.previewUrl);
        }
      } else {
        onUploadError(result.error || 'Upload failed');
        setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
      }
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Upload failed. Please try again.');
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
    }
  }, [uploadState.uploadedFile, userId, onUploadSuccess, onUploadError, uploadState.previewUrl]);

  // Handle file input change
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setUploadState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setUploadState(prev => ({ ...prev, isDragging: false }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setUploadState(prev => ({ ...prev, isDragging: false }));

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0] as any);
    }
  }, [processFile]);

  // Handle browse button click
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle remove file
  const handleRemoveFile = useCallback(() => {
    if (uploadState.previewUrl) {
      URL.revokeObjectURL(uploadState.previewUrl);
    }
    setUploadState(prev => ({
      ...prev,
      uploadedFile: undefined,
      previewUrl: undefined,
      validationError: undefined
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadState.previewUrl]);

  const hasFileSelected = uploadState.uploadedFile && !uploadState.validationError;
  const hasCurrentLogo = currentLogoUrl || uploadState.isUploaded;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-200 p-10
          ${uploadState.isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/40'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploadState.validationError ? 'border-destructive bg-destructive/5' : ''}
          ${hasCurrentLogo && !uploadState.uploadedFile ? 'cursor-default' : 'cursor-pointer'}
        `}
        onDragEnter={!disabled && !hasCurrentLogo ? handleDragEnter : undefined}
        onDragLeave={!disabled && !hasCurrentLogo ? handleDragLeave : undefined}
        onDragOver={!disabled && !hasCurrentLogo ? handleDragOver : undefined}
        onDrop={!disabled && !hasCurrentLogo ? handleDrop : undefined}
        onClick={!disabled && !hasCurrentLogo && !uploadState.isUploading ? handleBrowseClick : undefined}
      >
        <div className="text-center">
          {uploadState.isUploading ? (
            // Uploading State
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploading logo...</p>
                <Progress value={uploadState.progress} className="w-full max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground">{uploadState.progress}% complete</p>
              </div>
            </div>
          ) : hasCurrentLogo && !uploadState.uploadedFile ? (
            // Uploaded Logo State
            <div className="space-y-4 group">
              <div className="w-24 h-24 mx-auto border border-muted-foreground/20 rounded-lg overflow-hidden bg-white relative">
                <img 
                  src={currentLogoUrl} 
                  alt="Company logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                     onClick={handleBrowseClick}>
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">Logo Uploaded</p>
                <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Hover and click to change logo
                </p>
              </div>
            </div>
          ) : uploadState.uploadedFile ? (
            // File Selected State
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto border border-muted-foreground/20 rounded-lg overflow-hidden bg-muted/20">
                {uploadState.previewUrl ? (
                  <img 
                    src={uploadState.previewUrl} 
                    alt="Logo preview" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {uploadState.uploadedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(uploadState.uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadState.validationError && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-xs">{uploadState.validationError}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Default State
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">Upload Company Logo</p>
                <Button
                  onClick={handleBrowseClick}
                  disabled={disabled}
                  className="mx-auto bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200"
                  size="sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground">
                  or drag and drop your logo here
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, JPEG, and SVG files (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons for Selected File */}
      {hasFileSelected && !uploadState.isUploading && (
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={disabled}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {hasCurrentLogo ? 'Replace Logo' : 'Upload Logo'}
          </Button>
          <Button
            variant="outline"
            onClick={handleRemoveFile}
            disabled={disabled}
            size="icon"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Choose/Change File Button - No File Selected */}
      {!hasFileSelected && !uploadState.isUploading && (
        <Button
          onClick={handleBrowseClick}
          disabled={disabled}
          className={`w-full ${hasCurrentLogo ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90'}`}
          size="lg"
        >
          {hasCurrentLogo ? 'Change Logo' : 'Choose File'}
        </Button>
      )}

      {/* Success State Display */}
      {hasCurrentLogo && !uploadState.isUploading && !hasFileSelected && (
        <div className="text-center py-2">
          <p className="text-sm text-green-700 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Logo Uploaded Successfully
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.svg,image/jpeg,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};