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
import { Textarea } from "@/components/ui/textarea";
import { CompanyInfoFormData } from "@/types/companySettings";

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
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Company Information" : "Add Company Information"}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? `Update company information for ${organizationName || 'your organization'}.`
              : `Add company information for ${organizationName || 'your organization'} to use in quote generation.`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fax">Fax *</Label>
              <Input
                id="fax"
                value={formData.fax}
                onChange={(e) => handleChange("fax", e.target.value)}
                placeholder="(555) 123-4568"
                className={errors.fax ? "border-destructive" : ""}
              />
              {errors.fax && (
                <p className="text-sm text-destructive">{errors.fax}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="123 Main Street&#10;City, State 12345"
              rows={3}
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
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
              {initialData ? "Update" : "Add"} Company Information
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}