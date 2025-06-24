
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    "John Smith",
    "Sarah Johnson",
    "Michael Brown",
    "Custom"
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Contact Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Select
            value={data.contactName}
            onValueChange={(value) => handleChange("contactName", value)}
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
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={data.contactEmail}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
            placeholder="contact@contemporarywalls.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(xxx) xxx-xxxx"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fax">Fax</Label>
          <Input
            id="fax"
            value={data.fax}
            onChange={(e) => handleChange("fax", e.target.value)}
            placeholder="(xxx) xxx-xxxx"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Enter full address"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="company.com"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
