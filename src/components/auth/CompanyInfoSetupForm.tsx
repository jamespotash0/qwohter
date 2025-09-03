/**
 * Company Information Setup Form Component
 * 
 * Collects company information during organization creation flow
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Phone, Printer, MapPin, Globe, Mail } from "lucide-react";

interface CompanyInfoSetupFormProps {
  organizationName: string;
  phone: string;
  fax: string;
  address: string;
  website: string;
  email: string;
  loading: boolean;
  onPhoneChange: (phone: string) => void;
  onFaxChange: (fax: string) => void;
  onAddressChange: (address: string) => void;
  onWebsiteChange: (website: string) => void;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
}

export const CompanyInfoSetupForm: React.FC<CompanyInfoSetupFormProps> = ({
  organizationName,
  phone,
  fax,
  address,
  website,
  email,
  loading,
  onPhoneChange,
  onFaxChange,
  onAddressChange,
  onWebsiteChange,
  onEmailChange,
  onSubmit,
  onSkip
}) => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              required
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fax" className="text-sm font-medium flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Fax Number *
            </Label>
            <Input
              id="fax"
              type="tel"
              value={fax}
              onChange={(e) => onFaxChange(e.target.value)}
              placeholder="(555) 123-4568"
              required
              className="h-10"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Business Address *
          </Label>
          <Textarea
            id="address"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="123 Main Street&#10;City, State 12345"
            required
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website *
          </Label>
          <Input
            id="website"
            type="url"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
            placeholder="https://www.yourcompany.com"
            required
            className="h-10"
          />
        </div>

        {/* Email (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="company-email" className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Company Email <span className="text-muted-foreground text-xs">(Optional)</span>
          </Label>
          <Input
            id="company-email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="contact@yourcompany.com"
            className="h-10"
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