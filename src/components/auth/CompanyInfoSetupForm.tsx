/**
 * Company Information Setup Form Component - Redesigned
 *
 * Clean, organized layout for company details collection
 * Refined styling consistent with the editorial design direction
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { validators } from "@/utils/validation";
import { IndustrySelector } from "@/components/auth/IndustrySelector";
import { FoundViaSelector } from "@/components/auth/FoundViaSelector";
import { Loader2, ArrowRight } from "lucide-react";

interface CompanyInfoSetupFormProps {
  phone: string;
  fax: string;
  address: string;
  website: string;
  industry: string;
  foundVia: string;
  loading: boolean;
  onPhoneChange: (phone: string) => void;
  onFaxChange: (fax: string) => void;
  onAddressChange: (address: string) => void;
  onWebsiteChange: (website: string) => void;
  onIndustryChange: (industry: string) => void;
  onFoundViaChange: (foundVia: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CompanyInfoSetupForm: React.FC<CompanyInfoSetupFormProps> = ({
  phone,
  fax,
  address,
  website,
  industry,
  foundVia,
  loading,
  onPhoneChange,
  onFaxChange,
  onAddressChange,
  onWebsiteChange,
  onIndustryChange,
  onFoundViaChange,
  onSubmit
}) => {
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const inputClasses = `
    w-full h-12 px-4 bg-[#f7f2e9]/50 border border-[#171717]/10 rounded-full
    text-[#171717] placeholder:text-[#171717]/40
    transition-all duration-200
    hover:border-[#171717]/20 hover:bg-[#f7f2e9]/70
    focus:outline-none focus:ring-2 focus:ring-[#ee6c4d]/20 focus:border-[#ee6c4d] focus:bg-white
  `;

  const inputErrorClasses = `
    border-red-300 bg-red-50/30
    hover:border-red-400
    focus:ring-red-200 focus:border-red-400
  `;

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

  const hasValidationErrors = Object.values(validationErrors).some(error => error !== undefined);
  const isFormInvalid = hasValidationErrors;

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Phone & Fax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PhoneInput
            id="phone"
            value={phone}
            onChange={handlePhoneChange}
            label="Phone Number"
            placeholder="(555) 123-4567"
            disabled={loading}
            error={touched.phone ? validationErrors.phone : undefined}
            showValidation={false}
          />
          <PhoneInput
            id="fax"
            value={fax}
            onChange={handleFaxChange}
            label="Fax Number"
            placeholder="(555) 123-4567"
            disabled={loading}
            error={touched.fax ? validationErrors.fax : undefined}
            showValidation={false}
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <MapboxInput
            id="address"
            label="Business Address"
            value={address}
            onChange={onAddressChange}
            placeholder="Start typing your address..."
            required={false}
            className={inputClasses}
          />
        </div>

        {/* Website & Industry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="website"
              className="text-sm font-medium text-[#171717]"
              style={{ fontFamily: 'Urbanist, sans-serif' }}
            >
              Website
            </Label>
            <Input
              id="website"
              value={website}
              onChange={handleWebsiteChange}
              placeholder="https://yourcompany.com"
              className={`${inputClasses} ${
                touched.website && validationErrors.website ? inputErrorClasses : ''
              }`}
              disabled={loading}
            />
            {touched.website && validationErrors.website && (
              <p className="text-sm text-red-500">{validationErrors.website}</p>
            )}
          </div>
          <IndustrySelector
            value={industry}
            onChange={onIndustryChange}
            required={false}
            disabled={loading}
          />
        </div>

        {/* Found Via */}
        <div className="pt-1">
          <FoundViaSelector
            value={foundVia}
            onChange={onFoundViaChange}
            required={false}
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <Button
            type="submit"
            className="w-full h-12 bg-[#ee6c4d] hover:bg-[#ee6c4d]/90 text-white font-semibold rounded-full transition-all duration-200 group"
            style={{ fontFamily: 'Urbanist, sans-serif' }}
            disabled={loading || isFormInvalid}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Complete setup
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Note */}
      <p className="text-xs text-[#171717]/40 text-center">
        You can update this information anytime in Settings
      </p>

      {/* Support Contact */}
      <p
        className="text-xs text-[#171717]/40 text-center"
        style={{ fontFamily: 'Urbanist, sans-serif' }}
      >
        Need help?{' '}
        <a href="mailto:info@qwohter.com" className="text-[#ee6c4d] hover:underline">
          info@qwohter.com
        </a>
      </p>
    </div>
  );
};
