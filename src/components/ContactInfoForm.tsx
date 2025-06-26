
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

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
    <div>
      <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name *</Label>
          <Select
            value={data.contactName}
            onValueChange={(value) => handleChange("contactName", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select contact name" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {contactNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Select
            value={data.contactEmail}
            onValueChange={(value) => handleChange("contactEmail", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select contact email" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {contactEmails.map((email) => (
                <SelectItem key={email} value={email}>
                  {email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(973) 884-0474"
            required
            readOnly
            className="bg-gray-50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fax">Fax *</Label>
          <Input
            id="fax"
            value={data.fax}
            onChange={(e) => handleChange("fax", e.target.value)}
            placeholder="(973) 884-1606"
            required
            readOnly
            className="bg-gray-50"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="567 Commerce St, Franklin Lakes, NJ, 07417"
            required
            readOnly
            className="bg-gray-50"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Website *</Label>
          <Input
            id="website"
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="www.contemporarywalls.com"
            required
            readOnly
            className="bg-gray-50"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
