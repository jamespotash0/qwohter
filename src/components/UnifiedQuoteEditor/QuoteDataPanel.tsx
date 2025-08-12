import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MapboxInput from '@/components/MapboxInput';
import { 
  ChevronDown, 
  ChevronRight, 
  DollarSign, 
  User, 
  Building, 
  Truck,
  Square,
  DoorOpen,
  Contact,
  FileText
} from 'lucide-react';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

interface QuoteDataPanelProps {
  data: QuoteData;
  onChange: (section: string, value: any) => void;
  className?: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  children
}) => (
  <Card className="mb-4">
    <CardHeader 
      className="cursor-pointer p-3 hover:bg-gray-50 transition-colors"
      onClick={onToggle}
    >
      <CardTitle className="flex items-center gap-2 text-sm">
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    {isOpen && (
      <CardContent className="pt-0 p-3">
        {children}
      </CardContent>
    )}
  </Card>
);

export const QuoteDataPanel: React.FC<QuoteDataPanelProps> = ({
  data,
  onChange,
  className = ''
}) => {
  const [openSections, setOpenSections] = useState({
    contact: false,
    client: false,
    walls: false,
    pockets: false,
    mounting: false,
    delivery: false,
    pricing: false,
    notes: false
  });

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const handleFieldChange = useCallback((section: string, field: string, value: any) => {
    const updatedSection = {
      ...data[section as keyof QuoteData],
      [field]: value
    };
    onChange(section, updatedSection);
  }, [data, onChange]);

  // Auto-calculate total when base price or freight changes
  useEffect(() => {
    const basePrice = parseFloat(data.price_details?.basePrice || data.price_details?.base_price || '0');
    const freight = parseFloat(data.price_details?.freight || '0');
    const total = basePrice + freight;
    
    if (total > 0 && total !== parseFloat(data.price_details?.total || '0')) {
      handleFieldChange('price_details', 'total', total.toFixed(2));
    }
  }, [data.price_details?.basePrice, data.price_details?.base_price, data.price_details?.freight, handleFieldChange]);

  // Helper function to get available fold styles based on fold type
  const getAvailableFoldStyles = (foldType: string) => {
    switch (foldType) {
      case "Bi-Fold":
        return ["Bulb Seal"];
      case "Single":
        return ["Bulb Seal", "Expander"];
      case "Double":
        return ["Lap Trim", "Expander", "Expander & Interlock Switches"];
      default:
        return [];
    }
  };

  // Handle fold type change with style reset
  const handleFoldTypeChange = (foldType: string) => {
    const newFoldType = foldType === "None" ? "" : foldType;
    handleFieldChange('pocket_doors', 'foldType', newFoldType);
    
    // Reset fold style if current selection is not valid for new fold type
    const availableStyles = getAvailableFoldStyles(newFoldType);
    const currentStyle = data.pocket_doors?.foldStyle;
    if (currentStyle && !availableStyles.includes(currentStyle)) {
      handleFieldChange('pocket_doors', 'foldStyle', "");
    }
  };

  // Helper function to add a new wall
  const addWall = () => {
    const wallsCount = Object.keys(data.wall_details?.walls || {}).length;
    const newWallName = `Wall ${wallsCount + 1}`;
    
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [newWallName]: {
          lengthFeet: '',
          lengthInches: '',
          heightFeet: '',
          heightInches: '',
          panelCount: '',
          wallSystemType: '',
          panelConfiguration: '',
          series: '',
          model: '',
          panelSkin: '',
          stcRating: '',
          panelDesign: '',
          trackType: '',
          trackSystem: '',
          panelFinishCategory: '',
          panelFinishSpecificItem: '',
          // Glass Wall specific fields
          glasswallModel: '',
          glasswallOperation: '',
          glasswallPanelConfiguration: '',
          glasswallPanelFace: '',
          glasswallFrameFinish: '',
          glasswallGlassType: '',
          glasswallSTCRating: '',
          glasswallPartitionSupport: '',
          glasswallPassDoorType: '',
          glasswallPassDoorOption: '',
          glasswallHingeType: '',
          glasswallFrameThickness: '',
          glasswallPanelWidth: '',
          glasswallTrackType: '',
          glasswallTrackFinish: '',
          glasswallFloorGuide: '',
          glasswallFinalClosure: '',
          glasswallBottomSeals: '',
          glasswallTopSeals: '',
          // Common fields
          panelThickness: '',
          verticalSeals: '',
          bottomSeals: '',
          topSeals: '',
          initialClosureSystem: '',
          endPanelType: ''
        }
      }
    };
    
    onChange('wall_details', updatedWalls);
  };

  // Helper function to remove a wall
  const removeWall = (wallName: string) => {
    const updatedWalls = { ...data.wall_details?.walls };
    delete updatedWalls[wallName];
    
    onChange('wall_details', {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: updatedWalls
    });
  };

  // Helper function to update wall field
  const handleWallFieldChange = (wallName: string, field: string, value: any) => {
    const currentWall = data.wall_details?.walls?.[wallName] || {};
    
    // Ensure all Glass Wall fields exist for proper dropdown functionality
    const wallWithDefaults = {
      lengthFeet: '',
      lengthInches: '',
      heightFeet: '',
      heightInches: '',
      panelCount: '',
      wallSystemType: '',
      panelConfiguration: '',
      series: '',
      model: '',
      panelSkin: '',
      stcRating: '',
      panelDesign: '',
      trackType: '',
      trackSystem: '',
      panelFinishCategory: '',
      panelFinishSpecificItem: '',
      // Glass Wall specific fields
      glasswallModel: '',
      glasswallOperation: '',
      glasswallPanelConfiguration: '',
      glasswallPanelFace: '',
      glasswallFrameFinish: '',
      glasswallGlassType: '',
      glasswallSTCRating: '',
      glasswallPartitionSupport: '',
      glasswallPassDoorType: '',
      glasswallPassDoorOption: '',
      glasswallHingeType: '',
      glasswallFrameThickness: '',
      glasswallPanelWidth: '',
      glasswallTrackType: '',
      glasswallTrackFinish: '',
      glasswallFloorGuide: '',
      glasswallFinalClosure: '',
      glasswallBottomSeals: '',
      glasswallTopSeals: '',
      // Common fields
      panelThickness: '',
      verticalSeals: '',
      bottomSeals: '',
      topSeals: '',
      initialClosureSystem: '',
      endPanelType: '',
      // Override with current wall data
      ...currentWall,
      // Apply the new field value
      [field]: value
    };
    
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: wallWithDefaults
      }
    };
    
    onChange('wall_details', updatedWalls);
  };

  return (
    <div className={`space-y-4 pb-6 ${className}`}>
      {/* Contact Information */}
      <CollapsibleSection
        title="Contact Info"
        icon={<Contact className="w-4 h-4 text-blue-500" />}
        isOpen={openSections.contact}
        onToggle={() => toggleSection('contact')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="contactName" className="text-xs font-medium text-gray-600">
              Contact Name
            </Label>
            <Input
              id="contactName"
              value={data.quote_details?.contactName || ''}
              onChange={(e) => handleFieldChange('quote_details', 'contactName', e.target.value)}
              placeholder="Ed Michinski"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="contactEmail" className="text-xs font-medium text-gray-600">
              Email
            </Label>
            <Input
              id="contactEmail"
              value={data.quote_details?.contactEmail || data.quote_details?.email || ''}
              onChange={(e) => handleFieldChange('quote_details', 'contactEmail', e.target.value)}
              placeholder="contact@company.com"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="phone" className="text-xs font-medium text-gray-600">
              Phone
            </Label>
            <Input
              id="phone"
              value={data.quote_details?.phone || ''}
              onChange={(e) => handleFieldChange('quote_details', 'phone', e.target.value)}
              placeholder="(973) 884-0474"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="fax" className="text-xs font-medium text-gray-600">
              Fax
            </Label>
            <Input
              id="fax"
              value={data.quote_details?.fax || ''}
              onChange={(e) => handleFieldChange('quote_details', 'fax', e.target.value)}
              placeholder="Fax number"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="website" className="text-xs font-medium text-gray-600">
              Website
            </Label>
            <Input
              id="website"
              value={data.quote_details?.website || ''}
              onChange={(e) => handleFieldChange('quote_details', 'website', e.target.value)}
              placeholder="contemporarywalls.com"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="address" className="text-xs font-medium text-gray-600">
              Address
            </Label>
            <Textarea
              id="address"
              value={data.quote_details?.address || ''}
              onChange={(e) => handleFieldChange('quote_details', 'address', e.target.value)}
              placeholder="567 Commerce St, Franklin Lakes, NJ, 07417"
              className="text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Client Information */}
      <CollapsibleSection
        title="Client Info"
        icon={<User className="w-4 h-4 text-purple-500" />}
        isOpen={openSections.client}
        onToggle={() => toggleSection('client')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="proposalNumber" className="text-xs font-medium text-gray-600">
              Proposal Number
            </Label>
            <Input
              id="proposalNumber"
              value={data.proposal_number || ''}
              onChange={(e) => onChange('proposal_number', e.target.value)}
              placeholder="Q-2024-001"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="projectName" className="text-xs font-medium text-gray-600">
              Project Name
            </Label>
            <Input
              id="projectName"
              value={data.project_name || ''}
              onChange={(e) => onChange('project_name', e.target.value)}
              placeholder="Project Name"
              className="text-sm"
            />
          </div>

          <div>
            <Label htmlFor="clientName" className="text-xs font-medium text-gray-600">
              Client Name
            </Label>
            <Input
              id="clientName"
              value={data.job_details?.client_name || ''}
              onChange={(e) => handleFieldChange('job_details', 'client_name', e.target.value)}
              placeholder="Client Name"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="clientCompany" className="text-xs font-medium text-gray-600">
              Company
            </Label>
            <Input
              id="clientCompany"
              value={data.job_details?.client_company || ''}
              onChange={(e) => handleFieldChange('job_details', 'client_company', e.target.value)}
              placeholder="Company Name"
              className="text-sm"
            />
          </div>
          
          <div>
            <MapboxInput
              label="Client Address"
              id="clientAddress"
              value={data.job_details?.client_address || ''}
              onChange={(value) => handleFieldChange('job_details', 'client_address', value)}
              placeholder="Client address..."
            />
          </div>
          
          <div>
            <MapboxInput
              label="Job Location"
              id="jobLocation"
              value={data.job_details?.job_location || ''}
              onChange={(value) => handleFieldChange('job_details', 'job_location', value)}
              placeholder="Project location"
            />
          </div>
          
          <div>
            <Label htmlFor="projectDate" className="text-xs font-medium text-gray-600">
              Project Date
            </Label>
            <Input
              id="projectDate"
              type="date"
              value={data.job_details?.date || ''}
              onChange={(e) => handleFieldChange('job_details', 'date', e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Wall Systems */}
      <CollapsibleSection
        title="Wall Systems"
        icon={<Square className="w-4 h-4 text-green-500" />}
        isOpen={openSections.walls}
        onToggle={() => toggleSection('walls')}
      >
        <div className="space-y-4">
          {Object.entries(data.wall_details?.walls || {}).map(([wallName, wall]) => (
            <Card key={`${wallName}-${wall.wallSystemType}-${wall.glasswallModel}`} className="p-3 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-sm">{wallName}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeWall(wallName)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <Label htmlFor={`${wallName}-lengthFeet`}>Length (ft)</Label>
                  <Input
                    id={`${wallName}-lengthFeet`}
                    value={wall.lengthFeet || ''}
                    onChange={(e) => handleWallFieldChange(wallName, 'lengthFeet', e.target.value)}
                    placeholder="0"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor={`${wallName}-lengthInches`}>Length (in)</Label>
                  <Input
                    id={`${wallName}-lengthInches`}
                    value={wall.lengthInches || ''}
                    onChange={(e) => handleWallFieldChange(wallName, 'lengthInches', e.target.value)}
                    placeholder="0"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor={`${wallName}-heightFeet`}>Height (ft)</Label>
                  <Input
                    id={`${wallName}-heightFeet`}
                    value={wall.heightFeet || ''}
                    onChange={(e) => handleWallFieldChange(wallName, 'heightFeet', e.target.value)}
                    placeholder="0"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor={`${wallName}-heightInches`}>Height (in)</Label>
                  <Input
                    id={`${wallName}-heightInches`}
                    value={wall.heightInches || ''}
                    onChange={(e) => handleWallFieldChange(wallName, 'heightInches', e.target.value)}
                    placeholder="0"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor={`${wallName}-panelCount`}>Panel Count</Label>
                  <Input
                    id={`${wallName}-panelCount`}
                    value={wall.panelCount || ''}
                    onChange={(e) => handleWallFieldChange(wallName, 'panelCount', e.target.value)}
                    placeholder="0"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label htmlFor={`${wallName}-quantity`}>Quantity</Label>
                  <Input
                    id={`${wallName}-quantity`}
                    value={wall.quantity || ''}
                    onChange={(e) => handleWallFieldChange(wallName, 'quantity', e.target.value)}
                    placeholder="1"
                    className="text-xs h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${wallName}-wallSystemType`}>System Type</Label>
                  <Select
                    value={wall.wallSystemType || ''}
                    onValueChange={(value) => handleWallFieldChange(wallName, 'wallSystemType', value)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="text-left">
                      <SelectItem className="text-left" value="Operable Wall">Operable Wall</SelectItem>
                      <SelectItem className="text-left" value="Glass Wall">Glass Wall</SelectItem>
                      <SelectItem className="text-left" value="Accordion Partitions">Accordion Partitions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Additional fields for Operable Wall */}
                {wall.wallSystemType === "Operable Wall" && (
                  <>
                    <div className="space-y-2">
                      <Label>Panel Configuration</Label>
                      <Select
                        value={wall.panelConfiguration || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'panelConfiguration', value);
                          // Reset dependent fields when configuration changes
                          handleWallFieldChange(wallName, 'series', '');
                          handleWallFieldChange(wallName, 'model', '');
                        }}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select config" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                          <SelectItem className="text-left" value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
                          <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Series</Label>
                      <Select
                        value={wall.series || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'series', value);
                          // Reset model when series changes
                          handleWallFieldChange(wallName, 'model', '');
                        }}
                        disabled={!wall.panelConfiguration}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.panelConfiguration === "Individual Panels" && (
                            <>
                              <SelectItem className="text-left" value="2000">2000</SelectItem>
                              <SelectItem className="text-left" value="3000">3000</SelectItem>
                              <SelectItem className="text-left" value="Hufcor: 600">Hufcor: 600</SelectItem>
                            </>
                          )}
                          {(wall.panelConfiguration === "Hinged-Paired Panels" || wall.panelConfiguration === "Continuously-Hinged Panels") && (
                            <>
                              <SelectItem className="text-left" value="2000">2000</SelectItem>
                              <SelectItem className="text-left" value="3000">3000</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select
                        value={wall.model || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'model', value);
                          // Reset dependent fields
                          handleWallFieldChange(wallName, 'panelSkin', '');
                          handleWallFieldChange(wallName, 'stcRating', '');
                        }}
                        disabled={!wall.series}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.panelConfiguration === "Individual Panels" && wall.series === "2000" && (
                            <>
                              <SelectItem className="text-left" value="2010">2010</SelectItem>
                              <SelectItem className="text-left" value="2020">2020</SelectItem>
                              <SelectItem className="text-left" value="2010GL">2010GL</SelectItem>
                              <SelectItem className="text-left" value="2020GL">2020GL</SelectItem>
                            </>
                          )}
                          {wall.panelConfiguration === "Individual Panels" && wall.series === "3000" && (
                            <>
                              <SelectItem className="text-left" value="3010">3010</SelectItem>
                              <SelectItem className="text-left" value="3020">3020</SelectItem>
                              <SelectItem className="text-left" value="3010GL">3010GL</SelectItem>
                              <SelectItem className="text-left" value="3020GL">3020GL</SelectItem>
                            </>
                          )}
                          {wall.panelConfiguration === "Individual Panels" && wall.series === "Hufcor: 600" && (
                            <SelectItem className="text-left" value="Hufcor 641">Hufcor 641</SelectItem>
                          )}
                          {wall.panelConfiguration === "Continuously-Hinged Panels" && wall.series === "2000" && (
                            <SelectItem className="text-left" value="2050e">2050e</SelectItem>
                          )}
                          {wall.panelConfiguration === "Continuously-Hinged Panels" && wall.series === "3000" && (
                            <SelectItem className="text-left" value="3050e">3050e</SelectItem>
                          )}
                          {wall.panelConfiguration === "Hinged-Paired Panels" && wall.series === "2000" && (
                            <>
                              <SelectItem className="text-left" value="2030">2030</SelectItem>
                              <SelectItem className="text-left" value="2030GL">2030GL</SelectItem>
                            </>
                          )}
                          {wall.panelConfiguration === "Hinged-Paired Panels" && wall.series === "3000" && (
                            <>
                              <SelectItem className="text-left" value="3030">3030</SelectItem>
                              <SelectItem className="text-left" value="3030GL">3030GL</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Thickness (Auto-calculated)</Label>
                      <Input
                        value={(() => {
                          const series = wall.series;
                          if (series === "2000") return "3\"";
                          if (series === "3000") return "4\"";
                          if (series === "Hufcor: 600") return "4\"";
                          return "";
                        })()}
                        readOnly
                        className="text-xs h-8 bg-muted text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Design</Label>
                      <Select
                        value={wall.panelDesign || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'panelDesign', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select design" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Trimless U Capped">Trimless U Capped</SelectItem>
                          <SelectItem className="text-left" value="U-Capped Trim">U-Capped Trim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Skin</Label>
                      <Select
                        value={wall.panelSkin || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'panelSkin', value);
                          // Reset STC rating when skin changes
                          handleWallFieldChange(wallName, 'stcRating', '');
                        }}
                        disabled={!wall.model}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select skin" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.model === "Hufcor 641" && (
                            <SelectItem className="text-left" value="Steel">Steel</SelectItem>
                          )}
                          {["3010", "3020", "3030"].includes(wall.model || '') && (
                            <>
                              <SelectItem className="text-left" value="Standard Steel Skin">Standard Steel Skin</SelectItem>
                              <SelectItem className="text-left" value="Optional Acoustical Substrate">Optional Acoustical Substrate</SelectItem>
                              <SelectItem className="text-left" value="Optional Wood Veneer">Optional Wood Veneer</SelectItem>
                              <SelectItem className="text-left" value="Optional High-Pressure Laminate">Optional High-Pressure Laminate</SelectItem>
                            </>
                          )}
                          {["3050e", "3010GL", "3020GL", "3030GL"].includes(wall.model || '') && (
                            <>
                              <SelectItem className="text-left" value="Standard Steel Skin">Standard Steel Skin</SelectItem>
                              <SelectItem className="text-left" value="Optional Acoustical Substrate">Optional Acoustical Substrate</SelectItem>
                            </>
                          )}
                          {["2010", "2020", "2030"].includes(wall.model || '') && (
                            <>
                              <SelectItem className="text-left" value="Standard Acoustical Substrate">Standard Acoustical Substrate</SelectItem>
                              <SelectItem className="text-left" value="Optional Steel Skin">Optional Steel Skin</SelectItem>
                              <SelectItem className="text-left" value="Optional Wood Veneer">Optional Wood Veneer</SelectItem>
                              <SelectItem className="text-left" value="Optional High-Pressure Laminate">Optional High-Pressure Laminate</SelectItem>
                            </>
                          )}
                          {["2050e", "2010GL", "2020GL", "2030GL"].includes(wall.model || '') && (
                            <>
                              <SelectItem className="text-left" value="Standard Acoustical Substrate">Standard Acoustical Substrate</SelectItem>
                              <SelectItem className="text-left" value="Optional Steel Skin">Optional Steel Skin</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>STC Rating</Label>
                      <Select
                        value={wall.stcRating || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'stcRating', value)}
                        disabled={!wall.model || !wall.panelSkin}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select STC" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.model === "Hufcor 641" && (
                            <>
                              <SelectItem className="text-left" value="43">43</SelectItem>
                              <SelectItem className="text-left" value="47">47</SelectItem>
                              <SelectItem className="text-left" value="49">49</SelectItem>
                              <SelectItem className="text-left" value="52">52</SelectItem>
                              <SelectItem className="text-left" value="54">54</SelectItem>
                              <SelectItem className="text-left" value="56">56</SelectItem>
                            </>
                          )}
                          {["2010GL", "2020GL", "2030GL"].includes(wall.model || '') && (
                            <SelectItem className="text-left" value="38">38</SelectItem>
                          )}
                          {["3010GL", "3020GL", "3030GL"].includes(wall.model || '') && (
                            <>
                              <SelectItem className="text-left" value="43">43</SelectItem>
                              <SelectItem className="text-left" value="48">48</SelectItem>
                            </>
                          )}
                          {["2010", "2020", "2030", "2050e"].includes(wall.model || '') && wall.panelSkin?.includes("Acoustical Substrate") && (
                            <>
                              <SelectItem className="text-left" value="42">42</SelectItem>
                              <SelectItem className="text-left" value="45">45</SelectItem>
                              <SelectItem className="text-left" value="49">49</SelectItem>
                              <SelectItem className="text-left" value="50">50</SelectItem>
                            </>
                          )}
                          {["2010", "2020", "2030", "2050e"].includes(wall.model || '') && wall.panelSkin?.includes("Steel") && (
                            <>
                              <SelectItem className="text-left" value="49">49</SelectItem>
                              <SelectItem className="text-left" value="51">51</SelectItem>
                            </>
                          )}
                          {["3010", "3020", "3030", "3050e"].includes(wall.model || '') && wall.panelSkin?.includes("Steel") && (
                            <>
                              <SelectItem className="text-left" value="46">46</SelectItem>
                              <SelectItem className="text-left" value="50">50</SelectItem>
                              <SelectItem className="text-left" value="52">52</SelectItem>
                              <SelectItem className="text-left" value="56">56</SelectItem>
                            </>
                          )}
                          {["3010", "3020", "3030", "3050e"].includes(wall.model || '') && wall.panelSkin?.includes("Acoustical Substrate") && (
                            <>
                              <SelectItem className="text-left" value="43">43</SelectItem>
                              <SelectItem className="text-left" value="46">46</SelectItem>
                              <SelectItem className="text-left" value="48">48</SelectItem>
                              <SelectItem className="text-left" value="50">50</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* <div className="space-y-2">
                      <Label>Panel Design</Label>
                      <Select
                        value={wall.panelDesign || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'panelDesign', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select design" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Trimless U Capped">Trimless U Capped</SelectItem>
                          <SelectItem className="text-left" value="U-Capped Trim">U-Capped Trim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}
                    <div className="space-y-2">
                      <Label>Panel Finish Category</Label>
                      <Select
                        value={wall.panelFinishCategory || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'panelFinishCategory', value);
                          // Reset specific item when category changes
                          handleWallFieldChange(wallName, 'panelFinishSpecificItem', '');
                        }}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select finish" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Koroseal Standard Vinyl">Koroseal Standard Vinyl</SelectItem>
                          <SelectItem className="text-left" value="Koroseal Upgrade Vinyl">Koroseal Upgrade Vinyl</SelectItem>
                          <SelectItem className="text-left" value="Shaw Standard Carpet">Shaw Standard Carpet</SelectItem>
                          <SelectItem className="text-left" value="HyTex Upgrade Carpet">HyTex Upgrade Carpet</SelectItem>
                          <SelectItem className="text-left" value="HyTex Standard Fabric">HyTex Standard Fabric</SelectItem>
                          <SelectItem className="text-left" value="HyTex Upgrade Fabric">HyTex Upgrade Fabric</SelectItem>
                          <SelectItem className="text-left" value="Standard Wood Veneer">Standard Wood Veneer</SelectItem>
                          <SelectItem className="text-left" value="Wilsonart High Pressure Laminate (HPL)">Wilsonart High Pressure Laminate (HPL)</SelectItem>
                          <SelectItem className="text-left" value="Full Height Marker (Tack) Board">Full Height Marker (Tack) Board</SelectItem>
                          <SelectItem className="text-left" value="Uncovered">Uncovered</SelectItem>
                          <SelectItem className="text-left" value="C.O.M. Material">C.O.M. Material</SelectItem>
                          <SelectItem className="text-left" value="Field Painting by Others">Field Painting by Others</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {!["Uncovered", "C.O.M. Material", "Field Painting by Others"].includes(wall.panelFinishCategory || '') && wall.panelFinishCategory && (
                      <div>
                        <Label>Panel Finish Specific Item</Label>
                        <Select
                          value={wall.panelFinishSpecificItem || ''}
                          onValueChange={(value) => handleWallFieldChange(wallName, 'panelFinishSpecificItem', value)}
                          disabled={!wall.panelFinishCategory}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Select specific item" />
                          </SelectTrigger>
                          <SelectContent className="text-left">
                            {wall.panelFinishCategory === "Standard Wood Veneer" && (
                              <>
                                <SelectItem className="text-left" value="Unfinished Flat Cut White Maple">Unfinished Flat Cut White Maple</SelectItem>
                                <SelectItem className="text-left" value="Unfinished Flat Cut White Oak">Unfinished Flat Cut White Oak</SelectItem>
                                <SelectItem className="text-left" value="Unfinished Flat Cut Walnut">Unfinished Flat Cut Walnut</SelectItem>
                                <SelectItem className="text-left" value="Unfinished Flat Cut Cherry">Unfinished Flat Cut Cherry</SelectItem>
                                <SelectItem className="text-left" value="Unfinished Flat Cut Red Oak">Unfinished Flat Cut Red Oak</SelectItem>
                              </>
                            )}
                            {/* Add more specific items as needed - truncated for brevity */}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Vertical Seals</Label>
                      <Select
                        value={wall.verticalSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'verticalSeals', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select seals" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="None">None</SelectItem>
                          <SelectItem className="text-left" value="Tongue-and-Groove">Tongue-and-Groove</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bottom Seals</Label>
                      <Select
                        value={wall.bottomSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'bottomSeals', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select seals" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="None">None</SelectItem>
                          <SelectItem className="text-left" value="Retractable">Retractable</SelectItem>
                          <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
                          <SelectItem className="text-left" value="Adjustable">Adjustable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Top Seals</Label>
                      <Select
                        value={wall.topSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'topSeals', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select seals" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="None">None</SelectItem>
                          <SelectItem className="text-left" value="Fixed">Fixed</SelectItem>
                          <SelectItem className="text-left" value="Adjustable">Adjustable</SelectItem>
                          <SelectItem className="text-left" value="Operable">Operable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* <div className="space-y-2">
                      <Label>Track Type</Label>
                      <Select
                        value={wall.trackType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'trackType', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Straight">Straight</SelectItem>
                          <SelectItem className="text-left" value="Curved">Curved</SelectItem>
                          <SelectItem className="text-left" value="T-Layout">T-Layout</SelectItem>
                          <SelectItem className="text-left" value="L-Layout">L-Layout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}
                    {/* <div className="space-y-2">
                      <Label>Track System</Label>
                      <Select
                        value={wall.trackSystem || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'trackSystem', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Heavy-Duty">Heavy-Duty</SelectItem>
                          <SelectItem className="text-left" value="Standard">Standard</SelectItem>
                          <SelectItem className="text-left" value="Light-Duty">Light-Duty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}
                    <div className="space-y-2">
                      <Label>Initial Closure System</Label>
                      <Select
                        value={wall.initialClosureSystem || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'initialClosureSystem', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select closure" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="None">None</SelectItem>
                          <SelectItem className="text-left" value="Standard Bulb">Standard Bulb</SelectItem>
                          <SelectItem className="text-left" value="Optional Fixed Starter Jamb">Optional Fixed Starter Jamb</SelectItem>
                          <SelectItem className="text-left" value="Optional Adjustable Starter Jamb">Optional Adjustable Starter Jamb</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>End Panel Type</Label>
                      <Select
                        value={wall.endPanelType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'endPanelType', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select end panel" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="None">None</SelectItem>
                          <SelectItem className="text-left" value="Standard Expander Panel Closure">Standard Expander Panel Closure</SelectItem>
                          <SelectItem className="text-left" value="Optional Hinged Panel(s) Closure">Optional Hinged Panel(s) Closure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pass Door Panels</Label>
                      <Select
                        value={wall.passDoorPanels || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'passDoorPanels', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select pass door" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="None">None</SelectItem>
                          <SelectItem className="text-left" value="Single">Single</SelectItem>
                          <SelectItem className="text-left" value="Double">Double</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Track System</Label>
                      <Select
                        value={wall.trackSystem || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'trackSystem', value)}
                        disabled={!wall.trackType && !wall.model}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.model === "Hufcor 641" && (
                            <>
                              <SelectItem className="text-left" value="Type 26 Clear Satin-Anodized Aluminum">Type 26 Clear Satin-Anodized Aluminum</SelectItem>
                              <SelectItem className="text-left" value="Type 36 Clear Satin-Anodized Aluminum">Type 36 Clear Satin-Anodized Aluminum</SelectItem>
                              <SelectItem className="text-left" value="Type 57 Clear Anodized Aluminum">Type 57 Clear Anodized Aluminum</SelectItem>
                              <SelectItem className="text-left" value="Type 11L Powder Coated Off-White Steel">Type 11L Powder Coated Off-White Steel</SelectItem>
                              <SelectItem className="text-left" value="Type 11 Powder Coated Off-White Steel">Type 11 Powder Coated Off-White Steel</SelectItem>
                            </>
                          )}
                          {(wall.trackType === "Multi-Directional Track" || wall.trackType === "Hinged-Pair (Straight Line) Track") && (
                            <>
                              <SelectItem className="text-left" value="Type 425 Clear Satin-Anodized Aluminum">Type 425 Clear Satin-Anodized Aluminum</SelectItem>
                              <SelectItem className="text-left" value="Type 850 Clear Satin-Anodized Aluminum">Type 850 Clear Satin-Anodized Aluminum</SelectItem>
                            </>
                          )}
                          {wall.trackType === "Curve & Diverter (Individual) Track" && (
                            <SelectItem className="text-left" value="Type 850 Powder Coated Off-White Steel">Type 850 Powder Coated Off-White Steel</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {/* Additional fields for Glass Wall */}
                {wall.wallSystemType === "Glass Wall" && (
                  <>
                    <div className="space-y-2">
                      <Label>Glass Wall Model</Label>
                      <div className="text-xs text-gray-500 mb-1">
                        Current value: "{wall.glasswallModel || 'empty'}"
                      </div>
                      <Select
                        key={`${wallName}-glasswallModel-${wall.glasswallModel}`}
                        value={wall.glasswallModel || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'glasswallModel', value);
                          // Reset dependent fields
                          handleWallFieldChange(wallName, 'glasswallPanelConfiguration', '');
                          handleWallFieldChange(wallName, 'glasswallOperation', '');
                        }}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Stella">Stella</SelectItem>
                          <SelectItem className="text-left" value="Luna">Luna</SelectItem>
                          <SelectItem className="text-left" value="Illona">Illona</SelectItem>
                          <SelectItem className="text-left" value="Ava">Ava</SelectItem>
                          <SelectItem className="text-left" value="Mata">Mata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Glass Wall Panel Configuration</Label>
                      <Select
                        value={wall.glasswallPanelConfiguration || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPanelConfiguration', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select config" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Illona" && (
                            <>
                              <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                              <SelectItem className="text-left" value="Pivoting Individual Panels">Pivoting Individual Panels</SelectItem>
                              <SelectItem className="text-left" value="Single & Telescoping Slider Panels">Single & Telescoping Slider Panels</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Ava" && (
                            <>
                              <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem className="text-left" value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <>
                              <SelectItem className="text-left" value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem className="text-left" value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                              <SelectItem className="text-left" value="Single & Telescoping Slider Panels">Single & Telescoping Slider Panels</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Glass Wall Operation</Label>
                      <Select
                        value={wall.glasswallOperation || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallOperation', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                              <SelectItem className="text-left" value="Automated">Automated</SelectItem>
                              <SelectItem className="text-left" value="Programmable Self-Driving">Programmable Self-Driving</SelectItem>
                              <SelectItem className="text-left" value="Semi-Automated Seals">Semi-Automated Seals</SelectItem>
                            </>
                          )}
                          {["Luna", "Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Glass Wall Panel Face</Label>
                      <Select
                        value={wall.glasswallPanelFace || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPanelFace', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select face" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Clear Glass">Clear Glass</SelectItem>
                          <SelectItem className="text-left" value="Frosted Glass">Frosted Glass</SelectItem>
                          <SelectItem className="text-left" value="Tinted Glass">Tinted Glass</SelectItem>
                          <SelectItem className="text-left" value="Low-E Glass">Low-E Glass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Glass Wall Frame Finish</Label>
                      <Select
                        value={wall.glasswallFrameFinish || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallFrameFinish', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select finish" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="Anodized Aluminum">Anodized Aluminum</SelectItem>
                          <SelectItem className="text-left" value="Powder Coated">Powder Coated</SelectItem>
                          <SelectItem className="text-left" value="Stainless Steel">Stainless Steel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Glass Wall STC Rating</Label>
                      <Select
                        value={wall.glasswallSTCRating || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallSTCRating', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select STC" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          <SelectItem className="text-left" value="35">35</SelectItem>
                          <SelectItem className="text-left" value="40">40</SelectItem>
                          <SelectItem className="text-left" value="45">45</SelectItem>
                          <SelectItem className="text-left" value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Partition Support</Label>
                      <Select
                        value={wall.glasswallPartitionSupport || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPartitionSupport', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select support" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <SelectItem className="text-left" value="Top-Supported">Top-Supported</SelectItem>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Top-Supported">Top-Supported</SelectItem>
                              <SelectItem className="text-left" value="Floor-Supported">Floor-Supported</SelectItem>
                            </>
                          )}
                          {["Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Top-Supported">Top-Supported</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Frame Thickness (Auto-calculated)</Label>
                      <Input
                        value={(() => {
                          const model = wall.glasswallModel;
                          const stc = wall.glasswallSTCRating;
                          if (model === 'Stella') return stc === '44' ? '4-1/2"' : '4-11/16"';
                          if (model === 'Luna') return '2-3/4"';
                          if (model === 'Illona') return '1-3/8"';
                          if (model === 'Ava') return '1-7/16"';
                          if (model === 'Mata') return '1-3/4"';
                          return 'N/A';
                        })()}
                        readOnly
                        className="text-xs h-8 bg-muted text-muted-foreground"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Panel Width (Auto-calculated)</Label>
                      <Input
                        value={(() => {
                          const model = wall.glasswallModel;
                          if (model === 'Stella') return '51"';
                          if (model === 'Luna') return '41-3/8"';
                          if (model === 'Illona') return '39-3/8"';
                          if (model === 'Ava') return '48"';
                          if (model === 'Mata') return '48"';
                          return 'N/A';
                        })()}
                        readOnly
                        className="text-xs h-8 bg-muted text-muted-foreground"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Panel Face Options</Label>
                      <Select
                        value={wall.glasswallPanelFace || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPanelFace', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select panel face" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Solid Face">Solid Face</SelectItem>
                              <SelectItem className="text-left" value="MDF-Backed Melamine">MDF-Backed Melamine</SelectItem>
                              <SelectItem className="text-left" value="High Pressure Laminate">High Pressure Laminate</SelectItem>
                              <SelectItem className="text-left" value="Electrical Internal Mini-Blinds">Electrical Internal Mini-Blinds</SelectItem>
                              <SelectItem className="text-left" value="Internal Mullions & Muntins">Internal Mullions & Muntins</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Solid Face">Solid Face</SelectItem>
                              <SelectItem className="text-left" value="MDF-Backed Melamine">MDF-Backed Melamine</SelectItem>
                              <SelectItem className="text-left" value="High Pressure Laminate">High Pressure Laminate</SelectItem>
                              <SelectItem className="text-left" value="Electrical Internal Mini-Blinds">Electrical Internal Mini-Blinds</SelectItem>
                              <SelectItem className="text-left" value="Internal Muntins">Internal Muntins</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Illona" && (
                            <SelectItem className="text-left" value="Surface-Mounted Muntins">Surface-Mounted Muntins</SelectItem>
                          )}
                          {wall.glasswallModel === "Ava" && (
                            <SelectItem className="text-left" value="None">None</SelectItem>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <>
                              <SelectItem className="text-left" value="Wood Insert">Wood Insert</SelectItem>
                              <SelectItem className="text-left" value="Mullions & Surface-Mounted Muntins">Mullions & Surface-Mounted Muntins</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Frame Finish</Label>
                      <Select
                        value={wall.glasswallFrameFinish || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallFrameFinish', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select frame finish" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                              <SelectItem className="text-left" value="Black">Black</SelectItem>
                              <SelectItem className="text-left" value="White">White</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Powder Coat">Custom RAL Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Sublimation Wood Look">Sublimation Wood Look</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Powder Coat">Custom RAL Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Sublimation Wood Look">Sublimation Wood Look</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Illona" && (
                            <>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="White Powder Coat">White Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Powder Coat">Custom RAL Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Sublimation Wood Look">Sublimation Wood Look</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Ava" && (
                            <>
                              <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Color Options">Custom RAL Color Options</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <>
                              <SelectItem className="text-left" value="Stained Fruitwood Dark Oak">Stained Fruitwood Dark Oak</SelectItem>
                              <SelectItem className="text-left" value="Stained Wheat">Stained Wheat</SelectItem>
                              <SelectItem className="text-left" value="Stained Cordovan">Stained Cordovan</SelectItem>
                              <SelectItem className="text-left" value="Painted Black">Painted Black</SelectItem>
                              <SelectItem className="text-left" value="Painted White">Painted White</SelectItem>
                              <SelectItem className="text-left" value="Unfinished">Unfinished</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Hinge Type</Label>
                      <Select
                        value={wall.glasswallHingeType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallHingeType', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select hinge type" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {["Stella", "Luna", "Illona"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Invisible Hinges">Invisible Hinges</SelectItem>
                          )}
                          {["Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Full-Leaf Butt Hinges">Full-Leaf Butt Hinges</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Glass Wall Track Type</Label>
                      <Select
                        value={wall.glasswallTrackType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallTrackType', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select track type" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <SelectItem className="text-left" value="Top-Supported Multi-directional & Single-Point">Top-Supported Multi-directional & Single-Point</SelectItem>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Top-Supported Multi-directional & Single-Point">Top-Supported Multi-directional & Single-Point</SelectItem>
                              <SelectItem className="text-left" value="Floor-Supported Top Guide">Floor-Supported Top Guide</SelectItem>
                            </>
                          )}
                          {["Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Top-Supported Multi-directional & Single-Point">Top-Supported Multi-directional & Single-Point</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Track Finish</Label>
                      <Select
                        value={wall.glasswallTrackFinish || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallTrackFinish', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select track finish" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="White Powder Coat">White Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Option">Custom RAL Option</SelectItem>
                            </>
                          )}
                          {["Luna", "Illona"].includes(wall.glasswallModel || '') && (
                            <>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                              <SelectItem className="text-left" value="White Powder Coat">White Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Option">Custom RAL Option</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Ava" && (
                            <>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Color Option">Custom RAL Color Option</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <>
                              <SelectItem className="text-left" value="Black Powder Coat">Black Powder Coat</SelectItem>
                              <SelectItem className="text-left" value="Clear Anodized">Clear Anodized</SelectItem>
                              <SelectItem className="text-left" value="Custom RAL Option">Custom RAL Option</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Floor Guide</Label>
                      <Select
                        value={wall.glasswallFloorGuide || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallFloorGuide', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select floor guide" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {["Luna", "Illona"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Optional">Optional</SelectItem>
                          )}
                          {["Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="None">None</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Pass Door Type</Label>
                      <Select
                        value={wall.glasswallPassDoorType || ''}
                        onValueChange={(value) => {
                          handleWallFieldChange(wallName, 'glasswallPassDoorType', value);
                          // Reset dependent field
                          handleWallFieldChange(wallName, 'glasswallPassDoorOption', '');
                        }}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select door type" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Full-Height">Full-Height</SelectItem>
                              <SelectItem className="text-left" value="Inset">Inset</SelectItem>
                            </>
                          )}
                          {["Luna", "Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Full-Height">Full-Height</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Pass Door Option</Label>
                      <Select
                        value={wall.glasswallPassDoorOption || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPassDoorOption', value)}
                        disabled={!wall.glasswallModel || !wall.glasswallPassDoorType}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select door option" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallPassDoorType && (
                            <>
                              <SelectItem className="text-left" value="Single">Single</SelectItem>
                              <SelectItem className="text-left" value="Double">Double</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Final Closure</Label>
                      <Select
                        value={wall.glasswallFinalClosure || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallFinalClosure', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select closure" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Panel-Mounted Telescoping Jamb">Panel-Mounted Telescoping Jamb</SelectItem>
                              <SelectItem className="text-left" value="Wall-Mounted Telescoping Jamb">Wall-Mounted Telescoping Jamb</SelectItem>
                              <SelectItem className="text-left" value="Full-Height Door">Full-Height Door</SelectItem>
                            </>
                          )}
                          {["Luna", "Illona"].includes(wall.glasswallModel || '') && (
                            <>
                              <SelectItem className="text-left" value="Hinged Closure Panel">Hinged Closure Panel</SelectItem>
                              <SelectItem className="text-left" value="Full-Height Door">Full-Height Door</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Ava" && (
                            <>
                              <SelectItem className="text-left" value="Fixed Pivot Panel">Fixed Pivot Panel</SelectItem>
                              <SelectItem className="text-left" value="Fixed Swing Panel">Fixed Swing Panel</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <>
                              <SelectItem className="text-left" value="Hinged Closure Panel">Hinged Closure Panel</SelectItem>
                              <SelectItem className="text-left" value="None Required">None Required</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Bottom Seals</Label>
                      <Select
                        value={wall.glasswallBottomSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallBottomSeals', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select bottom seals" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Electric">Electric</SelectItem>
                              <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
                              <SelectItem className="text-left" value="Semi-Automatic">Semi-Automatic</SelectItem>
                              <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                              <SelectItem className="text-left" value="Operable">Operable</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Floor Supported Fixed Bulb">Floor Supported Fixed Bulb</SelectItem>
                              <SelectItem className="text-left" value="Top Supported Fixed Brush">Top Supported Fixed Brush</SelectItem>
                            </>
                          )}
                          {["Illona", "Ava"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Fixed Brush">Fixed Brush</SelectItem>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <SelectItem className="text-left" value="Fixed Flexible Vinyl">Fixed Flexible Vinyl</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Top Seals</Label>
                      <Select
                        value={wall.glasswallTopSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallTopSeals', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select top seals" />
                        </SelectTrigger>
                        <SelectContent className="text-left">
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem className="text-left" value="Electric">Electric</SelectItem>
                              <SelectItem className="text-left" value="Automatic">Automatic</SelectItem>
                              <SelectItem className="text-left" value="Semi-Automatic">Semi-Automatic</SelectItem>
                              <SelectItem className="text-left" value="Manual">Manual</SelectItem>
                              <SelectItem className="text-left" value="Operable">Operable</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem className="text-left" value="Floor Supported Fixed Bulb">Floor Supported Fixed Bulb</SelectItem>
                              <SelectItem className="text-left" value="Top Supported Fixed Brush">Top Supported Fixed Brush</SelectItem>
                            </>
                          )}
                          {["Illona", "Ava"].includes(wall.glasswallModel || '') && (
                            <SelectItem className="text-left" value="Fixed Brush">Fixed Brush</SelectItem>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <SelectItem className="text-left" value="Fixed Flexible Vinyl">Fixed Flexible Vinyl</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={addWall}
            className="w-full"
          >
            + Add Wall
          </Button>
        </div>
      </CollapsibleSection>

      {/* Pocket Doors */}
      <CollapsibleSection
        title="Pocket Doors"
        icon={<DoorOpen className="w-4 h-4 text-yellow-500" />}
        isOpen={openSections.pockets}
        onToggle={() => toggleSection('pockets')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="foldType" className="text-xs font-medium text-gray-600">
              Fold Type
            </Label>
            <Select
              value={data.pocket_doors?.foldType || ''}
              onValueChange={handleFoldTypeChange}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select fold type" />
              </SelectTrigger>
              <SelectContent className="text-left">
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Bi-Fold">Bi-Fold</SelectItem>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Double">Double</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {data.pocket_doors?.foldType && data.pocket_doors.foldType !== 'None' && (
            <div>
              <Label htmlFor="foldStyle" className="text-xs font-medium text-gray-600">
                Fold Style
              </Label>
              <Select
                value={data.pocket_doors?.foldStyle || ''}
                onValueChange={(value) => handleFieldChange('pocket_doors', 'foldStyle', value)}
                disabled={!getAvailableFoldStyles(data.pocket_doors?.foldType || '').length}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select fold style" />
                </SelectTrigger>
                <SelectContent className="text-left">
                  <SelectItem value="None">None</SelectItem>
                  {getAvailableFoldStyles(data.pocket_doors?.foldType || '').map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Mounting Track */}
      <CollapsibleSection
        title="Mounting Track"
        icon={<Building className="w-4 h-4 text-indigo-500" />}
        isOpen={openSections.mounting}
        onToggle={() => toggleSection('mounting')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="mountingTrack" className="text-xs font-medium text-gray-600">
              Mounting Track Type
            </Label>
            <Select
              value={data.support_structure?.mountingTrack || ''}
              onValueChange={(value) => handleFieldChange('support_structure', 'mountingTrack', value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select mounting track type" />
              </SelectTrigger>
              <SelectContent className="text-left">
                <SelectItem value="Pre-Drilled Steel Beam">Pre-Drilled Steel Beam</SelectItem>
                <SelectItem value="Existing Steel Beam">Existing Steel Beam</SelectItem>
                <SelectItem value="Secured to Concrete">Secured to Concrete</SelectItem>
                <SelectItem value="Secured to Wood Header">Secured to Wood Header</SelectItem>
                <SelectItem value="Unispan Truss System">Unispan Truss System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      {/* Labor & Delivery */}
      <CollapsibleSection
        title="Labor & Delivery"
        icon={<Truck className="w-4 h-4 text-orange-500" />}
        isOpen={openSections.delivery}
        onToggle={() => toggleSection('delivery')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="laborType" className="text-xs font-medium text-gray-600">
              Labor Type
            </Label>
            <Select
              value={data.labor_details?.laborType || ''}
              onValueChange={(value) => handleFieldChange('labor_details', 'laborType', value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select labor type" />
              </SelectTrigger>
              <SelectContent className="text-left">
                <SelectItem value="Union">Union</SelectItem>
                <SelectItem value="Non-Union">Non-Union</SelectItem>
                {/* <SelectItem value="Mixed">Mixed</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="wageRate" className="text-xs font-medium text-gray-600">
              Wage Rate
            </Label>
            <Select
              value={data.labor_details?.wageRate || ''}
              onValueChange={(value) => handleFieldChange('labor_details', 'wageRate', value)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select wage rate" />
              </SelectTrigger>
              <SelectContent className="text-left">
                <SelectItem value="Prevailing">Prevailing</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                {/* <SelectItem value="Fixed">Fixed</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="trackDelivery" className="text-xs font-medium text-gray-600">
                Track Delivery (weeks)
              </Label>
              <Input
                id="trackDelivery"
                value={data.delivery_details?.trackDeliveryWeeks || ''}
                onChange={(e) => handleFieldChange('delivery_details', 'trackDeliveryWeeks', e.target.value)}
                placeholder="4"
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="panelDelivery" className="text-xs font-medium text-gray-600">
                Panel Delivery (weeks)
              </Label>
              <Input
                id="panelDelivery"
                value={data.delivery_details?.panelDeliveryWeeks || ''}
                onChange={(e) => handleFieldChange('delivery_details', 'panelDeliveryWeeks', e.target.value)}
                placeholder="8"
                className="text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="trackInstall" className="text-xs font-medium text-gray-600">
                Track Install (days)
              </Label>
              <Input
                id="trackInstall"
                value={data.delivery_details?.trackInstallationDays || ''}
                onChange={(e) => handleFieldChange('delivery_details', 'trackInstallationDays', e.target.value)}
                placeholder="2"
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="panelInstall" className="text-xs font-medium text-gray-600">
                Panel Install (days)
              </Label>
              <Input
                id="panelInstall"
                value={data.delivery_details?.panelInstallationDays || ''}
                onChange={(e) => handleFieldChange('delivery_details', 'panelInstallationDays', e.target.value)}
                placeholder="3"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Pricing Section */}
      <CollapsibleSection
        title="Pricing"
        icon={<DollarSign className="w-4 h-4 text-green-500" />}
        isOpen={openSections.pricing}
        onToggle={() => toggleSection('pricing')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="basePrice" className="text-xs font-medium text-gray-600">
              Base Price
            </Label>
            <Input
              id="basePrice"
              type="number"
              value={data.price_details?.basePrice || data.price_details?.base_price || ''}
              onChange={(e) => handleFieldChange('price_details', 'basePrice', e.target.value)}
              placeholder="0.00"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="freight" className="text-xs font-medium text-gray-600">
              Freight Cost
            </Label>
            <Input
              id="freight"
              type="number"
              value={data.price_details?.freight || ''}
              onChange={(e) => handleFieldChange('price_details', 'freight', e.target.value)}
              placeholder="0.00"
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="total" className="text-xs font-medium text-gray-600">
              Total (Auto-calculated)
            </Label>
            <Input
              id="total"
              type="number"
              value={data.price_details?.total || ''}
              readOnly
              placeholder="0.00"
              className="text-sm bg-gray-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="paymentDrawings" className="text-xs font-medium text-gray-600">
                Payment on Drawings (%)
              </Label>
              <Input
                id="paymentDrawings"
                type="number"
                value={data.price_details?.payment_upon_drawings || ''}
                onChange={(e) => handleFieldChange('price_details', 'payment_upon_drawings', e.target.value)}
                placeholder="33"
                className="text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="paymentTrack" className="text-xs font-medium text-gray-600">
                Payment on Track (%)
              </Label>
              <Input
                id="paymentTrack"
                type="number"
                value={data.price_details?.payment_upon_track_installation || ''}
                onChange={(e) => handleFieldChange('price_details', 'payment_upon_track_installation', e.target.value)}
                placeholder="33"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* General Notes and Terms */}
      <CollapsibleSection
        title="General Notes and Terms"
        icon={<FileText className="w-4 h-4 text-gray-500" />}
        isOpen={openSections.notes}
        onToggle={() => toggleSection('notes')}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="generalNotes" className="text-xs font-medium text-gray-600">
              General Notes
            </Label>
            <Textarea
              id="generalNotes"
              value={data.quote_details?.generalNotes || ''}
              onChange={(e) => handleFieldChange('quote_details', 'generalNotes', e.target.value)}
              placeholder="Add any general notes or special instructions..."
              className="text-sm resize-none"
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="terms" className="text-xs font-medium text-gray-600">
              Terms and Conditions
            </Label>
            <Textarea
              id="terms"
              value={data.quote_details?.terms || ''}
              onChange={(e) => handleFieldChange('quote_details', 'terms', e.target.value)}
              placeholder="Add specific terms and conditions for this quote..."
              className="text-sm resize-none"
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="warranty" className="text-xs font-medium text-gray-600">
              Warranty Information
            </Label>
            <Textarea
              id="warranty"
              value={data.quote_details?.warranty || ''}
              onChange={(e) => handleFieldChange('quote_details', 'warranty', e.target.value)}
              placeholder="Add warranty terms and coverage details..."
              className="text-sm resize-none"
              rows={3}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default QuoteDataPanel;