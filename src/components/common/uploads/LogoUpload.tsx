import React, { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LogoUploadService, LogoUploadResult, LogoValidationResult } from '@/services/LogoUploadService';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/auth';

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
  // ✅ v3.0.0: Use new auth hook
  const authUser = useUser();

  const [uploadState, setUploadState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    progress: 0,
    isUploaded: !!currentLogoUrl
  });

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Handle file validation and preview - Auto upload
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
      onUploadError(validation.error || 'Invalid file');
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

  // Handle file upload with specific file - Upload to storage AND save to database immediately
  const handleUploadWithFile = useCallback(async (file: File) => {
    setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 70)
        }));
      }, 200);

      // Step 1: Upload to storage
      const uploadResult = await LogoUploadService.uploadLogo(file, userId);
      
      setUploadState(prev => ({ ...prev, progress: 80 }));

      if (!uploadResult.success) {
        clearInterval(progressInterval);
        onUploadError(uploadResult.error || 'Upload failed');
        setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
        return;
      }

      // Step 2: Save to database immediately
      try {
        let orgId = '';

        if (authUser) {
          const { data: membershipData } = await supabase
            .from('memberships')
            .select('organization_id')
            .eq('user_id', authUser.id)
            .eq('status', 'Active')
            .single();

          orgId = (membershipData as any)?.organization_id || '';
        }

        if (orgId) {
          const dbResult = await LogoUploadService.updateOrganizationLogo(
            orgId,
            {
              logo_url: uploadResult.url || '',
              logo_file_name: uploadResult.fileName || '',
              logo_public_url: uploadResult.publicUrl || '',
            }
          );
          

          if (!dbResult.success) {
            console.error('Database save failed:', dbResult.error);
            onUploadError('Failed to save logo information');
            setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
            return;
          }
        } else {
          console.error('❌ No organization ID found, cannot save logo to database');
        }

        clearInterval(progressInterval);
        setUploadState(prev => ({ ...prev, progress: 100 }));

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
        

        // Show success overlay for 3 seconds
        setShowSuccessOverlay(true);
        setTimeout(() => {
          setShowSuccessOverlay(false);
        }, 3000);

        // Call onUploadSuccess to update parent component with new logo data
        onUploadSuccess({
          success: true,
          url: uploadResult.url || '',
          publicUrl: uploadResult.publicUrl || '',
          fileName: uploadResult.fileName || ''
        });

      } catch (dbError) {
        clearInterval(progressInterval);
        console.error('Database save error:', dbError);
        onUploadError('Failed to save logo information to database');
        setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
      }

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Upload failed. Please try again.');
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
    }
  }, [userId, onUploadSuccess, onUploadError, uploadState.previewUrl]);

  // Handle upload button click
  const handleUpload = useCallback(async () => {
    if (!uploadState.uploadedFile) return;
    await handleUploadWithFile(uploadState.uploadedFile);
  }, [uploadState.uploadedFile, handleUploadWithFile]);

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

  const hasFileSelected = uploadState.uploadedFile && !uploadState.validationError;
  const hasCurrentLogo = currentLogoUrl || uploadState.isUploaded;

  return (
    <div className={`${className}`}>
      {/* Profile Circle Logo */}
      <div className="flex flex-col items-center">
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
            // Uploaded Logo State - Circular Profile
            <div className="space-y-4 group">
              <div className="w-14 h-14 mx-auto border-2 border-gray-200 dark:border-gray-700 rounded-full overflow-hidden bg-white dark:bg-gray-800 relative cursor-pointer"
                   onClick={handleBrowseClick}>
                <img
                  src={currentLogoUrl}
                  alt="Company logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Upload className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Click to change logo
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
            // Default State - Simple rectangular placeholder
            <div className="space-y-6 group">
              <div
                className="w-32 h-16 mx-auto border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 relative cursor-pointer group-hover:border-gray-400 dark:group-hover:border-gray-500 transition-colors duration-200"
                onClick={handleBrowseClick}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Upload className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-400 transition-colors duration-200" />
                  <p className="text-[10px] text-gray-500 mt-1 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300 transition-colors duration-200">Upload Logo</p>
                </div>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-xs text-muted-foreground">
                  JPG, JPEG, SVG (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Logo Button - Depends on file selection */}
      {!uploadState.isUploading && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={disabled || !hasFileSelected}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          size="lg"
        >
          Upload Logo
        </Button>
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 animate-in fade-in zoom-in duration-200">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Logo Uploaded Successfully
            </p>
          </div>
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