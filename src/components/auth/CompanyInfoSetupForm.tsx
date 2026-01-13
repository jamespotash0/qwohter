/**
 * Company Information Setup Form Component
 * 
 * Collects company information during organization creation flow
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { LogoUploadResult, LogoUploadService } from "@/services/LogoUploadService";
import { validators } from "@/utils/validation";
import { IndustrySelector } from "@/components/auth/IndustrySelector";
import { FoundViaSelector } from "@/components/auth/FoundViaSelector";

interface CompanyInfoSetupFormProps {
  organizationName: string;
  phone: string;
  fax: string;
  address: string;
  website: string;
  industry: string;
  foundVia: string;
  loading: boolean;
  userId: string;
  currentLogoUrl?: string;
  onPhoneChange: (phone: string) => void;
  onFaxChange: (fax: string) => void;
  onAddressChange: (address: string) => void;
  onWebsiteChange: (website: string) => void;
  onIndustryChange: (industry: string) => void;
  onFoundViaChange: (foundVia: string) => void;
  onLogoUpload: (result: LogoUploadResult) => void;
  onLogoError: (error: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}

export const CompanyInfoSetupForm: React.FC<CompanyInfoSetupFormProps> = ({
  phone,
  fax,
  address,
  website,
  industry,
  foundVia,
  loading,
  userId,
  currentLogoUrl,
  onPhoneChange,
  onFaxChange,
  onAddressChange,
  onWebsiteChange,
  onIndustryChange,
  onFoundViaChange,
  onLogoUpload,
  onLogoError,
  onSubmit,
  onSkip
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const validateField = (field: string, value: string) => {
    let validation: { isValid: boolean; error?: string } = { isValid: true, error: undefined };

    switch (field) {
      case 'phone':
        validation = validators.phoneNumber(value);
        break;
      case 'fax':
        if (value) validation = validators.phoneNumber(value);
        break;
      case 'website':
        validation = validators.website(value);
        break;
      default:
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: validation.error
    }) as any);

    return validation.isValid;
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(value);
    validateField('phone', value);
    setTouched(prev => ({ ...prev, phone: true }));
  };

  const handleFaxChange = (value: string) => {
    onFaxChange(value);
    validateField('fax', value);
    setTouched(prev => ({ ...prev, fax: true }));
  };

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onWebsiteChange(value);
    if (value.trim()) {
      validateField('website', value);
    } else {
      setValidationErrors(prev => {
        const { website, ...rest } = prev;
        return rest;
      });
    }
    setTouched(prev => ({ ...prev, website: true }));
  };

  // Check if form has validation errors - only Found Via is required
  const hasValidationErrors = Object.values(validationErrors).some(error => error !== undefined);
  const hasRequiredFieldsEmpty = !foundVia.trim();
  const isFormInvalid = hasValidationErrors || hasRequiredFieldsEmpty;

  const handleLogoUploadClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/svg+xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          onLogoError('File size must be less than 5MB');
          return;
        }

        setIsUploading(true);
        setUploadedFileName(file.name);

        try {
          const result = await LogoUploadService.uploadLogo(file, userId);

          if (result.success) {
            onLogoUpload({
              success: true,
              url: result.url,
              fileName: file.name
            });
          } else {
            onLogoError(result.error || 'Upload failed');
            setUploadedFileName('');
          }
        } catch {
          onLogoError('Upload failed. Please try again.');
          setUploadedFileName('');
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Logo Upload Section - Full Width */}
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium text-sm">Company Logo (Optional)</Label>
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleLogoUploadClick}
              disabled={loading || isUploading}
              className="h-10"
            >
              {isUploading ? 'Uploading...' : 'Choose File'}
            </Button>
            {currentLogoUrl && uploadedFileName && (
              <span className="text-sm text-green-600">✓ {uploadedFileName}</span>
            )}
            {currentLogoUrl && !uploadedFileName && (
              <span className="text-sm text-green-600">✓ Logo uploaded</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Upload your logo to appear on proposals (JPG, JPEG, SVG, max 5MB)
          </p>
        </div>

        {/* Phone & Fax - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PhoneInput
            id="phone"
            value={phone}
            onChange={handlePhoneChange}
            label="Phone Number (Optional)"
            placeholder="Enter your business phone"
            disabled={loading}
            error={touched.phone ? validationErrors.phone : undefined}
            showValidation={false}
          />
          <PhoneInput
            id="fax"
            value={fax}
            onChange={handleFaxChange}
            label="Fax Number (Optional)"
            placeholder="Enter your business fax"
            disabled={loading}
            error={touched.fax ? validationErrors.fax : undefined}
            showValidation={false}
          />
        </div>

        {/* Address - Full Width */}
        <div className="space-y-2">
          <MapboxInput
            id="address"
            label="Address (Optional)"
            value={address}
            onChange={onAddressChange}
            placeholder="Start typing your business address..."
            required={false}
            className="bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-400">
            Type your full business address including city, state, and ZIP code
          </p>
        </div>

        {/* Website & Industry - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website" className="text-gray-700 font-medium text-sm">Website (Optional)</Label>
            <Input
              id="website"
              value={website}
              onChange={handleWebsiteChange}
              placeholder="https://www.yourcompany.com"
              className={`bg-white border-gray-300 h-12 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500 ${
                touched.website && validationErrors.website ? 'border-red-500 focus:border-red-500' : ''
              }`}
              disabled={loading}
            />
            {touched.website && validationErrors.website && (
              <div className="text-sm text-red-600">{validationErrors.website}</div>
            )}
          </div>
          <IndustrySelector
            value={industry}
            onChange={onIndustryChange}
            required={false}
            disabled={loading}
          />
        </div>

        {/* Found Via - Full Width */}
        <FoundViaSelector
          value={foundVia}
          onChange={onFoundViaChange}
          required
          disabled={loading}
        />

        {/* Action Button */}
        <div className="pt-4">
          <Button
            type="submit"
            className="w-full h-12 text-base bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors"
            disabled={loading || isFormInvalid}
          >
            {loading ? "Saving..." : "Complete Setup"}
          </Button>
        </div>
      </form>

      {/* Note */}
      <p className="text-xs text-gray-400 text-center">
        You can update this information later in Settings
      </p>
    </div>
  );
};