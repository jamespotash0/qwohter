# Company Logo Upload Implementation Plan

## Overview
Add logo upload functionality to company setup that allows organizations to upload JPG/JPEG or SVG files. The logo will appear in the top-left corner of quotes without affecting layout or pushing content down.

## 1. Database Schema Updates

### 1.1 Organization Info Enhancement
```sql
-- Add logo fields to organization_info JSONB
-- No schema changes needed, just extend the JSONB structure:
{
  "phone": "...",
  "fax": "...", 
  "address": "...",
  "website": "...",
  "quote_starting_point": "...",
  "logo": {
    "url": "https://supabase-storage.../logo.jpg",
    "filename": "company-logo.jpg",
    "file_size": 1024000,
    "file_type": "image/jpeg",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "dimensions": {
      "width": 300,
      "height": 100
    }
  }
}
```

### 1.2 Supabase Storage Setup
```sql
-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('organization-logos', 'organization-logos', true);

-- RLS policies for logo bucket
CREATE POLICY "Users can upload logos for their organization" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view logos for their organization" 
ON storage.objects FOR SELECT TO authenticated 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update logos for their organization" 
ON storage.objects FOR UPDATE TO authenticated 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete logos for their organization" 
ON storage.objects FOR DELETE TO authenticated 
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 2. Backend Implementation

### 2.1 Logo Upload Service
```typescript
// src/services/logoUploadService.ts
export class LogoUploadService {
  private readonly BUCKET_NAME = 'organization-logos';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/svg+xml'];
  private readonly MAX_DIMENSIONS = { width: 800, height: 400 };

  async uploadLogo(
    file: File, 
    organizationId: string, 
    userId: string
  ): Promise<LogoUploadResult> {
    // Validate file
    this.validateFile(file);
    
    // Generate unique filename
    const fileExtension = this.getFileExtension(file.name);
    const fileName = `${userId}/${organizationId}-logo-${Date.now()}.${fileExtension}`;
    
    // Process image (resize if needed)
    const processedFile = await this.processImage(file);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .upload(fileName, processedFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(fileName);

    // Get image dimensions
    const dimensions = await this.getImageDimensions(processedFile);

    return {
      url: publicUrl,
      filename: file.name,
      file_size: processedFile.size,
      file_type: file.type,
      uploaded_at: new Date().toISOString(),
      dimensions
    };
  }

  private validateFile(file: File): void {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Only JPG, JPEG, and SVG files are allowed');
    }
    
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }
  }

  private async processImage(file: File): Promise<File> {
    if (file.type === 'image/svg+xml') {
      return file; // SVGs don't need processing
    }

    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const { width, height } = this.calculateDimensions(
          img.width, 
          img.height, 
          this.MAX_DIMENSIONS.width, 
          this.MAX_DIMENSIONS.height
        );

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const processedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(processedFile);
        }, file.type, 0.9);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let width = originalWidth;
    let height = originalHeight;

    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  async deleteLogo(logoUrl: string, userId: string): Promise<void> {
    const fileName = this.extractFileNameFromUrl(logoUrl);
    
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([`${userId}/${fileName}`]);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  private extractFileNameFromUrl(url: string): string {
    return url.split('/').pop() || '';
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = URL.createObjectURL(file);
    });
  }
}

export const logoUploadService = new LogoUploadService();
```

### 2.2 Type Definitions
```typescript
// src/lib/types/settings/companySettings.ts additions
export interface LogoInfo {
  url: string;
  filename: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface OrganizationInfo {
  phone?: string;
  fax?: string;
  address?: string;
  website?: string;
  quote_starting_point?: string;
  logo?: LogoInfo;
}

export interface CompanyInfoFormData {
  phone: string;
  fax: string;
  address: string;
  website: string;
  quote_starting_point: string;
  logo?: LogoInfo;
}

export interface LogoUploadResult extends LogoInfo {}
```

## 3. Frontend Implementation

### 3.1 Logo Upload Component
```typescript
// src/components/common/inputs/LogoUpload.tsx
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { logoUploadService } from '@/services/logoUploadService';

interface LogoUploadProps {
  currentLogo?: LogoInfo;
  onLogoChange: (logo: LogoInfo | null) => void;
  organizationId: string;
  disabled?: boolean;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  currentLogo,
  onLogoChange,
  organizationId,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await logoUploadService.uploadLogo(
        file, 
        organizationId, 
        'current-user-id' // Get from auth context
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      onLogoChange(result);
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [organizationId, onLogoChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/svg+xml': ['.svg']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: disabled || uploading
  });

  const handleRemoveLogo = async () => {
    if (!currentLogo) return;
    
    try {
      await logoUploadService.deleteLogo(currentLogo.url, 'current-user-id');
      onLogoChange(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Company Logo</label>
        <span className="text-xs text-muted-foreground">
          JPG, JPEG, or SVG • Max 5MB
        </span>
      </div>

      {currentLogo ? (
        <div className="relative">
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 border rounded flex items-center justify-center bg-white">
                <img 
                  src={currentLogo.url} 
                  alt="Company logo" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentLogo.filename}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(currentLogo.file_size / 1024)} KB • 
                {currentLogo.dimensions.width} × {currentLogo.dimensions.height}px
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            {uploading ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Uploading logo...</p>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragActive ? 'Drop your logo here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, JPEG, and SVG files up to 5MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};
```

### 3.2 Integration into Company Setup Forms

#### 3.2.1 Company Info Setup Form
```typescript
// src/components/auth/CompanyInfoSetupForm.tsx additions
import { LogoUpload } from '@/components/common/inputs/LogoUpload';

// Add to interface
interface CompanyInfoSetupFormProps {
  // ... existing props
  logo?: LogoInfo;
  onLogoChange: (logo: LogoInfo | null) => void;
}

// Add to form JSX after website field
{/* Logo Upload */}
<div className="space-y-2">
  <LogoUpload
    currentLogo={logo}
    onLogoChange={onLogoChange}
    organizationId={organizationName} // Use org name as temp ID during setup
    disabled={loading}
  />
  <p className="text-xs text-muted-foreground">
    Your logo will appear in the top-left corner of all quotes
  </p>
</div>
```

#### 3.2.2 Company Info Dialog
```typescript
// src/components/features/settings/CompanyInfoDialog.tsx additions
// Add logo state
const [logoInfo, setLogoInfo] = useState<LogoInfo | null>(null);

// Add to form data interface (extend existing)
const [formData, setFormData] = useState<CompanyInfoFormData & { logo?: LogoInfo }>({
  // ... existing fields
  logo: undefined
});

// Add logo upload to form JSX after website field
{/* Logo Upload */}
<div className="space-y-2">
  <LogoUpload
    currentLogo={formData.logo}
    onLogoChange={(logo) => setFormData(prev => ({ ...prev, logo }))}
    organizationId={organizationName || 'temp'}
    disabled={loading}
  />
</div>
```

## 4. Quote Template Integration

### 4.1 Logo Display Component
```typescript
// src/components/quotes/LogoDisplay.tsx
interface LogoDisplayProps {
  logo?: LogoInfo;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export const LogoDisplay: React.FC<LogoDisplayProps> = ({
  logo,
  className = "",
  maxWidth = 200,
  maxHeight = 80
}) => {
  if (!logo) return null;

  const logoStyles: React.CSSProperties = {
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`,
    width: 'auto',
    height: 'auto',
    objectFit: 'contain'
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src={logo.url}
        alt="Company logo"
        style={logoStyles}
        className="object-contain"
      />
    </div>
  );
};
```

### 4.2 Quote Template Updates
```typescript
// Update quote templates to include logo in top-left corner
// src/templates/BaseTemplate/BaseQuoteTemplate.ts

const getQuoteHeader = (quoteData: QuoteData, organizationInfo?: OrganizationInfo): string => {
  const logo = organizationInfo?.logo;
  
  return `
    <div class="quote-header" style="
      position: relative;
      min-height: 100px;
      margin-bottom: 20px;
      padding-top: 20px;
    ">
      ${logo ? `
        <div class="company-logo" style="
          position: absolute;
          top: 0;
          left: 0;
          z-index: 10;
          max-width: 200px;
          max-height: 80px;
        ">
          <img 
            src="${logo.url}" 
            alt="Company logo"
            style="
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              object-fit: contain;
            "
          />
        </div>
      ` : ''}
      
      <div class="quote-title" style="
        text-align: center;
        padding-top: ${logo ? '60px' : '20px'};
      ">
        <h1 style="
          font-size: 28px;
          font-weight: bold;
          color: #1a1a1a;
          margin: 0;
        ">QUOTE</h1>
        <p style="
          font-size: 16px;
          color: #666;
          margin: 5px 0 0 0;
        ">${quoteData.quote_details.proposal_number}</p>
      </div>
    </div>
  `;
};
```

### 4.3 Live Preview Integration
```typescript
// src/components/features/quotes/editing/UnifiedQuoteEditor/LivePreview/LivePreviewPanel.tsx
// Add organization info to preview context
const { organization } = useOrganizationSettings();

// Pass logo to template generation
const generatePreviewHTML = () => {
  return templateService.generateHTML(quoteData, {
    organizationInfo: organization?.organization_info
  });
};
```

## 5. PDF Export Integration

### 5.1 PDF Template Updates
```typescript
// src/utils/playwrightPdfUtils.ts
// Ensure logos are properly loaded before PDF generation
const waitForLogosToLoad = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => img.src.includes('organization-logos'))
        .map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            // Timeout after 5 seconds
            setTimeout(reject, 5000);
          });
        })
    );
  });
};

// Update PDF generation function
export const generatePDF = async (html: string): Promise<Buffer> => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();
  
  await page.setContent(html);
  await waitForLogosToLoad(page);
  
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
  });
  
  await browser.close();
  return pdf;
};
```

## 6. Implementation Steps

### Phase 1: Backend Setup (Week 1)
1. [ ] Set up Supabase storage bucket and policies
2. [ ] Implement LogoUploadService with image processing
3. [ ] Update OrganizationInfo type definitions
4. [ ] Add error handling and validation

### Phase 2: Frontend Components (Week 1-2)
1. [ ] Create LogoUpload component with drag-and-drop
2. [ ] Add progress indicators and error states
3. [ ] Integrate into CompanyInfoSetupForm
4. [ ] Integrate into CompanyInfoDialog
5. [ ] Add form validation

### Phase 3: Quote Integration (Week 2)
1. [ ] Create LogoDisplay component
2. [ ] Update quote templates with logo positioning
3. [ ] Integrate with live preview system
4. [ ] Test logo positioning and scaling

### Phase 4: PDF & Testing (Week 2-3)
1. [ ] Update PDF generation to handle logos
2. [ ] Add logo loading timeouts and fallbacks
3. [ ] Test with various image sizes and formats
4. [ ] Performance optimization
5. [ ] Cross-browser testing

## 7. Technical Considerations

### 7.1 Image Optimization
- Automatic resizing for large images (max 800x400px)
- Quality compression for JPEG files (90% quality)
- SVG sanitization for security
- Progressive loading with placeholders

### 7.2 Performance
- Lazy loading for logo images
- CDN caching for uploaded logos
- Image preloading in quote previews
- Optimized file sizes

### 7.3 Security
- File type validation
- File size limits (5MB)
- User-specific storage paths
- RLS policies for access control

### 7.4 Accessibility
- Alt text for all logo images
- Proper contrast ratios
- Screen reader compatibility
- Keyboard navigation support

This implementation provides a complete logo upload system that integrates seamlessly with the existing company setup flow and quote generation system.