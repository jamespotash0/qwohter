
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import ContactInfoForm from "./ContactInfoForm";
import JobDetailsForm from "./JobDetailsForm";
import WallSpecificationForm from "./WallSpecificationForm";
import SupportStructureForm from "./SupportStructureForm";
import DeliveryLaborForm from "./DeliveryLaborForm";
import PricingForm from "./PricingForm";
import { toast } from "sonner";
import { WallSpecification } from "../types/quote";

interface QuoteCreatorProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
}

const QuoteCreator = ({ user, onLogout, quoteName, onBackToDashboard }: QuoteCreatorProps) => {
  const [activeTab, setActiveTab] = useState("contact");
  
  // Form data states
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
    basePrice: "",
    freight: "",
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

  const isPricingValid = () => {
    return pricing.basePrice && 
           pricing.freight && 
           pricing.paymentUponDrawings && 
           pricing.paymentUponTrackInstallation;
  };

  const handleGenerate = () => {
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

    toast.success("Quote PDF generated successfully!");
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
    { id: "walls", label: "Wall Specs", isValid: true },
    { id: "support", label: "Support Structure", isValid: true },
    { id: "delivery", label: "Delivery & Labor", isValid: isDeliveryLaborValid() },
    { id: "pricing", label: "Pricing", isValid: isPricingValid() }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-lg border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                onClick={onBackToDashboard}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all duration-200 rounded-xl px-4 py-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-8 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {quoteName}
                </h1>
                <p className="text-sm text-slate-500 font-medium">Quote Builder</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">Welcome back</p>
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

      {/* Enhanced Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
          {/* Enhanced Tab Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-xl border border-white/50">
            <TabsList className="grid w-full grid-cols-6 bg-transparent gap-1 p-1">
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
            <div className="p-8 md:p-12">
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
