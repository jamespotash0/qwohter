import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { User, Mail, Phone, Printer, MapPin, Globe, Plus, TrendingUp } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useOrganizationSettings } from "@/hooks/useCompanySettings";
import { extractCompanyInfoForForm } from "@/lib/types/settings/companySettings";

interface ContactInfoData {
  contactName: string;
  contactEmail: string;
  address: string;
  phone: string;
  fax: string;
  website: string;
  organizationName?: string;
  quoteSource: string;
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
  const [showCustomQuoteSourceInput, setShowCustomQuoteSourceInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [customQuoteSource, setCustomQuoteSource] = useState("");


  const handleChange = (field: keyof ContactInfoData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  // Automatically set organization name when organization loads
  useEffect(() => {
    if (currentOrganization && !data.organizationName) {
      console.log('[ContactInfoForm] Setting organizationName:', currentOrganization.name);
      handleChange('organizationName', currentOrganization.name);
    }
  }, [currentOrganization, data.organizationName]);

  // Debug: Log when organization is not available
  useEffect(() => {
    if (!currentOrganization) {
      console.warn('[ContactInfoForm] currentOrganization is not available');
    }
  }, [currentOrganization]);

  // Get active members from the organization
  const activeMembers = members.filter(member => member.status === 'Active');
  
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

  // Handle custom quote source input
  const handleQuoteSourceChange = (value: string) => {
    if (value === "custom") {
      setShowCustomQuoteSourceInput(true);
      setCustomQuoteSource("");
      handleChange("quoteSource", "");
    } else {
      setShowCustomQuoteSourceInput(false);
      handleChange("quoteSource", value);
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

    // Check if current quoteSource is not in the dropdown options and set custom input if needed
    const standardQuoteSources = [
      'Manual Entry', 'Website Lead', 'Contractor Referral', 'Manufacturer Referral',
      'Architect Referral', 'Phone Inquiry', 'Email Inquiry', 'Trade Show',
      'Repeat Customer'
    ];
    
    if (data.quoteSource && !standardQuoteSources.includes(data.quoteSource)) {
      setShowCustomQuoteSourceInput(true);
      setCustomQuoteSource(data.quoteSource);
    }
  }, [loading, activeMembers, data.contactName, data.contactEmail, data.quoteSource, contactNames, contactEmails]);

  // Auto-set fields from organization when available (always override for company fields)
  useEffect(() => {
    if (!organizationLoading && organization) {
      let shouldUpdate = false;
      const updatedData = { ...data };

      // Extract primary contact info from organization
      const primaryContactInfo = extractCompanyInfoForForm(organization);

      // Always set company fields from organization (locked fields)
      const companyFields = {
        address: primaryContactInfo.company_address,
        phone: primaryContactInfo.phone_number,
        fax: primaryContactInfo.fax_number,
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
            Contact Name <span className="text-red-500">*</span>
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
                className={`h-10 ${
                  customName.trim() ? 'border-green-500' : 'border-red-500'
                }`}
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
              <SelectTrigger className={`h-10 ${
                data.contactName ? 'border-green-500' : 'border-red-500'
              }`}>
                <SelectValue 
                  placeholder={loading ? "Loading contacts..." : "Select contact name"} 
                  className="text-gray-600"
                />
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
            Contact Email <span className="text-red-500">*</span>
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
                className={`h-10 ${
                  customEmail.trim() ? 'border-green-500' : 'border-red-500'
                }`}
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
              <SelectTrigger className={`h-10 w-full ${
                data.contactEmail ? 'border-green-500' : 'border-red-500'
              }`}>
                <SelectValue 
                  placeholder={loading ? "Loading emails..." : "Select contact email"} 
                  className="text-gray-600"
                />
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
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id="phone"
            value={data.phone}
            readOnly
            placeholder={organizationLoading ? "Loading..." : "From organization settings"}
            required
            className={`h-10 w-full bg-gray-50 cursor-not-allowed ${
              data.phone ? 'border-green-500' : 'border-red-500'
            }`}
          />
          <p className="text-xs text-muted-foreground">
            🔒 Locked from organization settings
          </p>
        </div>
        
          {/* Fax */}
          <div className="space-y-2">
          <Label htmlFor="fax" className="text-sm font-medium flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Fax {data.fax && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="fax"
            value={data.fax}
            readOnly
            placeholder={organizationLoading ? "Loading..." : (data.fax ? "From organization settings" : "Not set in organization")}
            required={!!data.fax}
            className={`h-10 w-full bg-gray-50 cursor-not-allowed ${
              data.fax ? 'border-green-500' : 'border-gray-300 placeholder:text-gray-600' 
            }`}
          />
          <p className="text-xs text-muted-foreground">
            {data.fax ? '🔒 Locked from organization settings' : 'ℹ️ Optional - not configured in organization'}
          </p>
          </div>
        </div>
        
        {/* Row 3: Address and Website */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address"
              value={data.address}
              readOnly
              placeholder={organizationLoading ? "Loading..." : "From organization settings"}
              required
              className={`h-10 w-full bg-gray-50 cursor-not-allowed ${
                data.address ? 'border-green-500' : 'border-red-500'
              }`}
            />
            <p className="text-xs text-muted-foreground">
              🔒 Locked from organization settings
            </p>
          </div>
          
          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Website <span className="text-red-500">*</span>
            </Label>
            <Input
              id="website"
              value={data.website}
              readOnly
              placeholder={organizationLoading ? "Loading..." : "From organization settings"}
              required
              className={`h-10 w-full bg-gray-50 cursor-not-allowed ${
                data.website ? 'border-green-500' : 'border-red-500'
              }`}
            />
            <p className="text-xs text-muted-foreground">
              🔒 Locked from organization settings
            </p>
          </div>
        </div>
        
        {/* Row 4: Quote Source */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label htmlFor="quoteSource" className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Quote Source <span className="text-red-500">*</span>
            </Label>
            {showCustomQuoteSourceInput ? (
              <div className="space-y-2">
                <Input
                  value={customQuoteSource}
                  onChange={(e) => {
                    setCustomQuoteSource(e.target.value);
                    handleChange("quoteSource", e.target.value);
                  }}
                  placeholder="Enter custom quote source"
                  className={`h-10 ${
                    customQuoteSource.trim() ? 'border-green-500' : 'border-red-500'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomQuoteSourceInput(false);
                    setCustomQuoteSource("");
                    handleChange("quoteSource", "");
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  ← Back to dropdown
                </button>
              </div>
            ) : (
              <Select
                value={data.quoteSource}
                onValueChange={handleQuoteSourceChange}
                required
              >
                <SelectTrigger className={`h-10 w-full ${
                  data.quoteSource ? 'border-green-500' : 'border-red-500'
                }`}>
                  <SelectValue 
                    placeholder="Select quote source" 
                    className="text-gray-600"   
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                  <SelectItem value="Website Lead">Website Lead</SelectItem>
                  <SelectItem value="Contractor Referral">Contractor Referral</SelectItem>
                  <SelectItem value="Manufacturer Referral">Manufacturer Referral</SelectItem>
                  <SelectItem value="Architect Referral">Architect Referral</SelectItem>
                  <SelectItem value="Phone Inquiry">Phone Inquiry</SelectItem>
                  <SelectItem value="Email Inquiry">Email Inquiry</SelectItem>
                  <SelectItem value="Trade Show">Trade Show</SelectItem>
                  <SelectItem value="Repeat Customer">Repeat Customer</SelectItem>
                  <SelectItem value="Custom">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add custom source...
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              How did this quote opportunity come to you?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
