import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { User, Mail, Phone, Printer, MapPin, Globe, Plus } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { extractPrimaryContactInfo } from "@/types/companySettings";

interface ContactInfoData {
  contactName: string;
  contactEmail: string;
  address: string;
  phone: string;
  fax: string;
  website: string;
  organizationName?: string;
}

interface ContactInfoFormProps {
  data: ContactInfoData;
  onUpdate: (data: ContactInfoData) => void;
}

const ContactInfoForm = ({ data, onUpdate }: ContactInfoFormProps) => {
  const { currentOrganization, members, loading } = useOrganizations();
  const { organization, isLoading: organizationLoading } = useOrganizationSettings();
  const [showCustomNameInput, setShowCustomNameInput] = useState(false);
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const handleChange = (field: keyof ContactInfoData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  // Automatically set organization name when organization loads
  useEffect(() => {
    if (currentOrganization && !data.organizationName) {
      handleChange('organizationName', currentOrganization.name);
    }
  }, [currentOrganization, data.organizationName]);

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

  // Auto-set fields from organization when available (always override for company fields)
  useEffect(() => {
    if (!organizationLoading && organization) {
      let shouldUpdate = false;
      const updatedData = { ...data };

      // Extract primary contact info from JSONB organization_info
      const primaryContactInfo = extractPrimaryContactInfo(organization.organization_info);

      // Always set company fields from organization (locked fields)
      const companyFields = {
        address: primaryContactInfo.address,
        phone: primaryContactInfo.phone,
        fax: primaryContactInfo.fax,
        website: primaryContactInfo.website
      };

      Object.entries(companyFields).forEach(([field, value]) => {
        // Always update these fields from organization settings (remove the check for existing values)
        if (value && data[field as keyof ContactInfoData] !== value) {
          updatedData[field as keyof ContactInfoData] = value;
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        onUpdate(updatedData);
      }
    }
  }, [organizationLoading, organization, data.address, data.phone, data.fax, data.website]);

  return (
    <div className="p-1">
      {/* Three-row layout as requested */}
      <div className="space-y-6">
        {/* Row 1: Contact Name and Contact Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Name */}
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
        </div>
        
        {/* Row 2: Phone and Fax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone */}
          <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone *
          </Label>
          <Input
            id="phone"
            value={data.phone}
            readOnly
            placeholder={organizationLoading ? "Loading..." : "From organization settings"}
            required
            className="h-10 w-full bg-gray-50 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            🔒 Locked from organization settings
          </p>
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
            readOnly
            placeholder={organizationLoading ? "Loading..." : "From organization settings"}
            required
            className="h-10 w-full bg-gray-50 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            🔒 Locked from organization settings
          </p>
          </div>
        </div>
        
        {/* Row 3: Address and Website */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address *
            </Label>
            <Input
              id="address"
              value={data.address}
              readOnly
              placeholder={organizationLoading ? "Loading..." : "From organization settings"}
              required
              className="h-10 w-full bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              🔒 Locked from organization settings
            </p>
          </div>
          
          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website *
            </Label>
            <Input
              id="website"
              value={data.website}
              readOnly
              placeholder={organizationLoading ? "Loading..." : "From organization settings"}
              required
              className="h-10 w-full bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              🔒 Locked from organization settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
