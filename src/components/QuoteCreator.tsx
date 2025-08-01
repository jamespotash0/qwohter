
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Contact, FileText, Square, Building, Truck, DollarSign, DoorOpen } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar";
import ContactInfoForm from "./ContactInfoForm";
import JobDetailsForm from "./JobDetailsForm";
import WallSpecificationForm from "./WallSpecificationForm";
import PocketDoorsForm from "./PocketDoorsForm";
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
  const [activeSection, setActiveSection] = useState("contact");
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
  const [quoteStatus, setQuoteStatus] = useState(existingQuote?.status || "draft");
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
  const [pocketDoors, setPocketDoors] = useState({
    foldType: existingQuote?.pocket_doors?.foldType || "",
    foldStyle: existingQuote?.pocket_doors?.foldStyle || ""
  });
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
    const wallEntries = Object.entries(walls.walls);
    
    // Require at least 1 wall
    if (wallEntries.length === 0) return false;
    
    // Check each wall for required fields
    for (const [wallName, wall] of wallEntries) {
      // Always required fields
      if (!wall.lengthFeet || !wall.heightFeet || !wall.panelCount || !wall.wallSystemType) {
        return false;
      }
      
      // If "Operable Wall" is selected, require additional fields
      if (wall.wallSystemType === "Operable Wall") {
        if (!wall.panelConfiguration || !wall.series || !wall.model || 
            !wall.panelSkin || !wall.stcRating || !wall.panelDesign || 
            !wall.trackType || !wall.trackSystem) {
          return false;
        }
      }
      
      // If panel finish category is selected, require panel finish specific item
      if (wall.panelFinishCategory && !wall.panelFinishSpecificItem) {
        return false;
      }
    }
    
    return true;
  };

  // const isPocketDoorsValid = () => {
  //   if (!pocketDoors.foldType) {
  //     return true; // Fold type is optional
  //   }
  //   // If fold type is selected, require fold style
  //   if (pocketDoors.foldType && !pocketDoors.foldStyle) {
  //     return false;
  //   }
  //   return true; // Fold type itself is not required
  // };
  const isPocketDoorsValid = () => {
    const { foldType, foldStyle } = pocketDoors;

    if (!foldType || foldType === 'None') {
      return true; // Both optional if foldType is unselected
    }

    // If foldType is selected, require foldStyle
    return !!foldStyle;
  };

  const isSupportStructureValid = () => {
    // Mounting track is now required
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
      setActiveSection("contact");
      return;
    }
    if (!isJobDetailsValid()) {
      toast.error("Please complete all Job Details fields");
      setActiveSection("job");
      return;
    }
    if (!isWallSpecValid()) {
      toast.error("Please complete Wall Specifications - at least 1 wall with required fields");
      setActiveSection("walls");
      return;
    }
    if (!isPocketDoorsValid()) {
      toast.error("Please complete Pocket Doors - fold style required when fold type is selected");
      setActiveSection("pockets");
      return;
    }
    if (!isSupportStructureValid()) {
      toast.error("Please select a mounting track for Support Structure");
      setActiveSection("support");
      return;
    }
    if (!isPricingValid()) {
      toast.error("Please complete all Pricing fields");
      setActiveSection("pricing");
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
          pocket_doors: pocketDoors,
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
          quoteName: localQuoteName,
          contactInfo,
          jobDetails,
          walls,
          pocketDoors,
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
    pocketDoors,
    supportStructure,
    deliveryLabor,
    pricing,
  };

  const sections = [
    { id: "contact", label: "Contact Info", icon: Contact, isValid: isContactInfoValid() },
    { id: "job", label: "Job Details", icon: FileText, isValid: isJobDetailsValid() },
    { id: "walls", label: "Wall Specs", icon: Square, isValid: isWallSpecValid() },
    { id: "pockets", label: "Pocket Doors", icon: DoorOpen, isValid: isPocketDoorsValid() },
    { id: "support", label: "Support Structure", icon: Building, isValid: isSupportStructureValid() },
    { id: "delivery", label: "Delivery & Labor", icon: Truck, isValid: isDeliveryLaborValid() },
    { id: "pricing", label: "Pricing", icon: DollarSign, isValid: isPricingValid() }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background">
        {/* Header - Full Length */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          
          <div className="flex h-12 items-center justify-between px-4 relative">
            {/* Left (Back Button) */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToDashboard}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>

            {/* Center (Quote Name) */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              {editingQuoteName ? (
                <QuoteNameInput
                  value={localQuoteName}
                  maxChars={50}
                  onChange={(e) => setLocalQuoteName(e.target.value)}
                  onSave={() => {
                    setEditingQuoteName(false);
                    if (onQuoteNameChange && localQuoteName.trim()) {
                      onQuoteNameChange(localQuoteName.trim());
                      setContactInfo(prev => ({ ...prev, project_name: localQuoteName.trim() }));
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

            {/* Right (Status + Save) */}
            <div className="flex items-center gap-4">
              <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleGenerate}
                variant="default"
                size="sm"
                disabled={!isContactInfoValid() || !isJobDetailsValid() || !isWallSpecValid() || !isPocketDoorsValid() || !isSupportStructureValid() || !isPricingValid()}
              >
                Save Quote
              </Button>
            </div>
          </div>
        </div>


        <div className="flex w-full">
          {/* Quote Navigation Sidebar */}
          <Sidebar className="w-64 border-r mt-12">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(section.id)}
                        isActive={activeSection === section.id}
                        className="w-full justify-start gap-3 py-3"
                      >
                        <section.icon className="w-4 h-4" />
                        <span className="flex-1">{section.label}</span>
                        {section.isValid && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

          {/* Main Content Area */}
          <SidebarInset className="flex-1 flex flex-col">
            {/* Content Container with 20% margins and more top spacing */}
            <div className="flex-1 flex justify-center px-[10%] pt-8">
              <div className="w-full max-w-6xl">
                {activeSection === "contact" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <ContactInfoForm data={contactInfo} onUpdate={setContactInfo} />
                  </div>
                )}
                {activeSection === "job" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <JobDetailsForm data={jobDetails} onUpdate={setJobDetails} />
                  </div>
                )}
                {activeSection === "walls" && (
                  <div className="bg-muted/30 rounded-lg p-6 border h-[calc(100vh-8rem)] overflow-y-auto">
                    <WallSpecificationForm walls={walls} onUpdate={setWalls} />
                  </div>
                )}
                {activeSection === "pockets" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <PocketDoorsForm data={pocketDoors} onUpdate={setPocketDoors} />
                  </div>
                )}
                {activeSection === "support" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <SupportStructureForm data={supportStructure} onUpdate={setSupportStructure} />
                  </div>
                )}
                {activeSection === "delivery" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <DeliveryLaborForm data={deliveryLabor} onUpdate={setDeliveryLabor} />
                  </div>
                )}
                {activeSection === "pricing" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <PricingForm 
                      data={pricing} 
                      onUpdate={setPricing} 
                      onGenerate={handleGenerate}
                      quoteData={allQuoteData}
                    />
                  </div>
                )}
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default QuoteCreator;
