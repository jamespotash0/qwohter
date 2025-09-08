/**
 * Company Information Setup Form Component
 * 
 * Collects company information during organization creation flow
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
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
  organizationName,
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
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Company Information</h2>
        <p className="text-muted-foreground">
          Add your company details for <span className="font-semibold">{organizationName}</span>.
          This information will be used in quote generation.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Phone and Fax */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              maxLength={14}
              required
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
              placeholder="(555) 123-4568"
              maxLength={14}
              required
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
            placeholder="Enter company website"
            required
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            className="flex-1"
            disabled={loading}
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary/90"
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