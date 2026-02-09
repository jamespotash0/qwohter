import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { LogoUploadService, LogoUploadResult, LogoValidationResult } from '@/services/LogoUploadService';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/auth';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  onUploadSuccess: (result: LogoUploadResult) => void;
  onUploadError: (error: string) => void;
  onRemove?: () => void;
  currentLogoUrl?: string;
  userId: string;
  disabled?: boolean;
  className?: string;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  onRemove,
  currentLogoUrl,
  userId,
  disabled = false,
  className = ''
}) => {
  const authUser = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasLogo = !!currentLogoUrl;

  // Handle file selection - validate and upload immediately
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    event.target.value = '';

    // Validate the file
    const validation: LogoValidationResult = await LogoUploadService.validateFile(file);
    if (!validation.isValid) {
      onUploadError(validation.error || 'Invalid file');
      return;
    }

    // Start upload immediately
    setIsUploading(true);

    try {
      // Upload to storage
      const uploadResult = await LogoUploadService.uploadLogo(file, userId);

      if (!uploadResult.success) {
        onUploadError(uploadResult.error || 'Upload failed');
        setIsUploading(false);
        return;
      }

      // Save to database
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
        const dbResult = await LogoUploadService.updateOrganizationLogo(orgId, {
          logo_url: uploadResult.url || '',
          logo_file_name: uploadResult.fileName || '',
        });

        if (!dbResult.success) {
          onUploadError('Failed to save logo information');
          setIsUploading(false);
          return;
        }
      }

      // Success
      onUploadSuccess({
        success: true,
        url: uploadResult.url || '',
        signedUrl: uploadResult.signedUrl || '',
        fileName: uploadResult.fileName || ''
      });

    } catch (error) {
      console.error('Upload error:', error);
      onUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [userId, authUser, onUploadSuccess, onUploadError]);

  // Handle logo removal
  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!authUser) return;

    setIsRemoving(true);

    try {
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', authUser.id)
        .eq('status', 'Active')
        .single();

      const orgId = (membershipData as any)?.organization_id;

      if (orgId) {
        // Clear logo_data in database
        const { error } = await supabase
          .from('organizations')
          .update({ logo_data: null })
          .eq('id', orgId);

        if (error) throw error;

        onRemove?.();
      }
    } catch (error) {
      console.error('Failed to remove logo:', error);
      onUploadError('Failed to remove logo');
    } finally {
      setIsRemoving(false);
    }
  }, [authUser, onRemove, onUploadError]);

  // Open file picker
  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && !isRemoving) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading, isRemoving]);

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      {/* Logo container */}
      <div
        className={cn(
          'relative group cursor-pointer transition-all duration-200',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={handleClick}
      >
        {isUploading || isRemoving ? (
          // Loading state
          <div className="w-32 h-24 border-2 border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : hasLogo ? (
          // Has logo - show it with hover overlay
          <div className="w-32 h-24 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 relative">
            <img
              src={currentLogoUrl}
              alt="Company logo"
              className="w-full h-full object-contain p-1.5"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            {/* Hover overlay - click to replace */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            {/* Remove button - top right corner */}
            {/* <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
              title="Remove logo"
            >
              <X className="w-3 h-3 text-white" />
            </button> */}
          </div>
        ) : (
          // No logo - show placeholder with helper text inside
          <div className="w-32 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center group-hover:border-gray-400 dark:group-hover:border-gray-500 transition-colors duration-200">
            <Upload className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-400 transition-colors duration-200" />
            <span className="text-[10px] text-gray-500 mt-1.5 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300 transition-colors duration-200">
              Upload Logo
            </span>
            <span className="text-[9px] text-gray-400 mt-0.5">
              JPG, SVG (max 5MB)
            </span>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.svg,image/jpeg,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
};
