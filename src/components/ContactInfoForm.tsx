import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";
import { User, Mail, MapPin, Phone, Printer, Globe } from "lucide-react";

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
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Contact Information
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Select your contact details to personalize this quote
        </p>
      </div>

      {/* Enhanced Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <Label htmlFor="contactName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4" />
            Contact Name *
          </Label>
          <Select
            value={data.contactName}
            onValueChange={(value) => handleChange("contactName", value)}
            required
          >
            <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200">
              <SelectValue placeholder="Select contact name" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
              {contactNames.map((name) => (
                <SelectItem key={name} value={name} className="rounded-lg">
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="contactEmail" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contact Email *
          </Label>
          <Select
            value={data.contactEmail}
            onValueChange={(value) => handleChange("contactEmail", value)}
            required
          >
            <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-all duration-200">
              <SelectValue placeholder="Select contact email" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
              {contactEmails.map((email) => (
                <SelectItem key={email} value={email} className="rounded-lg">
                  {email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone *
          </Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="(973) 884-0474"
            required
            readOnly
            className="h-12 rounded-xl bg-slate-50/80 border-slate-200 text-slate-600"
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="fax" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Fax *
          </Label>
          <Input
            id="fax"
            value={data.fax}
            onChange={(e) => handleChange("fax", e.target.value)}
            placeholder="(973) 884-1606"
            required
            readOnly
            className="h-12 rounded-xl bg-slate-50/80 border-slate-200 text-slate-600"
          />
        </div>
        
        <div className="space-y-3 md:col-span-2">
          <Label htmlFor="address" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address *
          </Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="567 Commerce St, Franklin Lakes, NJ, 07417"
            required
            readOnly
            className="h-12 rounded-xl bg-slate-50/80 border-slate-200 text-slate-600"
          />
        </div>
        
        <div className="space-y-3 md:col-span-2">
          <Label htmlFor="website" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website *
          </Label>
          <Input
            id="website"
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="www.contemporarywalls.com"
            required
            readOnly
            className="h-12 rounded-xl bg-slate-50/80 border-slate-200 text-slate-600"
          />
        </div>
      </div>
    </div>
  );
};

export default ContactInfoForm;
