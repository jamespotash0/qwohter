import { supabase } from '@/integrations/supabase/client';

export interface LogoUploadResult {
  success: boolean;
  url?: string;
  publicUrl?: string;
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
  // Template-optimized dimensions: 440px x 120px (template max size)
  private static readonly TEMPLATE_DIMENSIONS = { width: 440, height: 120 };
  private static readonly BUCKET_NAME = 'organization-logos';

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
   */
  static async processImage(file: File): Promise<File> {
    // For SVG files, return as-is since they're already optimized
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
      
      // Calculate new dimensions optimized for template display (440x120 max)
      // Use template dimensions as target while maintaining aspect ratio
      const targetWidth = this.TEMPLATE_DIMENSIONS.width;
      const targetHeight = this.TEMPLATE_DIMENSIONS.height;
      let { width, height } = img;
      
      // Calculate scaling to fit within template dimensions while maintaining aspect ratio
      const scaleX = targetWidth / width;
      const scaleY = targetHeight / height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
      
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress the image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with compression
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
          0.9 // Quality setting
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
      

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = processedFile.name.substring(processedFile.name.lastIndexOf('.'));
      const fileName = `logo_${timestamp}${fileExtension}`;
      
      // Get the current authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }
      
      const filePath = `${user.id}/${fileName}`;
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


      // Get public URL (bucket will be made public)
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);


      const result = {
        success: true,
        url: filePath,
        publicUrl: urlData.publicUrl,
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
   * Gets the public URL for a logo
   */
  static getLogoPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  /**
   * Updates organization with logo information
   */
  static async updateOrganizationLogo(
    organizationId: string, 
    logoData: { 
      logo_url: string; 
      logo_file_name: string; 
      logo_public_url: string; 
    } | null
  ): Promise<{ success: boolean; error?: string }> {
    try {

      // Update logo_data field directly
      const updatePayload = {
        logo_data: logoData ? {
          logo_url: logoData.logo_url,
          logo_file_name: logoData.logo_file_name,
          logo_public_url: logoData.logo_public_url,
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