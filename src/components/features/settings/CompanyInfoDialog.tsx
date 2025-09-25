import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Info } from "lucide-react";
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { LogoUpload } from "@/components/common/uploads/LogoUpload";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CompanyInfoFormData } from "@/lib/types/settings/companySettings";
import { LogoUploadResult } from "@/services/LogoUploadService";
import { supabase } from "@/integrations/supabase/client";

interface CompanyInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompanyInfoFormData) => void;
  organizationName?: string;
  initialData?: CompanyInfoFormData | null;
  userId: string;
  organizationId: string;
}

export function CompanyInfoDialog({
  isOpen,
  onClose,
  onSave,
  organizationName,
  initialData,
  userId,
}: CompanyInfoDialogProps) {
  const [formData, setFormData] = useState<CompanyInfoFormData>({
    phone_number: "",
    fax_number: "",
    company_address: "",
    website: "",
    quote_start_number: "",
  });

  const [includeFax, setIncludeFax] = useState(false);
  const [hasExistingQuotes, setHasExistingQuotes] = useState(false);

  const [errors, setErrors] = useState<Partial<CompanyInfoFormData>>({});

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

  // Quote starting point formatting function
  const formatQuoteStartingPoint = (value: string): string => {
    // Remove spaces and convert to uppercase
    const cleanValue = value.replace(/\s/g, '').toUpperCase();
    
    // Allow alphanumeric characters and hyphens
    const allowedChars = cleanValue.replace(/[^A-Z0-9-]/g, '');
    
    return allowedChars;
  };

  // Check if there are existing quotes
  const checkForExistingQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Error checking for existing quotes:', error);
        return;
      }
      
      setHasExistingQuotes(data && data.length > 0);
    } catch (error) {
      console.error('Error checking for existing quotes:', error);
    }
  };

  // Handle logo upload
  const handleLogoUpload = async (result: LogoUploadResult) => {
    if (result.success) {
      console.log('🎯 Logo upload successful, updating form state:', result);
      
      // Update local form state with new logo data
      const updatedFormData = {
        ...formData,
        logo_url: result.url || '',
        logo_file_name: result.fileName || '',
        logo_public_url: result.publicUrl || '',
      };
      
      console.log('🔄 Setting new form data:', updatedFormData);
      setFormData(updatedFormData);
    }
  };

  // Handle logo upload error
  const handleLogoError = (error: string) => {
    console.error('Logo upload error:', error);
    // You might want to show a toast notification here
  };

  useEffect(() => {
    if (isOpen) {
      checkForExistingQuotes();
    }
    
    if (initialData) {
      setFormData({
        phone_number: initialData.phone_number || "",
        fax_number: initialData.fax_number || "",
        company_address: initialData.company_address || "",
        website: initialData.website || "",
        quote_start_number: initialData.quote_start_number || "",
        logo_data: initialData.logo_data || undefined,
      });
      setIncludeFax(Boolean(initialData.fax_number));
    } else {
      setFormData({
        phone_number: "",
        fax_number: "",
        company_address: "",
        website: "",
        quote_start_number: "",
        logo_data: undefined,
      });
      setIncludeFax(false);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CompanyInfoFormData> = {};

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Phone number is required";
    }

    if (includeFax && !formData.fax_number.trim()) {
      newErrors.fax_number = "Fax number is required";
    }

    if (!formData.company_address.trim()) {
      newErrors.company_address = "Address is required";
    }

    if (!formData.website.trim()) {
      newErrors.website = "Website is required";
    }

    if (!hasExistingQuotes && !formData.quote_start_number.trim()) {
      newErrors.quote_start_number = "Quote starting point is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Clear fax if not included
      const dataToSave = {
        ...formData,
        fax_number: includeFax ? formData.fax_number : ''
      };

      // Logo data is now included in formData.logo_data and will be saved by the service layer

      onSave(dataToSave);
    }
  };

  const handleChange = (field: keyof CompanyInfoFormData, value: string) => {
    let formattedValue = value;
    
    // Apply phone number formatting for phone and fax fields
    if (field === 'phone_number' || field === 'fax_number') {
      formattedValue = formatPhoneNumber(value);
    }

    // Apply quote starting point formatting
    if (field === 'quote_start_number') {
      formattedValue = formatQuoteStartingPoint(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Update Company Information" : "Set Up Company Information"}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? `Make changes to ${organizationName || 'your organization'}'s contact details and business information.`
              : `Enter ${organizationName || 'your organization'}'s contact details to get started with professional quote generation.`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Upload Section */}
          <div className="flex justify-center">
            <div className="space-y-2 flex flex-col items-center max-w-md">
              <LogoUpload
                onUploadSuccess={handleLogoUpload}
                onUploadError={handleLogoError}
                currentLogoUrl={formData.logo_data?.logo_public_url}
                userId={userId}
                className="w-full"
              />
            </div>
          </div>

          {/* Phone and Fax Section */}
          <div className="grid grid-cols-2 gap-6">
            {/* Phone Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Format: (xxx) xxx-xxxx</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="phone"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="Enter your business phone number"
                maxLength={14}
                className={`h-12 placeholder:text-muted-foreground/60 ${errors.phone_number ? "border-destructive" : ""}`}
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number}</p>
              )}
            </div>

            {/* Fax Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="fax">Fax</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Format: (xxx) xxx-xxxx</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="fax"
                type="tel"
                value={formData.fax_number}
                onChange={(e) => handleChange("fax_number", e.target.value)}
                placeholder="Enter your business fax number"
                maxLength={14}
                disabled={!includeFax}
                className={`h-12 placeholder:text-muted-foreground/60 ${errors.fax_number ? "border-destructive" : ""} ${!includeFax ? "bg-muted cursor-not-allowed" : ""}`}
              />
              {errors.fax_number && (
                <p className="text-sm text-destructive">{errors.fax_number}</p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="includeFax"
                  checked={includeFax}
                  onCheckedChange={(checked) => {
                    setIncludeFax(checked as boolean);
                    if (!checked) {
                      handleChange("fax_number", ""); // Clear fax when unchecked
                    }
                  }}
                />
                <Label htmlFor="includeFax" className="text-sm font-medium">
                  Optional
                </Label>
              </div>
            </div>
          </div>

          {/* Quote Starting Point Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="quoteStartingPoint" className="flex items-center gap-2">
                Quote Starting Number 
                {!hasExistingQuotes && <span className="text-red-500">*</span>}
                {hasExistingQuotes && <Lock className="w-4 h-4 text-muted-foreground" />}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      {hasExistingQuotes 
                        ? "Cannot be changed - quotes already exist with this numbering system"
                        : "Starting point for your quote numbering system"
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="quoteStartingPoint"
              type="text"
              value={formData.quote_start_number}
              onChange={(e) => handleChange("quote_start_number", e.target.value)}
              placeholder="P10001, 15000, Q-10001"
              disabled={hasExistingQuotes}
              className={`h-12 placeholder:text-muted-foreground/60 ${errors.quote_start_number ? "border-destructive" : ""} ${hasExistingQuotes ? "bg-muted cursor-not-allowed" : ""}`}
            />
            {errors.quote_start_number && (
              <p className="text-sm text-destructive">{errors.quote_start_number}</p>
            )}
          </div>

          {/* Address and Website Section */}
          <div className="grid grid-cols-2 gap-6">
            {/* Address */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Type your full business address including city, state, and ZIP code</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <MapboxInput
                id="address"
                value={formData.company_address}
                onChange={(address) => handleChange("company_address", address)}
                placeholder="Start typing your business address..."
                required={true}
                label=""
                className="placeholder:text-muted-foreground/60"
              />
              {errors.company_address && (
                <p className="text-sm text-destructive">{errors.company_address}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="website">Website <span className="text-red-500">*</span></Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Your company website URL (e.g., https://www.yourcompany.com)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://www.yourcompany.com"
                className={`h-12 placeholder:text-muted-foreground/60 ${errors.website ? "border-destructive" : ""}`}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Save Changes" : "Set Up Company"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}