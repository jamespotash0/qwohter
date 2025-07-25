
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
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex h-12 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToDashboard}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            {/* Compact Quote Name */}
            <div className="flex items-center gap-2">
              {editingQuoteName ? (
                <QuoteNameInput
                  value={localQuoteName}
                  maxChars={50}
                  onChange={(e) => setLocalQuoteName(e.target.value)}
                  onSave={() => {
                    setEditingQuoteName(false);
                    if (onQuoteNameChange && localQuoteName.trim()) {
                      onQuoteNameChange(localQuoteName.trim());
                      setContactInfo(prev => ({...prev, project_name: localQuoteName.trim()}));
                    }
                  }}
                />
              ) : (
                <h1
                  className="text-lg font-semibold cursor-pointer hover:text-muted-foreground transition-colors"
                  onClick={() => setEditingQuoteName(true)}
                >
                  {localQuoteName}
                </h1>
              )}
            </div>

            {/* Compact Status */}
            <Select value={quoteStatus} onValueChange={setQuoteStatus}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-xs text-muted-foreground">{user}</div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          {/* Compact Sticky Tab Navigation */}
          <div className="sticky top-12 z-40 bg-background/95 backdrop-blur border-b">
            <TabsList className="w-full h-10 grid grid-cols-6 p-0 bg-transparent">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className="h-10 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
                >
                  <span>{tab.label}</span>
                  {tab.isValid && (
                    <CheckCircle2 className="w-3 h-3 ml-1 text-green-500 data-[state=active]:text-green-200" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Optimized Content Container */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <TabsContent value="contact" className="mt-0 h-full">
                <ContactInfoForm data={contactInfo} onUpdate={setContactInfo} />
              </TabsContent>

              <TabsContent value="job" className="mt-0 h-full">
                <JobDetailsForm data={jobDetails} onUpdate={setJobDetails} />
              </TabsContent>

              <TabsContent value="walls" className="mt-0 h-full">
                <WallSpecificationForm walls={walls} onUpdate={setWalls} />
              </TabsContent>

              <TabsContent value="support" className="mt-0 h-full">
                <SupportStructureForm data={supportStructure} onUpdate={setSupportStructure} />
              </TabsContent>

              <TabsContent value="delivery" className="mt-0 h-full">
                <DeliveryLaborForm data={deliveryLabor} onUpdate={setDeliveryLabor} />
              </TabsContent>

              <TabsContent value="pricing" className="mt-0 h-full">
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
