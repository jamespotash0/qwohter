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
import MapboxInput from "@/components/common/inputs/MapboxInput";
import { CompanyInfoFormData } from "@/lib/types/settings/companySettings";

interface CompanyInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompanyInfoFormData) => void;
  organizationName?: string;
  initialData?: CompanyInfoFormData | null;
}

export function CompanyInfoDialog({
  isOpen,
  onClose,
  onSave,
  organizationName,
  initialData,
}: CompanyInfoDialogProps) {
  const [formData, setFormData] = useState<CompanyInfoFormData>({
    phone: "",
    fax: "",
    address: "",
    website: "",
  });

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

  useEffect(() => {
    if (initialData) {
      setFormData({
        phone: initialData.phone || "",
        fax: initialData.fax || "",
        address: initialData.address || "",
        website: initialData.website || "",
      });
    } else {
      setFormData({
        phone: "",
        fax: "",
        address: "",
        website: "",
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CompanyInfoFormData> = {};

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!formData.fax.trim()) {
      newErrors.fax = "Fax number is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.website.trim()) {
      newErrors.website = "Website is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (field: keyof CompanyInfoFormData, value: string) => {
    let formattedValue = value;
    
    // Apply phone number formatting for phone and fax fields
    if (field === 'phone' || field === 'fax') {
      formattedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
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

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
                maxLength={14}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: (xxx) xxx-xxxx
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fax">Fax *</Label>
              <Input
                id="fax"
                type="tel"
                value={formData.fax}
                onChange={(e) => handleChange("fax", e.target.value)}
                placeholder="(555) 123-4568"
                maxLength={14}
                className={errors.fax ? "border-destructive" : ""}
              />
              {errors.fax && (
                <p className="text-sm text-destructive">{errors.fax}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Format: (xxx) xxx-xxxx
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <MapboxInput
              id="address"
              label="Address *"
              value={formData.address}
              onChange={(address) => handleChange("address", address)}
              placeholder="Start typing your business address..."
              required={true}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Type your full business address including city, state, and ZIP code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website *</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="Enter company website"
              className={errors.website ? "border-destructive" : ""}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website}</p>
            )}
          </div>

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