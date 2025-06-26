
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import ContactInfoForm from "./ContactInfoForm";
import JobDetailsForm from "./JobDetailsForm";
import WallSpecificationForm from "./WallSpecificationForm";
import SupportStructureForm from "./SupportStructureForm";
import DeliveryLaborForm from "./DeliveryLaborForm";
import PricingForm from "./PricingForm";
import { toast } from "sonner";

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
    date: new Date().toISOString().split('T')[0], // Auto-set to today's date
    proposalNumber: `P${Date.now().toString().slice(-6)}`, // Auto-generate proposal number
    jobLocation: "",
    billedTo: {
      name: "",
      company: "",
      address: ""
    }
  });

  const [walls, setWalls] = useState([]);
  const [supportStructure, setSupportStructure] = useState({});
  
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
    // Validation check before generating
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={onBackToDashboard}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Quote: {quoteName}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome, {user}</span>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="contact" className={isContactInfoValid() ? "bg-green-100" : ""}>
              Contact Info
            </TabsTrigger>
            <TabsTrigger value="job" className={isJobDetailsValid() ? "bg-green-100" : ""}>
              Job Details
            </TabsTrigger>
            <TabsTrigger value="walls">Wall Specs</TabsTrigger>
            <TabsTrigger value="support">Support Structure</TabsTrigger>
            <TabsTrigger value="delivery" className={isDeliveryLaborValid() ? "bg-green-100" : ""}>
              Delivery & Labor
            </TabsTrigger>
            <TabsTrigger value="pricing" className={isPricingValid() ? "bg-green-100" : ""}>
              Pricing
            </TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-lg shadow p-6">
            <TabsContent value="contact">
              <ContactInfoForm data={contactInfo} onUpdate={setContactInfo} />
            </TabsContent>

            <TabsContent value="job">
              <JobDetailsForm data={jobDetails} onUpdate={setJobDetails} />
            </TabsContent>

            <TabsContent value="walls">
              <WallSpecificationForm data={walls} onUpdate={setWalls} />
            </TabsContent>

            <TabsContent value="support">
              <SupportStructureForm data={supportStructure} onUpdate={setSupportStructure} />
            </TabsContent>

            <TabsContent value="delivery">
              <DeliveryLaborForm data={deliveryLabor} onUpdate={setDeliveryLabor} />
            </TabsContent>

            <TabsContent value="pricing">
              <PricingForm 
                data={pricing} 
                onUpdate={setPricing} 
                onGenerate={handleGenerate}
                quoteData={allQuoteData}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default QuoteCreator;
