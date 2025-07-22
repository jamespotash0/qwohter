
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import ContactInfoForm from "./ContactInfoForm";
import JobDetailsForm from "./JobDetailsForm";
import WallSpecificationForm from "./WallSpecificationForm";
import SupportStructureForm from "./SupportStructureForm";
import DeliveryLaborForm from "./DeliveryLaborForm";
import PricingForm from "./PricingForm";
import { toast } from "sonner";
import { QuoteNameInput } from "./QuoteNameInput";
import { WallDetails, WallSpecification } from "../types/quote";
import { useQuotes } from "@/hooks/useQuotes";

interface QuoteCreatorProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
  existingQuote?: any;
}

const QuoteCreator = ({ user, onLogout, quoteName, onBackToDashboard, onQuoteNameChange, existingQuote }: QuoteCreatorProps) => {
  const { createQuote, updateQuote } = useQuotes();
  const [activeTab, setActiveTab] = useState("contact");
  const [editingQuoteName, setEditingQuoteName] = useState(false);
  const [localQuoteName, setLocalQuoteName] = useState(quoteName);

  // Helper function to migrate wall_details to the new format with id and walls
  const migrateWallDetails = (wallDetails: any): WallDetails => {
    // If it's already in the new format with id and walls, return as is
    if (wallDetails && wallDetails.id && wallDetails.walls) {
      return wallDetails;
    }
    
    // If it's in the object format but without id (previous migration), wrap it
    if (wallDetails && typeof wallDetails === 'object' && !Array.isArray(wallDetails) && !wallDetails.id) {
      return {
        id: crypto.randomUUID(),
        walls: wallDetails
      };
    }
    
    // If it's an array (old format), convert to new format
    if (Array.isArray(wallDetails)) {
      const wallsObject: { [key: string]: WallSpecification } = {};
      wallDetails.forEach((wall: any, index: number) => {
        const wallName = wall.name || `Wall ${index + 1}`;
        const { id, name, ...wallSpec } = wall;
        wallsObject[wallName] = wallSpec;
      });
      return {
        id: crypto.randomUUID(),
        walls: wallsObject
      };
    }
    
    // If empty or null, return default structure
    return {
      id: crypto.randomUUID(),
      walls: {}
    };
  };
  
  // Form data states - populate with existing quote data if available
  const [quoteStatus, setQuoteStatus] = useState(existingQuote?.status || "Draft");
  const [contactInfo, setContactInfo] = useState({
    contactName: existingQuote?.quote_details?.contactName || "",
    contactEmail: existingQuote?.quote_details?.contactEmail || "",
    address: existingQuote?.quote_details?.address || "",
    phone: existingQuote?.quote_details?.phone || "",
    fax: existingQuote?.quote_details?.fax || "",
    website: existingQuote?.quote_details?.website || ""
  });

  const [jobDetails, setJobDetails] = useState({
    date: existingQuote?.job_details?.date || new Date().toISOString().split('T')[0],
    proposalNumber: existingQuote?.proposal_number || `P${Date.now().toString().slice(-6)}`,
    jobLocation: existingQuote?.job_details?.job_location || "",
    billedTo: {
      name: existingQuote?.job_details?.client_name || "",
      company: existingQuote?.job_details?.client_company || "",
      address: existingQuote?.job_details?.client_address || ""
    }
  });

  const [walls, setWalls] = useState<WallDetails>(migrateWallDetails(existingQuote?.wall_details));
  const [supportStructure, setSupportStructure] = useState({
    mountingTrack: existingQuote?.support_structure?.mountingTrack || ""
  });
  
  const [deliveryLabor, setDeliveryLabor] = useState({
    delivery: {
      trackDeliveryWeeks: existingQuote?.delivery_details?.trackDeliveryWeeks || "",
      panelDeliveryWeeks: existingQuote?.delivery_details?.panelDeliveryWeeks || "",
      trackInstallationDays: existingQuote?.delivery_details?.trackInstallationDays || "",
      panelInstallationDays: existingQuote?.delivery_details?.panelInstallationDays || ""
    },
    labor: {
      laborType: existingQuote?.labor_details?.laborType || "",
      wageRate: existingQuote?.labor_details?.wageRate || ""
    }
  });

  const [pricing, setPricing] = useState({
    basePrice: existingQuote?.price_details?.base_price || 0,
    freight: existingQuote?.price_details?.freight || 0,
    total: existingQuote?.price_details?.total || "",
    paymentUponDrawings: existingQuote?.price_details?.payment_upon_drawings || "",
    paymentUponTrackInstallation: existingQuote?.price_details?.payment_upon_track_installation || ""
  });

  // Validation functions
  const isContactInfoValid = () => {
    return contactInfo.contactName && 
           contactInfo.contactEmail && 
           contactInfo.address && 
           contactInfo.phone && 
           contactInfo.fax && 
           contactInfo.website;
  };

  const isJobDetailsValid = () => {
    return jobDetails.date && 
           jobDetails.proposalNumber && 
           jobDetails.jobLocation && 
           jobDetails.billedTo.name && 
           jobDetails.billedTo.company && 
           jobDetails.billedTo.address;
  };

  const isDeliveryLaborValid = () => {
    return deliveryLabor.delivery.trackDeliveryWeeks && 
           deliveryLabor.delivery.panelDeliveryWeeks && 
           deliveryLabor.delivery.trackInstallationDays && 
           deliveryLabor.delivery.panelInstallationDays && 
           deliveryLabor.labor.laborType && 
           deliveryLabor.labor.wageRate;
  };

  const isWallSpecValid = () => {
    return Object.keys(walls.walls).length > 0;
  };

  const isSupportStructureValid = () => {
    return supportStructure.mountingTrack !== "";
  };

  const isPricingValid = () => {
    return pricing.basePrice > 0 && 
           pricing.freight > 0 && 
           pricing.paymentUponDrawings && 
           pricing.paymentUponTrackInstallation;
  };

  const handleGenerate = async () => {
    if (!isContactInfoValid()) {
      toast.error("Please complete all Contact Information fields");
      setActiveTab("contact");
      return;
    }
    if (!isJobDetailsValid()) {
      toast.error("Please complete all Job Details fields");
      setActiveTab("job");
      return;
    }
    if (!isPricingValid()) {
      toast.error("Please complete all Pricing fields");
      setActiveTab("pricing");
      return;
    }

    try {
      if (existingQuote) {
        // Update existing quote
        await updateQuote(existingQuote.id, {
          project_name: localQuoteName,
          quote_details: contactInfo,
          job_details: {
            job_location: jobDetails.jobLocation,
            client_name: jobDetails.billedTo.name,
            client_company: jobDetails.billedTo.company,
            client_address: jobDetails.billedTo.address,
            date: jobDetails.date
          },
          wall_details: walls,
          price_details: {
            base_price: pricing.basePrice,
            freight: pricing.freight,
            total: pricing.total,
            payment_upon_drawings: pricing.paymentUponDrawings,
            payment_upon_track_installation: pricing.paymentUponTrackInstallation
          },
          support_structure: supportStructure,
          delivery_details: deliveryLabor.delivery,
          labor_details: deliveryLabor.labor,
          proposal_number: jobDetails.proposalNumber,
          status: quoteStatus
        });
        toast.success("Quote updated successfully!");
        onBackToDashboard(); // Navigate back to quotes dashboard
      } else {
        // Create new quote
        await createQuote({
          contactInfo,
          jobDetails,
          walls,
          supportStructure,
          deliveryLabor,
          pricing,
          status: quoteStatus
        });
        toast.success("Quote saved successfully!");
        onBackToDashboard(); // Navigate back to quotes dashboard
      }
    } catch (error) {
      toast.error("Failed to save quote");
    }
  };

  const allQuoteData = {
    contactInfo,
    jobDetails,
    walls,
    supportStructure,
    deliveryLabor,
    pricing
  };

  const tabs = [
    { id: "contact", label: "Contact Info", isValid: isContactInfoValid() },
    { id: "job", label: "Job Details", isValid: isJobDetailsValid() },
    { id: "walls", label: "Wall Specs", isValid: isWallSpecValid() },
    { id: "support", label: "Support Structure", isValid: isSupportStructureValid() },
    { id: "delivery", label: "Delivery & Labor", isValid: isDeliveryLaborValid() },
    { id: "pricing", label: "Pricing", isValid: isPricingValid() }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-slate-200/60 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={onBackToDashboard}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all duration-200 rounded-xl px-4 py-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">Welcome Back</p>
                <p className="text-xs text-slate-500">{user}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 rounded-xl"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Name Section */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/40">
        <div className="w-full max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {editingQuoteName ? (
                <QuoteNameInput
                  value={localQuoteName}
                  maxChars={50}
                  onChange={(e) => setLocalQuoteName(e.target.value)}
                  onSave={() => {
                    setEditingQuoteName(false);
                    if (onQuoteNameChange && localQuoteName.trim()) {
                      onQuoteNameChange(localQuoteName.trim());
                      // Update the contact info with the new project name
                      setContactInfo(prev => ({...prev, project_name: localQuoteName.trim()}));
                    }
                  }}
                />
              ) : (
                <>
                  <h1
                    className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => setEditingQuoteName(true)}
                  >
                    {localQuoteName}
                  </h1>
                  <span
                    className="text-sm text-slate-500 font-medium whitespace-nowrap cursor-pointer"
                    onClick={() => setEditingQuoteName(true)}
                  >
                    (Click to edit)
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Quote Status</label>
                <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                  <SelectTrigger className="w-36 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Draft">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                        <span>Draft</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Completed">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pending">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span>Pending</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          {/* Enhanced Tab Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-1 shadow-xl border border-white/50">
            <TabsList className="grid w-full grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-1 p-0">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className={`
                    relative rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300
                    data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600
                    data-[state=active]:text-white data-[state=active]:shadow-lg
                    data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-slate-900
                    data-[state=inactive]:hover:bg-slate-100/60
                    ${tab.isValid ? 'ring-2 ring-green-200 ring-offset-2 ring-offset-transparent' : ''}
                  `}
                >
                  <div className="flex items-center space-x-2">
                    <span>{tab.label}</span>
                    {tab.isValid && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 data-[state=active]:text-green-200" />
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Enhanced Content Container */}
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/60 overflow-hidden">
            <div className="p-6 md:p-10 overflow-y-auto max-h-[calc(100vh-240px)]">
              <TabsContent value="contact" className="mt-0">
                <ContactInfoForm data={contactInfo} onUpdate={setContactInfo} />
              </TabsContent>

              <TabsContent value="job" className="mt-0">
                <JobDetailsForm data={jobDetails} onUpdate={setJobDetails} />
              </TabsContent>

              <TabsContent value="walls" className="mt-0">
                <WallSpecificationForm walls={walls} onUpdate={setWalls} />
              </TabsContent>

              <TabsContent value="support" className="mt-0">
                <SupportStructureForm data={supportStructure} onUpdate={setSupportStructure} />
              </TabsContent>

              <TabsContent value="delivery" className="mt-0">
                <DeliveryLaborForm data={deliveryLabor} onUpdate={setDeliveryLabor} />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0">
                <PricingForm 
                  data={pricing} 
                  onUpdate={setPricing} 
                  onGenerate={handleGenerate}
                  quoteData={allQuoteData}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default QuoteCreator;
