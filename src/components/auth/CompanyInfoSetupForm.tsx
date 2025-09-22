/**
 * Company Information Setup Form Component
 * 
 * Collects company information during organization creation flow
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { LogoUpload } from "@/components/common/uploads/LogoUpload";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { validators } from "@/utils/validation";

interface CompanyInfoSetupFormProps {
  organizationName: string;
  phone: string;
  fax: string;
  address: string;
  website: string;
  quoteStartingPoint: string;
  loading: boolean;
  userId: string;
  currentLogoUrl?: string;
  onPhoneChange: (phone: string) => void;
  onFaxChange: (fax: string) => void;
  onAddressChange: (address: string) => void;
  onWebsiteChange: (website: string) => void;
  onQuoteStartingPointChange: (startingPoint: string) => void;
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
  quoteStartingPoint,
  loading,
  userId,
  currentLogoUrl,
  onPhoneChange,
  onFaxChange,
  onAddressChange,
  onWebsiteChange,
  onQuoteStartingPointChange,
  onLogoUpload,
  onLogoError,
  onSubmit,
  onSkip
}) => {
  const [includeFax, setIncludeFax] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const validateField = (field: string, value: string) => {
    let validation = { isValid: true, error: undefined };

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
    }));

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
      setValidationErrors(prev => ({ ...prev, website: undefined }));
    }
    setTouched(prev => ({ ...prev, website: true }));
  };

  // Quote starting point formatting function
  const formatQuoteStartingPoint = (value: string): string => {
    // Remove spaces and convert to uppercase
    const cleanValue = value.replace(/\s/g, '').toUpperCase();
    
    // Allow alphanumeric characters and hyphens
    const allowedChars = cleanValue.replace(/[^A-Z0-9-]/g, '');
    
    return allowedChars;
  };

  const handleQuoteStartingPointChange = (value: string) => {
    onQuoteStartingPointChange(formatQuoteStartingPoint(value));
  };

  // Check if form has validation errors
  const hasValidationErrors = Object.values(validationErrors).some(error => error !== undefined);
  const hasRequiredFieldsEmpty = !phone.trim() || !address.trim() || !website.trim() || !quoteStartingPoint.trim();
  const isFormInvalid = hasValidationErrors || hasRequiredFieldsEmpty;
  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Logo Upload Section */}
        <div className="space-y-2">
          <Label>Company Logo (Optional)</Label>
          <LogoUpload
            onUploadSuccess={onLogoUpload}
            onUploadError={onLogoError}
            currentLogoUrl={currentLogoUrl}
            userId={userId}
            disabled={loading}
            className="max-w-md"
          />
          {/* <p className="text-xs text-muted-foreground">
            Upload your company logo to appear on quotes (JPG, JPEG, or SVG files)
          </p> */}
        </div>

        {/* Phone and Quote Starting Point */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <PhoneInput
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              label="Phone"
              placeholder="Enter your business phone number"
              required
              disabled={loading}
              error={touched.phone ? validationErrors.phone : undefined}
              showValidation
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quoteStartingPoint">Quote Starting Number <span className="text-red-500">*</span></Label>
            <Input
              id="quoteStartingPoint"
              type="text"
              value={quoteStartingPoint}
              onChange={(e) => handleQuoteStartingPointChange(e.target.value)}
              placeholder="P10001, 15000, Q-10001"
              required
              className="h-12 placeholder:text-muted-foreground/60"
            />
            {quoteStartingPoint && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-1">Next Proposal Number Preview:</p>
                <p className="text-lg font-semibold text-blue-700">{quoteStartingPoint}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Starting point for your quote numbering system
            </p>
          </div>
        </div>

        {/* Fax Section with Optional Checkbox */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeFax"
              checked={includeFax}
              onCheckedChange={(checked) => {
                setIncludeFax(checked as boolean);
                if (!checked) {
                  onFaxChange(''); // Clear fax when unchecked
                }
              }}
            />
            <Label htmlFor="includeFax" className="text-sm font-medium">
              Include fax number
            </Label>
          </div>

          {includeFax && (
            <div>
              <PhoneInput
                id="fax"
                value={fax}
                onChange={handleFaxChange}
                label="Fax"
                placeholder="Enter your business fax number"
                disabled={loading}
                error={touched.fax ? validationErrors.fax : undefined}
                showValidation
              />
            </div>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2">
          <MapboxInput
            id="address"
            label="Address *"
            value={address}
            onChange={onAddressChange}
            placeholder="Start typing your business address..."
            required={true}
            className="placeholder:text-muted-foreground/60"
          />
          <p className="text-xs text-muted-foreground">
            Type your full business address including city, state, and ZIP code
          </p>
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website">Website <span className="text-red-500">*</span></Label>
          <Input
            id="website"
            value={website}
            onChange={handleWebsiteChange}
            placeholder="https://www.yourcompany.com"
            required
            className={`h-12 placeholder:text-muted-foreground/60 ${
              touched.website && validationErrors.website ? 'border-red-500 focus:border-red-500' : ''
            }`}
            disabled={loading}
          />
          {touched.website && validationErrors.website && (
            <div className="text-sm text-red-600">{validationErrors.website}</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            className="flex-1 h-12 text-base"
            disabled={loading}
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 font-semibold"
            disabled={loading || isFormInvalid}
          >
            {loading ? "Saving..." : "Complete Setup"}
          </Button>
        </div>
      </form>

      {/* Skip Note */}
      <p className="text-xs text-muted-foreground text-center">
        You can add or update this information later in Settings
      </p>
    </div>
  );
};