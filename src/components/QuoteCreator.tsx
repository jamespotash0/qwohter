
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
import { WallSpecification } from "../types/quote";
import { useQuotes } from "@/hooks/useQuotes";

interface QuoteCreatorProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
}

const QuoteCreator = ({ user, onLogout, quoteName, onBackToDashboard, onQuoteNameChange }: QuoteCreatorProps) => {
  const { createQuote, updateQuote } = useQuotes();
  const [activeTab, setActiveTab] = useState("contact");
  const [editingQuoteName, setEditingQuoteName] = useState(false);
  const [localQuoteName, setLocalQuoteName] = useState(quoteName);
  
  // Form data states
  const [quoteStatus, setQuoteStatus] = useState("draft");
  const [contactInfo, setContactInfo] = useState({
    contactName: "",
    contactEmail: "",
    address: "",
    phone: "",
    fax: "",
    website: ""
  });

  const [jobDetails, setJobDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    proposalNumber: `P${Date.now().toString().slice(-6)}`,
    jobLocation: "",
    billedTo: {
      name: "",
      company: "",
      address: ""
    }
  });

  const [walls, setWalls] = useState<WallSpecification[]>([]);
  const [supportStructure, setSupportStructure] = useState({
    mountingTrack: ""
  });
  
  const [deliveryLabor, setDeliveryLabor] = useState({
    delivery: {
      trackDeliveryWeeks: "",
      panelDeliveryWeeks: "",
      trackInstallationDays: "",
      panelInstallationDays: ""
    },
    labor: {
      laborType: "",
      wageRate: ""
    }
  });

  const [pricing, setPricing] = useState({
    basePrice: 0,
    freight: 0,
    total: "",
    paymentUponDrawings: "",
    paymentUponTrackInstallation: ""
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
    return walls.length > 0;
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
    if (!isDeliveryLaborValid()) {
      toast.error("Please complete all Delivery & Labor fields");
      setActiveTab("delivery");
      return;
    }
    if (!isPricingValid()) {
      toast.error("Please complete all Pricing fields");
      setActiveTab("pricing");
      return;
    }

    try {
      await createQuote({
        contactInfo,
        jobDetails,
        walls,
        supportStructure,
        deliveryLabor,
        pricing,
        status: quoteStatus
      });
      toast.success("Quote saved and PDF generated successfully!");
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
                    <SelectItem value="draft">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span>Draft</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="submitted">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>Submitted</span>
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
