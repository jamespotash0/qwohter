import { supabase } from '@/integrations/supabase/client';

export interface LogoUploadResult {
  success: boolean;
  url?: string;
  signedUrl?: string;
  error?: string;
  fileName?: string;
}

export interface LogoValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
}

export class LogoUploadService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/svg+xml'];
  private static readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.svg'];
  // Store at higher resolution, let display handle sizing
  // Max 1024px on longest side - good balance of quality vs file size
  private static readonly MAX_DIMENSION = 1024;
  private static readonly JPEG_QUALITY = 0.92; // Higher quality for logos
  private static readonly BUCKET_NAME = 'organization-logos';
  // Signed URL duration: 7 days (logos are cached and refreshed periodically)
  private static readonly SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

  /**
   * Validates an image file for logo upload
   */
  static async validateFile(file: File): Promise<LogoValidationResult> {
    try {
      // Check file type
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!this.ALLOWED_EXTENSIONS.includes(extension)) {
          return {
            isValid: false,
            error: 'Invalid file type. Please upload JPG, JPEG, or SVG files only.'
          };
        }
      }

      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: `File size too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          fileSize: file.size
        };
      }

      // For SVG files, we can't easily check dimensions, so we'll allow them through
      if (file.type === 'image/svg+xml') {
        return {
          isValid: true,
          fileSize: file.size
        };
      }

      // Check image dimensions for raster images
      const dimensions = await this.getImageDimensions(file);
      // Allow flexible sizing for different aspect ratios
      // Maximum 5000px for any dimension to prevent extremely large files
      const maxDimension = 5000;
      if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
        return {
          isValid: false,
          error: `Image dimensions too large. Maximum size is ${maxDimension}x${maxDimension} pixels. Image will be automatically resized for optimal template display.`,
          fileSize: file.size,
          dimensions
        };
      }

      return {
        isValid: true,
        fileSize: file.size,
        dimensions
      };
    } catch (error) {
      console.error('Error validating file:', error);
      return {
        isValid: false,
        error: 'Error validating file. Please try again.'
      };
    }
  }

  /**
   * Gets image dimensions from a file
   */
  private static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Processes and optimizes an image file
   * Stores at higher resolution (max 1024px) for quality, let display handle sizing
   */
  static async processImage(file: File): Promise<File> {
    // For SVG files, return as-is since they're vector graphics
    if (file.type === 'image/svg+xml') {
      return file;
    }

    try {
      // Create a canvas to process the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Load the image
      const img = await this.loadImageFromFile(file);

      let { width, height } = img;

      // Only resize if larger than max dimension (preserve quality for smaller images)
      if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
        const scale = this.MAX_DIMENSION / Math.max(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with high quality
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to process image'));
              return;
            }

            // Create a new file with the processed image
            const processedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            resolve(processedFile);
          },
          'image/jpeg',
          this.JPEG_QUALITY
        );
      });
    } catch (error) {
      console.error('Error processing image:', error);
      // Return original file if processing fails
      return file;
    }
  }

  /**
   * Loads an image from a file
   */
  private static loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Uploads a logo file to Supabase storage
   * Uses UUID for filename to prevent enumeration attacks
   */
  static async uploadLogo(file: File, userId: string): Promise<LogoUploadResult> {
    try {

      // Validate the file first
      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Process the image
      const processedFile = await this.processImage(file);


      // Generate UUID filename to prevent enumeration attacks
      const fileExtension = processedFile.type === 'image/svg+xml' ? '.svg' : '.jpg';
      const fileName = `${crypto.randomUUID()}${fileExtension}`;

      // Get the current authenticated user and their organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Get user's organization ID
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'Active') //membership_status
        .single();

      if (membershipError || !membershipData) {
        return {
          success: false,
          error: 'No active organization found'
        };
      }

      const organizationId = membershipData.organization_id;

      // Use organization_id as folder name (required by storage RLS policy)
      const filePath = `${organizationId}/${fileName}`;
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }


      // Get signed URL (bucket should be private, not public)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, this.SIGNED_URL_EXPIRY);

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        // Still return success with just the path - URL can be regenerated
      }

      const result = {
        success: true,
        url: filePath,
        signedUrl: signedUrlData?.signedUrl,
        fileName: fileName
      };

      return result;
    } catch (error) {
      console.error('💥 Unexpected error during upload:', error);
      return {
        success: false,
        error: 'Upload failed. Please try again.'
      };
    }
  }

  /**
   * Deletes a logo from Supabase storage
   */
  static async deleteLogo(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting logo:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting logo:', error);
      return {
        success: false,
        error: 'Failed to delete logo. Please try again.'
      };
    }
  }

  /**
   * Gets a signed URL for a logo (for display)
   * URLs expire after SIGNED_URL_EXPIRY seconds and should be refreshed
   */
  static async getLogoSignedUrl(filePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(filePath, this.SIGNED_URL_EXPIRY);

    if (error) {
      console.error('Error creating signed URL for logo:', error);
      return null;
    }

    return data.signedUrl;
  }

  /**
   * Updates organization with logo information
   */
  static async updateOrganizationLogo(
    organizationId: string,
    logoData: {
      logo_url: string;
      logo_file_name: string;
    } | null
  ): Promise<{ success: boolean; error?: string }> {
    try {

      // Update logo_data field directly
      // Note: We store the file path, not the signed URL (URLs expire)
      const updatePayload = {
        logo_data: logoData ? {
          logo_url: logoData.logo_url, // This is the file path, not a URL
          logo_file_name: logoData.logo_file_name,
          logo_updated_at: new Date().toISOString()
        } : null
      };


      const { data: updateResult, error } = await (supabase as any)
        .from('organizations')
        .update(updatePayload)
        .eq('id', organizationId)
        .select();

      if (error) {
        console.error('❌ Error updating organization logo:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      console.error('💥 Unexpected error updating organization logo:', error);
      return {
        success: false,
        error: 'Failed to update organization. Please try again.'
      };
    }
  }
}
