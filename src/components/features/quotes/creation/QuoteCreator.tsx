
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
} from "@/components/ui/sidebar";
import ContactInfoForm from "@/components/features/quotes/forms/contact/ContactInfoForm";
import JobDetailsForm from "@/components/features/quotes/forms/contact/JobDetailsForm";
import WallSpecificationForm from "@/components/features/quotes/forms/walls/WallSpecificationForm";
import PerWallPocketDoorsForm from "@/components/features/quotes/forms/walls/PerWallPocketDoorsForm";
import PerWallStructureForm from "@/components/features/quotes/forms/walls/PerWallStructureForm";
import DeliveryLaborForm from "@/components/features/quotes/forms/delivery/DeliveryLaborForm";
import PricingForm from "@/components/features/quotes/forms/pricing/PricingForm";
import { toast } from "sonner";
import { QuoteNameInput } from "@/components/common/inputs/";
import { WallDetails, WallSpecification } from "@/types/quote";
import { useQuotes } from "@/hooks/useQuotes";

interface QuoteCreatorProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
  existingQuote?: Record<string, unknown>;
}

const QuoteCreator = ({ user, onLogout, quoteName, onBackToDashboard, onQuoteNameChange, existingQuote }: QuoteCreatorProps) => {
  const { createQuote, updateQuote } = useQuotes();
  const [activeSection, setActiveSection] = useState("contact");
  const [editingQuoteName, setEditingQuoteName] = useState(false);
  const [localQuoteName, setLocalQuoteName] = useState(quoteName);

  // Helper function to migrate wall_details to the new format with id and walls
  const migrateWallDetails = (wallDetails: unknown): WallDetails => {
    // Check if already in correct format
    if (wallDetails && typeof wallDetails === 'object' && wallDetails !== null) {
      const wd = wallDetails as Record<string, unknown>;
      if (wd.id && wd.walls) {
        return wallDetails as WallDetails;
      }
      
      // If it's an object but without id (previous migration), wrap it
      if (!Array.isArray(wallDetails) && !wd.id) {
        return {
          id: crypto.randomUUID(),
          walls: wallDetails as { [key: string]: WallSpecification }
        };
      }
    }
    
    // If it's an array (old format), convert to new format
    if (Array.isArray(wallDetails)) {
      const wallsObject: { [key: string]: WallSpecification } = {};
      wallDetails.forEach((wall: unknown, index: number) => {
        const wallData = wall as Record<string, unknown>;
        const wallName = (wallData.name as string) || `Wall ${index + 1}`;
        const { id, name, ...wallSpec } = wallData;
        wallsObject[wallName] = wallSpec as unknown as WallSpecification;
      });
      return {
        id: crypto.randomUUID(),
        walls: wallsObject
      };
    }
    
    // Default empty structure
    return {
      id: crypto.randomUUID(),
      walls: {}
    };
  };
  
  // Helper function to safely get nested properties
  const getNestedProperty = (obj: unknown, path: string): unknown => {
    if (!obj || typeof obj !== 'object') return undefined;
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  };

  // Form data states - populate with existing quote data if available
  const existingQuoteData = existingQuote as Record<string, unknown> | undefined;
  const quoteDetails = getNestedProperty(existingQuoteData, 'quote_details') as Record<string, unknown> | undefined;
  const jobDetailsData = getNestedProperty(existingQuoteData, 'job_details') as Record<string, unknown> | undefined;
  const pocketDoorsData = getNestedProperty(existingQuoteData, 'pocket_doors') as Record<string, unknown> | undefined;
  const supportStructureData = getNestedProperty(existingQuoteData, 'support_structure') as Record<string, unknown> | undefined;
  const deliveryDetailsData = getNestedProperty(existingQuoteData, 'delivery_details') as Record<string, unknown> | undefined;
  const laborDetailsData = getNestedProperty(existingQuoteData, 'labor_details') as Record<string, unknown> | undefined;
  const priceDetailsData = getNestedProperty(existingQuoteData, 'price_details') as Record<string, unknown> | undefined;

  const [quoteStatus, setQuoteStatus] = useState((existingQuoteData?.status as string) || "draft");
  const [contactInfo, setContactInfo] = useState({
    contactName: (quoteDetails?.contactName as string) || "",
    contactEmail: (quoteDetails?.contactEmail as string) || "",
    address: (quoteDetails?.address as string) || "",
    phone: (quoteDetails?.phone as string) || "",
    fax: (quoteDetails?.fax as string) || "",
    website: (quoteDetails?.website as string) || ""
  });

  const [jobDetails, setJobDetails] = useState({
    date: (jobDetailsData?.date as string) || new Date().toISOString().split('T')[0],
    // proposalNumber: (existingQuoteData?.proposal_number as string) || `P${Date.now().toString().slice(-6)}`,
    proposalNumber: (existingQuoteData?.proposal_number as string) || "P123456",
    jobLocation: (jobDetailsData?.job_location as string) || "",
    billedTo: {
      name: (jobDetailsData?.client_name as string) || "",
      company: (jobDetailsData?.client_company as string) || "",
      address: (jobDetailsData?.client_address as string) || ""
    }
  });

  const [walls, setWalls] = useState<WallDetails>(migrateWallDetails(existingQuoteData?.wall_details));
  const [pocketDoors, setPocketDoors] = useState({
    foldType: (pocketDoorsData?.foldType as string) || "",
    foldStyle: (pocketDoorsData?.foldStyle as string) || ""
  });
  const [supportStructure, setSupportStructure] = useState({
    mountingTrack: (supportStructureData?.mountingTrack as string) || ""
  });
  
  const [deliveryLabor, setDeliveryLabor] = useState({
    delivery: {
      shopDrawingWeeks: (deliveryDetailsData?.shopDrawingWeeks as string) || "",
      trackDeliveryWeeks: (deliveryDetailsData?.trackDeliveryWeeks as string) || "",
      panelDeliveryWeeks: (deliveryDetailsData?.panelDeliveryWeeks as string) || "",
      trackInstallationDays: (deliveryDetailsData?.trackInstallationDays as string) || "",
      panelInstallationDays: (deliveryDetailsData?.panelInstallationDays as string) || ""
    },
    labor: {
      laborType: (laborDetailsData?.laborType as string) || "",
      wageRate: (laborDetailsData?.wageRate as string) || ""
    }
  });

  const [pricing, setPricing] = useState({
    basePrice: (priceDetailsData?.base_price as number) || 0,
    freight: (priceDetailsData?.freight as number) || 0,
    total: (priceDetailsData?.total as string) || "",
    paymentUponDrawings: (priceDetailsData?.payment_upon_drawings as string) || "",
    paymentUponTrackInstallation: (priceDetailsData?.payment_upon_track_installation as string) || ""
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
    return deliveryLabor.delivery.shopDrawingWeeks &&
           deliveryLabor.delivery.trackDeliveryWeeks && 
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

  const isPocketDoorsValid = () => {
    // Per-wall validation: all walls should have pocket doors configured
    const wallEntries = Object.entries(walls.walls);
    if (wallEntries.length === 0) return false;
    
    return wallEntries.every(([, wall]) => {
      const foldType = wall.pocketDoors?.foldType;
      const foldStyle = wall.pocketDoors?.foldStyle;
      
      // If no fold type or "None", it's valid
      if (!foldType || foldType === 'None') {
        return true;
      }
      
      // If fold type is specified, fold style should also be specified
      return !!foldStyle;
    });
  };

  const isSupportStructureValid = () => {
    // Per-wall validation: all walls should have structure support configured
    const wallEntries = Object.entries(walls.walls);
    if (wallEntries.length === 0) return false;
    
    return wallEntries.every(([, wall]) => {
      return wall.structureSupport && wall.structureSupport.trim() !== '';
    });
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
      toast.error("Please complete Pocket Doors configuration for all walls");
      setActiveSection("pockets");
      return;
    }
    if (!isSupportStructureValid()) {
      toast.error("Please configure structure support for all walls");
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
        await updateQuote((existingQuoteData?.id as string), {
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
          // pocket_doors: pocketDoors,
          price_details: {
            base_price: pricing.basePrice,
            freight: pricing.freight,
            total: pricing.total,
            payment_upon_drawings: pricing.paymentUponDrawings,
            payment_upon_track_installation: pricing.paymentUponTrackInstallation
          },
          // support_structure: supportStructure,
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
                  <SelectItem value="Submitted">Submitted</SelectItem>
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
                    <PerWallPocketDoorsForm 
                      walls={walls.walls} 
                      onWallUpdate={(wallName, pocketDoorsConfig) => {
                        setWalls(prev => ({
                          ...prev,
                          walls: {
                            ...prev.walls,
                            [wallName]: {
                              ...prev.walls[wallName],
                              pocketDoors: pocketDoorsConfig
                            }
                          }
                        }));
                      }} 
                    />
                  </div>
                )}
                {activeSection === "support" && (
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <PerWallStructureForm 
                      walls={walls.walls} 
                      onWallUpdate={(wallName, structureSupport) => {
                        setWalls(prev => ({
                          ...prev,
                          walls: {
                            ...prev.walls,
                            [wallName]: {
                              ...prev.walls[wallName],
                              structureSupport
                            }
                          }
                        }));
                      }} 
                    />
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
