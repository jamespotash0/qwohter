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
                        onValueChange={(value) => handleWallFieldChange(wallName, 'panelConfiguration', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select config" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single Direction">Single Direction</SelectItem>
                          <SelectItem value="Center Bipart">Center Bipart</SelectItem>
                          <SelectItem value="Multi-Stack">Multi-Stack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Series</Label>
                      <Select
                        value={wall.series || ''}
                        onValueChange={(value) => handleWallFieldChange(wallName, 'series', value)}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select series" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="600">600</SelectItem>
                          <SelectItem value="700">700</SelectItem>
                          <SelectItem value="800">800</SelectItem>
                          <SelectItem value="900">900</SelectItem>
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