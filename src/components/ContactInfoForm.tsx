import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { User, Mail, Phone, Printer, MapPin, Globe } from "lucide-react";

interface ContactInfoData {
  contactName: string;
  contactEmail: string;
  address: string;
  phone: string;
  fax: string;
  website: string;
}

interface ContactInfoFormProps {
  data: ContactInfoData;
  onUpdate: (data: ContactInfoData) => void;
}

const ContactInfoForm = ({ data, onUpdate }: ContactInfoFormProps) => {
  const handleChange = (field: keyof ContactInfoData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const contactNames = [
    "Ed Machinski",
    "Stan Potash"
  ];

  const contactEmails = [
    "ed@contemporarywalls.com",
    "stan@contemporarywalls.com"
  ];

  // Auto-set single-option fields
  useEffect(() => {
    const autoSetFields = {
      address: "567 Commerce St, Franklin Lakes, NJ, 07417",
      phone: "(973) 884-0474",
      fax: "(973) 884-1606",
      website: "www.contemporarywalls.com"
    };

    let shouldUpdate = false;
    const updatedData = { ...data };

    Object.entries(autoSetFields).forEach(([field, value]) => {
      if (!data[field as keyof ContactInfoData]) {
        updatedData[field as keyof ContactInfoData] = value;
        shouldUpdate = true;
      }
    });

    if (shouldUpdate) {
      onUpdate(updatedData);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">Contact Information</h2>
        <p className="text-sm text-muted-foreground">Select your contact details to personalize this quote</p>
      </div>

      {/* Optimized Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="contactName" className="text-sm font-medium flex items-center gap-1">
            <User className="w-3 h-3" />
            Contact Name *
          </Label>
          <Select
            value={data.contactName}
            onValueChange={(value) => handleChange("contactName", value)}
            required
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select contact name" />
            </SelectTrigger>
            <SelectContent>
              {contactNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="contactEmail" className="text-sm font-medium flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Contact Email *
          </Label>
          <Select
            value={data.contactEmail}
            onValueChange={(value) => handleChange("contactEmail", value)}
            required
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select contact email" />
            </SelectTrigger>
            <SelectContent>
              {contactEmails.map((email) => (
                <SelectItem key={email} value={email}>
                  {email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
            <Phone className="w-3 h-3" />
            Phone *
          </Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(973) 884-0474"
            required
            className="h-9"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="fax" className="text-sm font-medium flex items-center gap-1">
            <Printer className="w-3 h-3" />
            Fax *
          </Label>
          <Input
            id="fax"
            value={data.fax}
            onChange={(e) => handleChange("fax", e.target.value)}
            placeholder="(973) 884-1606"
            required
            className="h-9"
          />
        </div>
        
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Address *
          </Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="567 Commerce St, Franklin Lakes, NJ, 07417"
            required
            className="h-9"
          />
        </div>
        
        <div className="space-y-1 md:col-span-3">
          <Label htmlFor="website" className="text-sm font-medium flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Website *
          </Label>
          <Input
            id="website"
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="www.contemporarywalls.com"
            required
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
