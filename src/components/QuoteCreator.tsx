import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, LogOut, FileText, Plus, Settings, Truck, Clock, Users, ArrowLeft } from "lucide-react";
import ContactInfoForm from "./ContactInfoForm";
import JobDetailsForm from "./JobDetailsForm";
import WallSpecificationForm from "./WallSpecificationForm";
import PricingForm from "./PricingForm";
import SupportStructureForm from "./SupportStructureForm";
import DeliveryForm from "./DeliveryForm";
import LaborForm from "./LaborForm";
import { useToast } from "@/hooks/use-toast";

interface QuoteCreatorProps {
  user: string;
  onLogout: () => void;
  quoteName: string;
}

export interface WallSpecification {
  id: string;
  name: string;
  width: string;
  height: string;
  panelCount: string;
  panelType: string;
  quantity: string;
  series: string;
  model: string;
  trackType: string;
  panelThickness: string;
  designType: string;
  constructType: string;
  stcRating: string;
  trackSystem: string;
  verticalSealants: string;
  bottomSeals: string;
  endPanelType: string;
  finalSeal: string;
}

export interface QuoteData {
  contactInfo: {
    contactName: string;
    contactEmail: string;
    address: string;
    phone: string;
    fax: string;
    website: string;
  };
  jobDetails: {
    date: string;
    proposalNumber: string;
    jobLocation: string;
    billedTo: {
      name: string;
      company: string;
      address: string;
    };
  };
  walls: WallSpecification[];
  supportStructure: {
    mountingTrack: string;
  };
  delivery: {
    trackDeliveryWeeks: string;
    panelDeliveryWeeks: string;
    trackInstallationDays: string;
    panelInstallationDays: string;
  };
  labor: {
    laborType: string;
    wageRate: string;
  };
  pricing: {
    basePrice: string;
    freight: string;
    total: string;
  };
}

const QuoteCreator = ({ user, onLogout, quoteName }: QuoteCreatorProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contact");
  
  const [quoteData, setQuoteData] = useState<QuoteData>({
    contactInfo: {
      contactName: "Ed Machinski",
      contactEmail: "",
      address: "567 Commerce St, Franklin Lakes, NJ, 07417",
      phone: "(973) 884-0474",
      fax: "(973) 884-1606",
      website: "contemporarywalls.com"
    },
    jobDetails: {
      date: new Date().toLocaleDateString(),
      proposalNumber: Math.floor(Math.random() * 90000 + 10000).toString(),
      jobLocation: "",
      billedTo: {
        name: "",
        company: "",
        address: ""
      }
    },
    walls: [],
    supportStructure: {
      mountingTrack: "Pre-Drilled Steel Beam"
    },
    delivery: {
      trackDeliveryWeeks: "1-2",
      panelDeliveryWeeks: "3-4",
      trackInstallationDays: "3-4",
      panelInstallationDays: "1"
    },
    labor: {
      laborType: "Non-Union",
      wageRate: "Standard"
    },
    pricing: {
      basePrice: "",
      freight: "",
      total: ""
    }
  });

  const updateQuoteData = (section: keyof QuoteData, data: any) => {
    setQuoteData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const addWall = () => {
    const newWall: WallSpecification = {
      id: Date.now().toString(),
      name: `Wall ${String.fromCharCode(65 + quoteData.walls.length)}`,
      width: "",
      height: "",
      panelCount: "",
      panelType: "Continuously Hinged Panels",
      quantity: "1",
      series: "2000",
      model: "2030",
      trackType: "Paired Panels Track",
      panelThickness: "3",
      designType: "Trimless",
      constructType: "Acoustical Substrate",
      stcRating: "56",
      trackSystem: "Steel Track System",
      verticalSealants: "Tongue-and-Groove",
      bottomSeals: "Retractable Seals",
      endPanelType: "Fixed Wall Jamb",
      finalSeal: "Bulb Seal"
    };
    
    setQuoteData(prev => ({
      ...prev,
      walls: [...prev.walls, newWall]
    }));
  };

  const generateQuote = () => {
    console.log("Generating quote with data:", quoteData);
    toast({
      title: "Quote Generated!",
      description: "Your quote has been created successfully. PDF generation coming soon!",
    });
  };

  const handleBackToHome = () => {
    window.location.reload(); // Simple way to go back to quote selection
  };

  const tabs = [
    { id: "contact", label: "Contact Info", icon: Building2 },
    { id: "job", label: "Job Details", icon: FileText },
    { id: "walls", label: "Wall Specs", icon: Building2 },
    { id: "support", label: "Support Structure", icon: Settings },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "labor", label: "Labor", icon: Users },
    { id: "pricing", label: "Pricing", icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={handleBackToHome}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Contemporary Wall Systems
                </h1>
                <p className="text-sm text-gray-600">Quote: {quoteName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user}</span>
              <Button variant="outline" onClick={onLogout} size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Sections</CardTitle>
                <p className="text-sm text-gray-600">Complete each section step by step</p>
              </CardHeader>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                {activeTab === "contact" && (
                  <ContactInfoForm
                    data={quoteData.contactInfo}
                    onUpdate={(data) => updateQuoteData("contactInfo", data)}
                  />
                )}
                
                {activeTab === "job" && (
                  <JobDetailsForm
                    data={quoteData.jobDetails}
                    onUpdate={(data) => updateQuoteData("jobDetails", data)}
                  />
                )}
                
                {activeTab === "walls" && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold">Wall Specifications</h2>
                      <Button onClick={addWall} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Wall
                      </Button>
                    </div>
                    <WallSpecificationForm
                      walls={quoteData.walls}
                      onUpdate={(walls) => updateQuoteData("walls", walls)}
                    />
                  </div>
                )}

                {activeTab === "support" && (
                  <SupportStructureForm
                    data={quoteData.supportStructure}
                    onUpdate={(data) => updateQuoteData("supportStructure", data)}
                  />
                )}

                {activeTab === "delivery" && (
                  <DeliveryForm
                    data={quoteData.delivery}
                    onUpdate={(data) => updateQuoteData("delivery", data)}
                  />
                )}

                {activeTab === "labor" && (
                  <LaborForm
                    data={quoteData.labor}
                    onUpdate={(data) => updateQuoteData("labor", data)}
                  />
                )}
                
                {activeTab === "pricing" && (
                  <PricingForm
                    data={quoteData.pricing}
                    onUpdate={(data) => updateQuoteData("pricing", data)}
                    onGenerate={generateQuote}
                    quoteData={quoteData}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteCreator;
