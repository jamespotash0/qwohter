/**
 * Company Information Setup Form Component
 * 
 * Collects company information during organization creation flow
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MapboxInput from "@/components/common/inputs/MapboxInput";

interface CompanyInfoSetupFormProps {
  organizationName: string;
  phone: string;
  fax: string;
  address: string;
  website: string;
  loading: boolean;
  onPhoneChange: (phone: string) => void;
  onFaxChange: (fax: string) => void;
  onAddressChange: (address: string) => void;
  onWebsiteChange: (website: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}

export const CompanyInfoSetupForm: React.FC<CompanyInfoSetupFormProps> = ({
  phone,
  fax,
  address,
  website,
  loading,
  onPhoneChange,
  onFaxChange,
  onAddressChange,
  onWebsiteChange,
  onSubmit,
  onSkip
}) => {
  // Phone number formatting function
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format based on length
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return `(${phoneNumber}`;
    if (phoneNumber.length <= 6) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (value: string) => {
    onPhoneChange(formatPhoneNumber(value));
  };

  const handleFaxChange = (value: string) => {
    onFaxChange(formatPhoneNumber(value));
  };
  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="Enter your business phone number"
              maxLength={14}
              required
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Format: (xxx) xxx-xxxx
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fax">Fax <span className="text-red-500">*</span></Label>
            <Input
              id="fax"
              type="tel"
              value={fax}
              onChange={(e) => handleFaxChange(e.target.value)}
              placeholder="Enter your business fax number"
              maxLength={14}
              required
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              Format: (xxx) xxx-xxxx
            </p>
          </div>
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
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://www.yourcompany.com"
            required
            className="h-12"
          />
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
            disabled={loading}
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