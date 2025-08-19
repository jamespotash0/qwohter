import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { User, Mail, Phone, Printer, MapPin, Globe, Plus } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";

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
  const { members, loading } = useOrganizations();
  const [showCustomNameInput, setShowCustomNameInput] = useState(false);
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const handleChange = (field: keyof ContactInfoData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  // Get active members from the organization
  const activeMembers = members.filter(member => member.status === 'active');
  
  // Create contact options from organization members
  const contactNames = activeMembers
    .filter(member => member.full_name)
    .map(member => member.full_name!)
    .sort();

  const contactEmails = activeMembers
    .map(member => member.email)
    .sort();

  // Handle custom name input
  const handleNameChange = (value: string) => {
    if (value === "custom") {
      setShowCustomNameInput(true);
      setCustomName("");
      handleChange("contactName", "");
    } else {
      setShowCustomNameInput(false);
      handleChange("contactName", value);
    }
  };

  // Handle custom email input
  const handleEmailChange = (value: string) => {
    if (value === "custom") {
      setShowCustomEmailInput(true);
      setCustomEmail("");
      handleChange("contactEmail", "");
    } else {
      setShowCustomEmailInput(false);
      handleChange("contactEmail", value);
    }
  };

  // Handle when existing values don't match dropdown options (e.g., custom values from saved data)
  useEffect(() => {
    if (!loading && activeMembers.length > 0) {
      // Check if current contactName is not in the dropdown options and set custom input if needed
      if (data.contactName && !contactNames.includes(data.contactName)) {
        setShowCustomNameInput(true);
        setCustomName(data.contactName);
      }
      
      // Check if current contactEmail is not in the dropdown options and set custom input if needed
      if (data.contactEmail && !contactEmails.includes(data.contactEmail)) {
        setShowCustomEmailInput(true);
        setCustomEmail(data.contactEmail);
      }
    }
  }, [loading, activeMembers, data.contactName, data.contactEmail, contactNames, contactEmails]);

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
    <div className="p-1">
      {/* Improved Form Grid - Better spacing and responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Contact Name - Full width on smaller screens */}
        <div className="space-y-2">
          <Label htmlFor="contactName" className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            Contact Name *
          </Label>
          {showCustomNameInput ? (
            <div className="space-y-2">
              <Input
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  handleChange("contactName", e.target.value);
                }}
                placeholder="Enter custom contact name"
                className="h-10"
                required
              />
              <button
                type="button"
                onClick={() => {
                  setShowCustomNameInput(false);
                  setCustomName("");
                  handleChange("contactName", "");
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ← Back to dropdown
              </button>
            </div>
          ) : (
            <Select
              value={data.contactName}
              onValueChange={handleNameChange}
              required
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder={loading ? "Loading contacts..." : "Select contact name"} />
              </SelectTrigger>
              <SelectContent>
                {contactNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add custom name...
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Contact Email */}
        <div className="space-y-2">
          <Label htmlFor="contactEmail" className="text-sm font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contact Email *
          </Label>
          {showCustomEmailInput ? (
            <div className="space-y-2">
              <Input
                value={customEmail}
                onChange={(e) => {
                  setCustomEmail(e.target.value);
                  handleChange("contactEmail", e.target.value);
                }}
                placeholder="Enter custom email address"
                type="email"
                className="h-10"
                required
              />
              <button
                type="button"
                onClick={() => {
                  setShowCustomEmailInput(false);
                  setCustomEmail("");
                  handleChange("contactEmail", "");
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ← Back to dropdown
              </button>
            </div>
          ) : (
            <Select
              value={data.contactEmail}
              onValueChange={handleEmailChange}
              required
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder={loading ? "Loading emails..." : "Select contact email"} />
              </SelectTrigger>
              <SelectContent>
                {contactEmails.map((email) => (
                  <SelectItem key={email} value={email}>
                    {email}
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add custom email...
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone *
          </Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(973) 884-0474"
            required
            className="h-10 w-full"
          />
        </div>
        
        {/* Fax */}
        <div className="space-y-2">
          <Label htmlFor="fax" className="text-sm font-medium flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Fax *
          </Label>
          <Input
            id="fax"
            value={data.fax}
            onChange={(e) => handleChange("fax", e.target.value)}
            placeholder="(973) 884-1606"
            required
            className="h-10 w-full"
          />
        </div>
        
        {/* Address - Spans 2 columns on larger screens */}
        <div className="space-y-2 md:col-span-2 lg:col-span-2">
          <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address *
          </Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="567 Commerce St, Franklin Lakes, NJ, 07417"
            required
            className="h-10 w-full"
          />
        </div>
        
        {/* Website - Full width */}
        <div className="space-y-2 md:col-span-2 lg:col-span-3">
          <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website *
          </Label>
          <Input
            id="website"
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="www.contemporarywalls.com"
            required
            className="h-10 w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
