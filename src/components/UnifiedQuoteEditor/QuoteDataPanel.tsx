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
    contact: true,
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
          panelFinishSpecificItem: ''
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
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: {
          ...(data.wall_details?.walls?.[wallName] || {}),
          [field]: value
        }
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
            <Card key={wallName} className="p-3 bg-gray-50">
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
                <div>
                  <Label htmlFor={`${wallName}-wallSystemType`}>System Type</Label>
                  <Select
                    value={wall.wallSystemType || ''}
                    onValueChange={(value) => handleWallFieldChange(wallName, 'wallSystemType', value)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operable Wall">Operable Wall</SelectItem>
                      <SelectItem value="Glass Wall">Glass Wall</SelectItem>
                      <SelectItem value="Accordion Partitions">Accordion Partitions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Additional fields for Operable Wall */}
                {wall.wallSystemType === "Operable Wall" && (
                  <>
                    <div>
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
                        <SelectContent>
                          <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                          <SelectItem value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
                          <SelectItem value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
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
                        <SelectContent>
                          {wall.panelConfiguration === "Individual Panels" && (
                            <>
                              <SelectItem value="2000">2000</SelectItem>
                              <SelectItem value="3000">3000</SelectItem>
                              <SelectItem value="Hufcor: 600">Hufcor: 600</SelectItem>
                            </>
                          )}
                          {(wall.panelConfiguration === "Hinged-Paired Panels" || wall.panelConfiguration === "Continuously-Hinged Panels") && (
                            <>
                              <SelectItem value="2000">2000</SelectItem>
                              <SelectItem value="3000">3000</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
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
                        <SelectContent>
                          {wall.panelConfiguration === "Individual Panels" && wall.series === "2000" && (
                            <>
                              <SelectItem value="2010">2010</SelectItem>
                              <SelectItem value="2020">2020</SelectItem>
                              <SelectItem value="2010GL">2010GL</SelectItem>
                              <SelectItem value="2020GL">2020GL</SelectItem>
                            </>
                          )}
                          {wall.panelConfiguration === "Individual Panels" && wall.series === "3000" && (
                            <>
                              <SelectItem value="3010">3010</SelectItem>
                              <SelectItem value="3020">3020</SelectItem>
                              <SelectItem value="3010GL">3010GL</SelectItem>
                              <SelectItem value="3020GL">3020GL</SelectItem>
                            </>
                          )}
                          {wall.panelConfiguration === "Individual Panels" && wall.series === "Hufcor: 600" && (
                            <SelectItem value="Hufcor 641">Hufcor 641</SelectItem>
                          )}
                          {wall.panelConfiguration === "Continuously-Hinged Panels" && wall.series === "2000" && (
                            <SelectItem value="2050e">2050e</SelectItem>
                          )}
                          {wall.panelConfiguration === "Continuously-Hinged Panels" && wall.series === "3000" && (
                            <SelectItem value="3050e">3050e</SelectItem>
                          )}
                          {wall.panelConfiguration === "Hinged-Paired Panels" && wall.series === "2000" && (
                            <>
                              <SelectItem value="2030">2030</SelectItem>
                              <SelectItem value="2030GL">2030GL</SelectItem>
                            </>
                          )}
                          {wall.panelConfiguration === "Hinged-Paired Panels" && wall.series === "3000" && (
                            <>
                              <SelectItem value="3030">3030</SelectItem>
                              <SelectItem value="3030GL">3030GL</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Panel Thickness</Label>
                      <Select
                        value={wall.panelThickness || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'panelThickness', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select thickness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2"</SelectItem>
                          <SelectItem value="3">3"</SelectItem>
                          <SelectItem value="4">4"</SelectItem>
                          <SelectItem value="6">6"</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Panel Design</Label>
                      <Select
                        value={wall.panelDesign || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'panelDesign', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select design" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Flush">Flush</SelectItem>
                          <SelectItem value="Raised Panel">Raised Panel</SelectItem>
                          <SelectItem value="Contemporary">Contemporary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
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
                        <SelectContent>
                          {wall.model === "Hufcor 641" && (
                            <SelectItem value="Steel">Steel</SelectItem>
                          )}
                          {["3010", "3020", "3030"].includes(wall.model || '') && (
                            <>
                              <SelectItem value="Standard Steel Skin">Standard Steel Skin</SelectItem>
                              <SelectItem value="Optional Acoustical Substrate">Optional Acoustical Substrate</SelectItem>
                              <SelectItem value="Optional Wood Veneer">Optional Wood Veneer</SelectItem>
                              <SelectItem value="Optional High-Pressure Laminate">Optional High-Pressure Laminate</SelectItem>
                            </>
                          )}
                          {["3050e", "3010GL", "3020GL", "3030GL"].includes(wall.model || '') && (
                            <>
                              <SelectItem value="Standard Steel Skin">Standard Steel Skin</SelectItem>
                              <SelectItem value="Optional Acoustical Substrate">Optional Acoustical Substrate</SelectItem>
                            </>
                          )}
                          {["2010", "2020", "2030"].includes(wall.model || '') && (
                            <>
                              <SelectItem value="Standard Acoustical Substrate">Standard Acoustical Substrate</SelectItem>
                              <SelectItem value="Optional Steel Skin">Optional Steel Skin</SelectItem>
                              <SelectItem value="Optional Wood Veneer">Optional Wood Veneer</SelectItem>
                              <SelectItem value="Optional High-Pressure Laminate">Optional High-Pressure Laminate</SelectItem>
                            </>
                          )}
                          {["2050e", "2010GL", "2020GL", "2030GL"].includes(wall.model || '') && (
                            <>
                              <SelectItem value="Standard Acoustical Substrate">Standard Acoustical Substrate</SelectItem>
                              <SelectItem value="Optional Steel Skin">Optional Steel Skin</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>STC Rating</Label>
                      <Select
                        value={wall.stcRating || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'stcRating', value)}
                        disabled={!wall.model || !wall.panelSkin}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select STC" />
                        </SelectTrigger>
                        <SelectContent>
                          {wall.model === "Hufcor 641" && (
                            <>
                              <SelectItem value="43">43</SelectItem>
                              <SelectItem value="47">47</SelectItem>
                              <SelectItem value="49">49</SelectItem>
                              <SelectItem value="52">52</SelectItem>
                              <SelectItem value="54">54</SelectItem>
                              <SelectItem value="56">56</SelectItem>
                            </>
                          )}
                          {["2010GL", "2020GL", "2030GL"].includes(wall.model || '') && (
                            <SelectItem value="38">38</SelectItem>
                          )}
                          {["3010GL", "3020GL", "3030GL"].includes(wall.model || '') && (
                            <>
                              <SelectItem value="43">43</SelectItem>
                              <SelectItem value="48">48</SelectItem>
                            </>
                          )}
                          {["2010", "2020", "2030", "2050e"].includes(wall.model || '') && wall.panelSkin?.includes("Acoustical Substrate") && (
                            <>
                              <SelectItem value="42">42</SelectItem>
                              <SelectItem value="45">45</SelectItem>
                              <SelectItem value="49">49</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </>
                          )}
                          {["2010", "2020", "2030", "2050e"].includes(wall.model || '') && wall.panelSkin?.includes("Steel") && (
                            <>
                              <SelectItem value="49">49</SelectItem>
                              <SelectItem value="51">51</SelectItem>
                            </>
                          )}
                          {["3010", "3020", "3030", "3050e"].includes(wall.model || '') && wall.panelSkin?.includes("Steel") && (
                            <>
                              <SelectItem value="46">46</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="52">52</SelectItem>
                              <SelectItem value="56">56</SelectItem>
                            </>
                          )}
                          {["3010", "3020", "3030", "3050e"].includes(wall.model || '') && wall.panelSkin?.includes("Acoustical Substrate") && (
                            <>
                              <SelectItem value="43">43</SelectItem>
                              <SelectItem value="46">46</SelectItem>
                              <SelectItem value="48">48</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Panel Design</Label>
                      <Select
                        value={wall.panelDesign || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'panelDesign', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select design" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trimless U Capped">Trimless U Capped</SelectItem>
                          <SelectItem value="U-Capped Trim">U-Capped Trim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
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
                        <SelectContent>
                          <SelectItem value="Koroseal Standard Vinyl">Koroseal Standard Vinyl</SelectItem>
                          <SelectItem value="Koroseal Upgrade Vinyl">Koroseal Upgrade Vinyl</SelectItem>
                          <SelectItem value="Shaw Standard Carpet">Shaw Standard Carpet</SelectItem>
                          <SelectItem value="HyTex Upgrade Carpet">HyTex Upgrade Carpet</SelectItem>
                          <SelectItem value="HyTex Standard Fabric">HyTex Standard Fabric</SelectItem>
                          <SelectItem value="HyTex Upgrade Fabric">HyTex Upgrade Fabric</SelectItem>
                          <SelectItem value="Standard Wood Veneer">Standard Wood Veneer</SelectItem>
                          <SelectItem value="Wilsonart High Pressure Laminate (HPL)">Wilsonart High Pressure Laminate (HPL)</SelectItem>
                          <SelectItem value="Full Height Marker (Tack) Board">Full Height Marker (Tack) Board</SelectItem>
                          <SelectItem value="Uncovered">Uncovered</SelectItem>
                          <SelectItem value="C.O.M. Material">C.O.M. Material</SelectItem>
                          <SelectItem value="Field Painting by Others">Field Painting by Others</SelectItem>
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
                          <SelectContent>
                            {wall.panelFinishCategory === "Standard Wood Veneer" && (
                              <>
                                <SelectItem value="Unfinished Flat Cut White Maple">Unfinished Flat Cut White Maple</SelectItem>
                                <SelectItem value="Unfinished Flat Cut White Oak">Unfinished Flat Cut White Oak</SelectItem>
                                <SelectItem value="Unfinished Flat Cut Walnut">Unfinished Flat Cut Walnut</SelectItem>
                                <SelectItem value="Unfinished Flat Cut Cherry">Unfinished Flat Cut Cherry</SelectItem>
                                <SelectItem value="Unfinished Flat Cut Red Oak">Unfinished Flat Cut Red Oak</SelectItem>
                              </>
                            )}
                            {/* Add more specific items as needed - truncated for brevity */}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Vertical Seals</Label>
                      <Select
                        value={wall.verticalSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'verticalSeals', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select seals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Tongue-and-Groove">Tongue-and-Groove</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bottom Seals</Label>
                      <Select
                        value={wall.bottomSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'bottomSeals', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select seals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Retractable">Retractable</SelectItem>
                          <SelectItem value="Automatic">Automatic</SelectItem>
                          <SelectItem value="Adjustable">Adjustable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Top Seals</Label>
                      <Select
                        value={wall.topSeals || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'topSeals', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select seals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Fixed">Fixed</SelectItem>
                          <SelectItem value="Adjustable">Adjustable</SelectItem>
                          <SelectItem value="Operable">Operable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Track Type</Label>
                      <Select
                        value={wall.trackType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'trackType', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Straight">Straight</SelectItem>
                          <SelectItem value="Curved">Curved</SelectItem>
                          <SelectItem value="T-Layout">T-Layout</SelectItem>
                          <SelectItem value="L-Layout">L-Layout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Track System</Label>
                      <Select
                        value={wall.trackSystem || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'trackSystem', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Heavy-Duty">Heavy-Duty</SelectItem>
                          <SelectItem value="Standard">Standard</SelectItem>
                          <SelectItem value="Light-Duty">Light-Duty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Initial Closure System</Label>
                      <Select
                        value={wall.initialClosureSystem || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'initialClosureSystem', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select closure" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Standard Bulb">Standard Bulb</SelectItem>
                          <SelectItem value="Optional Fixed Starter Jamb">Optional Fixed Starter Jamb</SelectItem>
                          <SelectItem value="Optional Adjustable Starter Jamb">Optional Adjustable Starter Jamb</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>End Panel Type</Label>
                      <Select
                        value={wall.endPanelType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'endPanelType', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select end panel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Standard Expander Panel Closure">Standard Expander Panel Closure</SelectItem>
                          <SelectItem value="Optional Hinged Panel(s) Closure">Optional Hinged Panel(s) Closure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pass Door Panels</Label>
                      <Select
                        value={wall.passDoorPanels || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'passDoorPanels', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select pass door" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Double">Double</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Track System</Label>
                      <Select
                        value={wall.trackSystem || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'trackSystem', value)}
                        disabled={!wall.trackType && !wall.model}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select system" />
                        </SelectTrigger>
                        <SelectContent>
                          {wall.model === "Hufcor 641" && (
                            <>
                              <SelectItem value="Type 26 Clear Satin-Anodized Aluminum">Type 26 Clear Satin-Anodized Aluminum</SelectItem>
                              <SelectItem value="Type 36 Clear Satin-Anodized Aluminum">Type 36 Clear Satin-Anodized Aluminum</SelectItem>
                              <SelectItem value="Type 57 Clear Anodized Aluminum">Type 57 Clear Anodized Aluminum</SelectItem>
                              <SelectItem value="Type 11L Powder Coated Off-White Steel">Type 11L Powder Coated Off-White Steel</SelectItem>
                              <SelectItem value="Type 11 Powder Coated Off-White Steel">Type 11 Powder Coated Off-White Steel</SelectItem>
                            </>
                          )}
                          {(wall.trackType === "Multi-Directional Track" || wall.trackType === "Hinged-Pair (Straight Line) Track") && (
                            <>
                              <SelectItem value="Type 425 Clear Satin-Anodized Aluminum">Type 425 Clear Satin-Anodized Aluminum</SelectItem>
                              <SelectItem value="Type 850 Clear Satin-Anodized Aluminum">Type 850 Clear Satin-Anodized Aluminum</SelectItem>
                            </>
                          )}
                          {wall.trackType === "Curve & Diverter (Individual) Track" && (
                            <SelectItem value="Type 850 Powder Coated Off-White Steel">Type 850 Powder Coated Off-White Steel</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {/* Additional fields for Glass Wall */}
                {wall.wallSystemType === "Glass Wall" && (
                  <>
                    <div>
                      <Label>Glass Wall Model</Label>
                      <Select
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
                        <SelectContent>
                          <SelectItem value="Stella">Stella</SelectItem>
                          <SelectItem value="Luna">Luna</SelectItem>
                          <SelectItem value="Illona">Illona</SelectItem>
                          <SelectItem value="Ava">Ava</SelectItem>
                          <SelectItem value="Mata">Mata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass Wall Panel Configuration</Label>
                      <Select
                        value={wall.glasswallPanelConfiguration || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPanelConfiguration', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select config" />
                        </SelectTrigger>
                        <SelectContent>
                          {wall.glasswallModel === "Stella" && (
                            <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                          )}
                          {wall.glasswallModel === "Luna" && (
                            <>
                              <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Illona" && (
                            <>
                              <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                              <SelectItem value="Pivoting Individual Panels">Pivoting Individual Panels</SelectItem>
                              <SelectItem value="Single & Telescoping Slider Panels">Single & Telescoping Slider Panels</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Ava" && (
                            <>
                              <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
                            </>
                          )}
                          {wall.glasswallModel === "Mata" && (
                            <>
                              <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                              <SelectItem value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                              <SelectItem value="Single & Telescoping Slider Panels">Single & Telescoping Slider Panels</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass Wall Operation</Label>
                      <Select
                        value={wall.glasswallOperation || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallOperation', value)}
                        disabled={!wall.glasswallModel}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select operation" />
                        </SelectTrigger>
                        <SelectContent>
                          {wall.glasswallModel === "Stella" && (
                            <>
                              <SelectItem value="Manual">Manual</SelectItem>
                              <SelectItem value="Automated">Automated</SelectItem>
                              <SelectItem value="Programmable Self-Driving">Programmable Self-Driving</SelectItem>
                              <SelectItem value="Semi-Automated Seals">Semi-Automated Seals</SelectItem>
                            </>
                          )}
                          {["Luna", "Illona", "Ava", "Mata"].includes(wall.glasswallModel || '') && (
                            <SelectItem value="Manual">Manual</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass Wall Panel Face</Label>
                      <Select
                        value={wall.glasswallPanelFace || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallPanelFace', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select face" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Clear Glass">Clear Glass</SelectItem>
                          <SelectItem value="Frosted Glass">Frosted Glass</SelectItem>
                          <SelectItem value="Tinted Glass">Tinted Glass</SelectItem>
                          <SelectItem value="Low-E Glass">Low-E Glass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass Wall Frame Finish</Label>
                      <Select
                        value={wall.glasswallFrameFinish || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallFrameFinish', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select finish" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Anodized Aluminum">Anodized Aluminum</SelectItem>
                          <SelectItem value="Powder Coated">Powder Coated</SelectItem>
                          <SelectItem value="Stainless Steel">Stainless Steel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass Wall STC Rating</Label>
                      <Select
                        value={wall.glasswallSTCRating || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallSTCRating', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select STC" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="35">35</SelectItem>
                          <SelectItem value="40">40</SelectItem>
                          <SelectItem value="45">45</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Glass Wall Track Type</Label>
                      <Select
                        value={wall.glasswallTrackType || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'glasswallTrackType', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select track" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Heavy-Duty Glass">Heavy-Duty Glass</SelectItem>
                          <SelectItem value="Standard Glass">Standard Glass</SelectItem>
                          <SelectItem value="Premium Glass">Premium Glass</SelectItem>
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
              <SelectContent>
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
                <SelectContent>
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
              <SelectContent>
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
              <SelectContent>
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
              <SelectContent>
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