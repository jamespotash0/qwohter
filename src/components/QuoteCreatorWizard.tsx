import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Contact, 
  FileText, 
  Square, 
  Building, 
  Truck, 
  DollarSign, 
  DoorOpen,
  Save,
  Star,
  Zap
} from "lucide-react";

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

interface QuoteCreatorWizardProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
  onBackToDashboard: () => void;
  onQuoteNameChange?: (newName: string) => void;
  existingQuote?: any;
}

const QuoteCreatorWizard = ({ 
  user, 
  onLogout, 
  quoteName, 
  onBackToDashboard, 
  onQuoteNameChange, 
  existingQuote 
}: QuoteCreatorWizardProps) => {
  const { createQuote, updateQuote } = useQuotes();
  const [activeStep, setActiveStep] = useState(0);
  const [editingQuoteName, setEditingQuoteName] = useState(false);
  const [localQuoteName, setLocalQuoteName] = useState(quoteName);

  // Helper function to migrate wall_details to the new format
  const migrateWallDetails = (wallDetails: any): WallDetails => {
    if (wallDetails && wallDetails.id && wallDetails.walls) {
      return wallDetails;
    }
    
    if (wallDetails && typeof wallDetails === 'object' && !Array.isArray(wallDetails) && !wallDetails.id) {
      return {
        id: crypto.randomUUID(),
        walls: wallDetails
      };
    }
    
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
    
    return {
      id: crypto.randomUUID(),
      walls: {}
    };
  };
  
  // Form data states
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

  const isWallSpecValid = () => {
    const wallEntries = Object.entries(walls.walls);
    
    if (wallEntries.length === 0) return false;
    
    for (const [wallName, wall] of wallEntries) {
      if (!wall.lengthFeet || !wall.heightFeet || !wall.panelCount || !wall.wallSystemType) {
        return false;
      }
      
      if (wall.wallSystemType === "Operable Wall") {
        if (!wall.panelConfiguration || !wall.series || !wall.model || 
            !wall.panelSkin || !wall.stcRating || !wall.panelDesign || 
            !wall.trackType || !wall.trackSystem) {
          return false;
        }
      }
      
      if (wall.panelFinishCategory && !wall.panelFinishSpecificItem) {
        return false;
      }
    }
    
    return true;
  };

  const isPocketDoorsValid = () => {
    const { foldType, foldStyle } = pocketDoors;
    if (!foldType || foldType === 'None') {
      return true;
    }
    return !!foldStyle;
  };

  const isSupportStructureValid = () => {
    return supportStructure.mountingTrack !== "";
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
    return pricing.basePrice > 0 && 
           pricing.freight > 0 && 
           pricing.paymentUponDrawings && 
           pricing.paymentUponTrackInstallation;
  };

  const steps = [
    { 
      id: "contact", 
      label: "Contact Info", 
      icon: Contact, 
      isValid: isContactInfoValid(),
      description: "Company contact details"
    },
    { 
      id: "job", 
      label: "Project Details", 
      icon: FileText, 
      isValid: isJobDetailsValid(),
      description: "Job location and client info"
    },
    { 
      id: "walls", 
      label: "Wall Systems", 
      icon: Square, 
      isValid: isWallSpecValid(),
      description: "Wall specs and dimensions"
    },
    { 
      id: "pockets", 
      label: "Pocket Doors", 
      icon: DoorOpen, 
      isValid: isPocketDoorsValid(),
      description: "Door configuration options"
    },
    { 
      id: "support", 
      label: "Structure", 
      icon: Building, 
      isValid: isSupportStructureValid(),
      description: "Mounting & Support"
    },
    { 
      id: "delivery", 
      label: "Delivery & Labor", 
      icon: Truck, 
      isValid: isDeliveryLaborValid(),
      description: "Timeline & Labor reqs"
    },
    { 
      id: "pricing", 
      label: "Pricing", 
      icon: DollarSign, 
      isValid: isPricingValid(),
      description: "Pricing and payment terms"
    }
  ];

  const currentStep = steps[activeStep];
  const completedSteps = steps.filter(step => step.isValid).length;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSave = async () => {
    const allValid = steps.every(step => step.isValid);
    
    if (!allValid) {
      const firstInvalidStep = steps.findIndex(step => !step.isValid);
      setActiveStep(firstInvalidStep);
      toast.error(`Please complete the ${steps[firstInvalidStep].label} section`);
      return;
    }

    try {
      if (existingQuote) {
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
      } else {
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
        toast.success("Quote created successfully!");
      }
      onBackToDashboard();
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

  const renderStepContent = () => {
    switch (currentStep.id) {
      case "contact":
        return <ContactInfoForm data={contactInfo} onUpdate={setContactInfo} />;
      case "job":
        return <JobDetailsForm data={jobDetails} onUpdate={setJobDetails} />;
      case "walls":
        return <WallSpecificationForm walls={walls} onUpdate={setWalls} />;
      case "pockets":
        return <PocketDoorsForm data={pocketDoors} onUpdate={setPocketDoors} />;
      case "support":
        return <SupportStructureForm data={supportStructure} onUpdate={setSupportStructure} />;
      case "delivery":
        return <DeliveryLaborForm data={deliveryLabor} onUpdate={setDeliveryLabor} />;
      case "pricing":
        return (
          <PricingForm 
            data={pricing} 
            onUpdate={setPricing} 
            onGenerate={handleSave}
            quoteData={allQuoteData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col overflow-hidden">
      {/* Compact Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-lg flex-shrink-0">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left - Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToDashboard}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotes
            </Button>

            {/* Center - Quote name and status */}
            <div className="flex items-center gap-3">
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
                <h1
                  className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => setEditingQuoteName(true)}
                >
                  {localQuoteName}
                </h1>
              )}
              
              <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                <SelectTrigger className="w-28 h-8 text-xs rounded-lg border-slate-200 bg-white/80">
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
            </div>

            {/* Right - Progress and save */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="w-12 bg-slate-200 rounded-full h-1">
                  <div 
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                  />
                </div>
                <span>{completedSteps}/{steps.length}</span>
              </div>
              <Button
                onClick={handleSave}
                disabled={completedSteps < steps.length}
                size="sm"
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden h-full">
        <div className="flex w-full max-w-full mx-auto px-4 h-full">
          {/* Compact Step Navigation */}
          <div className="w-80 flex-shrink-0 p-4 h-full">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl h-full flex flex-col min-h-0">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
                  <Zap className="w-4 h-4 text-indigo-500" />
                  Quote Wizard
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-1 overflow-y-auto min-h-0">
                {steps.map((step, index) => {
                  const isActive = index === activeStep;
                  const isCompleted = step.isValid;
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(index)}
                      className={`
                        w-full text-left p-3 rounded-lg transition-all duration-200 border
                        ${isActive 
                          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200' 
                          : 'hover:bg-slate-50 border-transparent'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                          ${isCompleted 
                            ? 'bg-emerald-500 text-white' 
                            : isActive 
                              ? 'bg-indigo-500 text-white' 
                              : 'bg-slate-200 text-slate-600'
                          }
                        `}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <step.icon className="w-3 h-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`
                            font-medium text-sm
                            ${isActive ? 'text-indigo-900' : 'text-slate-700'}
                          `}>
                            {step.label}
                          </div>
                          <div className={`
                            text-xs
                            ${isActive ? 'text-indigo-600' : 'text-slate-500'}
                          `}>
                            {step.description}
                          </div>
                        </div>
                        {isCompleted && (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Compact Main Content */}
          <div className="flex-1 p-4 pl-2 flex flex-col overflow-hidden h-full">
            <Card className="bg-white/90 backdrop-blur-sm border border-white/50 shadow-2xl flex-1 flex flex-col overflow-hidden focus-within:ring-0 h-full">
              <CardHeader className="pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <currentStep.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">
                        {currentStep.label}
                      </CardTitle>
                      <p className="text-slate-600 text-sm">{currentStep.description}</p>
                    </div>
                  </div>
                  {currentStep.isValid && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <Star className="w-4 h-4" />
                      <span className="text-sm font-medium">Done</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 px-10 pt-4 pb-10 overflow-hidden min-h-0">
                <div className="h-full overflow-y-auto">
                  <div className="pr-8 pb-6 min-h-full">
                    {renderStepContent()}
                  </div>
                </div>
              </CardContent>

              {/* Compact Navigation Footer */}
              <div className="border-t border-slate-100 p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={activeStep === 0}
                    className="px-4 py-2 rounded-lg border hover:bg-slate-50 transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>{activeStep + 1} / {steps.length}</span>
                    <div className="w-16 bg-slate-200 rounded-full h-1">
                      <div 
                        className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {activeStep < steps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSave}
                      disabled={!steps.every(step => step.isValid)}
                      className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Quote
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteCreatorWizard;